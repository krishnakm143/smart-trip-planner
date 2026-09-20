import { apiClient } from './apiClient'

export const previewPlan = (planInput, signal) =>
  apiClient
    .post('/planner/preview', planInput, { signal, withMeta: true })
    .then(({ data, meta }) => ({ ...data, provider: meta.provider }))
