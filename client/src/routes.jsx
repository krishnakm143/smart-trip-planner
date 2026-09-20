import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/Home/HomePage'
import DestinationsPage from './pages/Destinations/DestinationsPage'
import DestinationDetailsPage from './pages/DestinationDetails/DestinationDetailsPage'
import PlanTripPage from './pages/PlanTrip/PlanTripPage'
import MyTripsPage from './pages/MyTrips/MyTripsPage'
import TripDetailsPage from './pages/TripDetails/TripDetailsPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import NotFoundPage from './pages/NotFound/NotFoundPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="destinations" element={<DestinationsPage />} />
        <Route path="destinations/:slug" element={<DestinationDetailsPage />} />
        <Route path="plan" element={<PlanTripPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="trips" element={<MyTripsPage />} />
          <Route path="trips/:id" element={<TripDetailsPage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
