function fnv1a(text, seed) {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministic id for a seeded record. Derived from its natural key rather than
 * its position, so saved trips keep pointing at the right destination across reloads.
 */
export const stableId = (key) =>
  [0x811c9dc5, 0x01234567, 0x89abcdef].map((seed) => fnv1a(key, seed)).join('');
