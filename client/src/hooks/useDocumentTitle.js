import { useEffect } from 'react'

const SITE_NAME = 'Smart Trip Planner'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  }, [title])
}
