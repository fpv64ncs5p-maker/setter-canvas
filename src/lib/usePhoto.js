import { useEffect, useState } from 'react'
import { photoUrl } from './photos'

/**
 * Resolve a photo id to a displayable URL, cleaning up after itself.
 *
 * Object URLs hold their blob in memory until revoked, so a list of wall
 * thumbnails that forgot to revoke would leak a few hundred KB per card. The
 * effect cleanup handles it, including when the id changes mid-flight.
 *
 * Returns null while loading or when there is no photo — callers should show
 * their empty state for both.
 */
export function usePhoto(photoId) {
  // Track which id the URL belongs to, so switching walls can't briefly show
  // the previous wall's photo, and so the "no photo" case needs no state
  // update at all.
  const [resolved, setResolved] = useState({ id: null, url: null })

  useEffect(() => {
    if (!photoId) return

    let active = true
    let revoke = null

    photoUrl(photoId).then(result => {
      if (!active) {
        // Unmounted (or the id changed) while we were resolving — release now,
        // otherwise this blob is pinned with nobody holding a reference.
        result?.revoke()
        return
      }
      revoke = result?.revoke ?? null
      setResolved({ id: photoId, url: result?.url ?? null })
    })

    return () => {
      active = false
      revoke?.()
    }
  }, [photoId])

  return photoId && resolved.id === photoId ? resolved.url : null
}

export default usePhoto
