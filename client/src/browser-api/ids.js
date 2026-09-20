// Ids are 24 hexadecimal characters, the same shape as the ObjectIds the REST API returns.

const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const randomId = () => hex(crypto.getRandomValues(new Uint8Array(12)))

function fnv1a(text, seed) {
  let hash = seed
  for (const char of text) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Deterministic id for a seeded record. Derived from its natural key rather than
 * its position, so saved trips keep pointing at the right destination after a
 * reload or a redeploy that reorders the seed.
 */
export const stableId = (key) =>
  [0x811c9dc5, 0x01234567, 0x89abcdef].map((seed) => fnv1a(key, seed)).join('')
