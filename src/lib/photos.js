import { db, newId } from '../db/index'
import { supabase, isSupabaseConfigured } from './supabase'

const BUCKET = 'wall-photos'

/** Longest edge, in pixels, that a stored photo is allowed to have. */
export const MAX_EDGE = 2000
const JPEG_QUALITY = 0.85

// ── Capture ─────────────────────────────────────────────────────────────────

/**
 * Shrink a camera photo down to something sensible.
 *
 * A phone photo is 3–12 MB, which is wasted on a canvas a few hundred pixels
 * wide: it slows rendering and eats the storage quota. Resizing to a 2000px
 * longest edge gives roughly 300–600 KB while keeping holds clearly readable.
 *
 * Returns a JPEG Blob. Transparency is not preserved — irrelevant for photos.
 */
export async function resizeToBlob(file, maxEdge = MAX_EDGE, quality = JPEG_QUALITY) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) throw new Error('Could not encode the image.')
    return { blob, width: w, height: h }
  } finally {
    bitmap.close?.()
  }
}

/**
 * Resize a picked file and store it locally. Returns the new photo's id, which
 * is what a wall record holds.
 *
 * Saving locally always comes first: a photo taken in a gym with no signal
 * must not be lost waiting for a network. Upload happens later, via
 * uploadPendingPhotos().
 */
export async function savePhoto(file, gymId) {
  const { blob, width, height } = await resizeToBlob(file)
  const now = new Date().toISOString()
  const photo = {
    id: newId(),
    gymId: gymId ?? null,
    blob,
    width,
    height,
    bytes: blob.size,
    path: null,        // Supabase Storage path, set on upload
    uploaded: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.photos.add(photo)
  return photo.id
}

// ── Reading ─────────────────────────────────────────────────────────────────

/**
 * Resolve a photo id to something an <img> or canvas can use.
 *
 * Prefers the local copy — instant, and works offline. Falls back to a signed
 * URL, which covers photos taken on another device and synced down as a row
 * without bytes.
 *
 * Returns { url, revoke }. Always call revoke() when done: object URLs pin
 * their blob in memory until released.
 */
export async function photoUrl(photoId) {
  if (!photoId) return null

  const photo = await db.photos.get(photoId)

  if (photo?.blob) {
    const url = URL.createObjectURL(photo.blob)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  }

  if (photo?.path && isSupabaseConfigured) {
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.path, 60 * 60)   // an hour is plenty for a session
    if (!error && data?.signedUrl) {
      return { url: data.signedUrl, revoke: () => {} }
    }
  }

  return null
}

// ── Upload ──────────────────────────────────────────────────────────────────

/**
 * Push any locally-held photos up to Supabase Storage.
 *
 * Path layout is `<user_id>/<gym_id>/<photo_id>.jpg` because the storage
 * policy in schema.sql checks that the first path segment is the owner's id.
 *
 * The local blob is deliberately kept after upload — it is the offline copy,
 * and re-downloading it would be pointless. Returns a small summary so the
 * caller can report progress.
 */
export async function uploadPendingPhotos(userId) {
  if (!isSupabaseConfigured || !userId) return { uploaded: 0, failed: 0 }

  const pending = await db.photos.where('uploaded').equals(0).toArray()
  let uploaded = 0
  let failed = 0

  for (const photo of pending) {
    if (!photo.blob) continue
    const path = `${userId}/${photo.gymId ?? 'unfiled'}/${photo.id}.jpg`

    const { error } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, photo.blob, { contentType: 'image/jpeg', upsert: true })

    if (error) {
      failed++
      continue
    }

    await db.photos.update(photo.id, {
      path,
      uploaded: 1,
      updatedAt: new Date().toISOString(),
    })
    uploaded++
  }

  return { uploaded, failed }
}

/** How many photos are still only on this device. */
export async function pendingPhotoCount() {
  return db.photos.where('uploaded').equals(0).count()
}

// ── Deleting ────────────────────────────────────────────────────────────────

/** Remove a photo locally and, if it made it up, from storage too. */
export async function deletePhoto(photoId) {
  if (!photoId) return
  const photo = await db.photos.get(photoId)
  if (photo?.path && isSupabaseConfigured) {
    await supabase.storage.from(BUCKET).remove([photo.path])
  }
  await db.photos.delete(photoId)
}
