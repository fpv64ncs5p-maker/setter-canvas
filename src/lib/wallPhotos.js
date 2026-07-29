/**
 * A wall can hold three photos, each answering a different question:
 *
 *   stripped   — the bare wall. This is the planning surface: it's what you
 *                design a route onto, so the canvas prefers it.
 *   withHolds  — the wall as it currently stands. Useful for checking what is
 *                already up there, and for the portfolio thumbnail.
 *   partial    — mid-strip or partly set.
 *
 * `photoId` is the older single-photo field. Nothing writes it any more, but
 * it is still read so a wall photographed before the slots existed keeps
 * showing its picture.
 */

export const PHOTO_SLOTS = [
  { key: 'photoStrippedId',  id: 'stripped',   label: 'Stripped',    hint: 'Bare wall — used for planning' },
  { key: 'photoWithHoldsId', id: 'with-holds', label: 'With holds',  hint: 'Current state of the wall' },
  { key: 'photoPartialId',   id: 'partial',    label: 'Partial',     hint: 'Mid-strip or partly set' },
]

/** Map a mobile-upload photo type to its wall field. */
export function slotKeyFor(typeId) {
  return PHOTO_SLOTS.find(s => s.id === typeId)?.key ?? 'photoPartialId'
}

/**
 * Which photo the Planner canvas should draw.
 * Stripped first — that's the surface you plan on. Falls back to anything
 * available rather than showing an empty canvas.
 */
export function planningPhotoId(wall) {
  return wall?.photoStrippedId
      ?? wall?.photoId
      ?? wall?.photoWithHoldsId
      ?? wall?.photoPartialId
      ?? null
}

/**
 * Which photo represents the wall in lists.
 * "With holds" first here: a thumbnail is asking "what does this wall look
 * like", and the answer is its current state, not its bare panels.
 */
export function displayPhotoId(wall) {
  return wall?.photoWithHoldsId
      ?? wall?.photoStrippedId
      ?? wall?.photoId
      ?? wall?.photoPartialId
      ?? null
}

/** The slots that actually have a photo, for switchers and badges. */
export function availablePhotos(wall) {
  const found = PHOTO_SLOTS
    .filter(slot => wall?.[slot.key])
    .map(slot => ({ ...slot, photoId: wall[slot.key] }))

  // Surface a legacy photo too, so it can still be selected in the switcher.
  if (!found.length && wall?.photoId) {
    return [{ key: 'photoId', id: 'photo', label: 'Photo', hint: '', photoId: wall.photoId }]
  }
  return found
}
