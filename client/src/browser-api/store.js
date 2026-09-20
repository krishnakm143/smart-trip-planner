// Accounts, sessions and trips of the static build, kept in this browser's
// localStorage. The version in the key lets a later release start clean if the
// stored shape changes.
const PREFIX = 'stp.demo.v1.'

function read(name, fallback) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name)) ?? fallback
  } catch {
    return fallback
  }
}

const write = (name, value) => localStorage.setItem(PREFIX + name, JSON.stringify(value))

const collection = (name) => ({
  all: () => read(name, []),
  replace: (items) => write(name, items),
  insert(item) {
    write(name, [...read(name, []), item])
    return item
  },
})

export const users = collection('users')
export const trips = collection('trips')

export const sessions = {
  userIdFor: (token) => read('sessions', {})[token] ?? null,
  open: (token, userId) => write('sessions', { ...read('sessions', {}), [token]: userId }),
}

export const seededFlag = {
  isSet: () => read('seeded', false),
  set: () => write('seeded', true),
}
