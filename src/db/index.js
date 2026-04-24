import Dexie from 'dexie'

export const db = new Dexie('SetterCanvas')

db.version(1).stores({
  gyms:   '++id, name, location, gradingSystem',
  walls:  '++id, gymId, name, type, angle',
  holds:  '++id, gymId, name, brand, type, size, color',
  routes: '++id, wallId, gymId, name, grade, status, dateSet',
  testers: '++id, routeId, name, date',
  feedback: '++id, routeId, date',
})

export default db
