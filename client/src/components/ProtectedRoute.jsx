import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageLoader from './states/PageLoader'

export default function ProtectedRoute() {
  const { user, restoring } = useAuth()
  const location = useLocation()

  if (restoring) return <PageLoader label="Checking your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
