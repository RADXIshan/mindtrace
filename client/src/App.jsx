import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet } from 'react-router'
import { Toaster } from 'react-hot-toast'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'

import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import InteractionHistory from './pages/InteractionHistory'
import ContactsDirectory from './pages/ContactsDirectory'
import AlertsNotifications from './pages/AlertsNotifications'
import Reminders from './pages/Reminders'
import SOSSettings from './pages/SOSSettings'
import SOSPage from './components/sos/SOSPage'
import ProfileSettings from './pages/ProfileSettings'
import HelpSupport from './pages/HelpSupport'
import AiSummarizer from './pages/AiSummarizer'

import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'

const RootLayout = () => {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path='/' element={<Landing />} />

      <Route path='/login' element={<PublicRoute><Login /></PublicRoute>} />
      <Route path='/signup' element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path='/forgot-password' element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path='/reset-password' element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path='/auth/callback' element={<AuthCallback />} />

      {/* Dashboard parent route */}
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Nested dashboard pages */}
        <Route index element={<DashboardHome />} />
        <Route path='interactions' element={<InteractionHistory />} />
        <Route path='contacts' element={<ContactsDirectory />} />
        <Route path='alerts' element={<AlertsNotifications />} />
        <Route path='reminders' element={<Reminders />} />
        <Route path='sos-alerts' element={<SOSPage />} />
        <Route path='sos' element={<SOSSettings />} />
        <Route path='ai-assistant' element={<AiSummarizer />} />
        <Route path='settings' element={<ProfileSettings />} />
        <Route path='help' element={<HelpSupport />} />
      </Route>
    </Route>
  )
)

const App = () => {
  return <RouterProvider router={router} />
}

export default App;

