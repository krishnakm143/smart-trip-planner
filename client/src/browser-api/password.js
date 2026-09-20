import { randomId } from './ids'

// The REST API hashes passwords with bcrypt. Here a salted SHA-256 digest keeps
// plain passwords out of localStorage; the value never leaves this browser.

async function digest(salt, password) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password) {
  const salt = randomId()
  return `${salt}:${await digest(salt, password)}`
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  return (await digest(salt, password)) === hash
}
