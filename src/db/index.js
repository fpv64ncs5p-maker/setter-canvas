import Dexie from 'dexie'

export const db = new Dexie('SetterCanvas')

// ── v1 — original schema, auto-increment integer keys ────────────────────────
db.version(1).stores({
  gyms:   '++id, name, location, gradingSystem',
  walls:  '++id, gymId, name, type, angle',
  holds:  '++id, gymId, name, brand, type, size, color',
  routes: '++id, wallId, gymId, name, grade, status, dateSet',
  testers: '++id, routeId, name, date',
  feedback: '++id, routeId, date',
})

// ── v2/v3 — switch to client-generated UUID keys ─────────────────────────────
// Two devices would both create id:1 with auto-increment, and sync could not
// tell those rows apart. UUIDs are generated locally and unique everywhere.
// Dexie cannot change a primary key in place, so v2 drops the tables and v3
// recreates them. This discards any existing local data.
db.version(2).stores({
  gyms: null, walls: null, holds: null, routes: null, testers: null, feedback: null,
})

db.version(3).stores({
  gyms:     'id, name, location, gradingSystem, updatedAt',
  walls:    'id, gymId, name, type, angle, updatedAt',
  holds:    'id, gymId, name, brand, type, size, color, updatedAt',
  routes:   'id, wallId, gymId, name, grade, status, dateSet, updatedAt',
  testers:  'id, routeId, name, date, updatedAt',
  feedback: 'id, routeId, date, updatedAt',
})

// ── v4 — photos live in their own table, as Blobs ───────────────────────────
// Photo bytes are big. Keeping them on the wall row would mean every list
// query drags megabytes along just to draw a thumbnail, and later sync would
// push image data every time a wall's name changed. So walls store a photo id
// and the bytes live here.
//
// `path` is the Supabase Storage path, null until uploaded. `uploaded` is 0/1
// rather than a boolean because IndexedDB cannot index booleans.
db.version(4).stores({
  gyms:     'id, name, location, gradingSystem, updatedAt',
  walls:    'id, gymId, name, type, angle, updatedAt',
  holds:    'id, gymId, name, brand, type, size, color, updatedAt',
  routes:   'id, wallId, gymId, name, grade, status, dateSet, updatedAt',
  testers:  'id, routeId, name, date, updatedAt',
  feedback: 'id, routeId, date, updatedAt',
  photos:   'id, gymId, uploaded, updatedAt',
})

// ── Helpers ─────────────────────────────────────────────────────────────────

/** New UUID for a record. Safe on all browsers that support IndexedDB + HTTPS. */
export function newId() {
  return crypto.randomUUID()
}

/**
 * Stamp a new record: UUID (unless one is supplied) + created/updated times.
 * These timestamps are what the Supabase sync will compare — see
 * supabase/schema.sql.
 */
export function stamp(record) {
  const now = new Date().toISOString()
  return { id: newId(), ...record, createdAt: now, updatedAt: now, deletedAt: null }
}

/** Stamp an update: bumps updatedAt so sync sees the change. */
export function touch(changes) {
  return { ...changes, updatedAt: new Date().toISOString() }
}

export default db
