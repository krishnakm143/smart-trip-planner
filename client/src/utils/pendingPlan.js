const STORAGE_KEY = 'stp.pendingPlan'

export const pendingPlan = {
  save(planInput) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(planInput))
  },
  read() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  },
  clear() {
    sessionStorage.removeItem(STORAGE_KEY)
  },
}
