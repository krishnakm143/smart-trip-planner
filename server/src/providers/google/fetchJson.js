const TIMEOUT_MS = 4000;

export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    const reason = error.name === 'AbortError' ? `timed out after ${TIMEOUT_MS} ms` : error.message;
    throw new Error(reason, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}
