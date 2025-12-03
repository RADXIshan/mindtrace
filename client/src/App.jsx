import { Route, Routes } from 'react-router'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import InteractionHistory from './pages/InteractionHistory'
import ContactsDirectory from './pages/ContactsDirectory'
import AlertsNotifications from './pages/AlertsNotifications'
import RemindersCalendar from './pages/RemindersCalendar'
import SOSSettings from './pages/SOSSettings'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'

const App = () => {
  return (
    <>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/login' element={<PublicRoute><Login /></PublicRoute>} />
        <Route path='/signup' element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path='/auth/callback' element={<AuthCallback />} />
        
        <Route path='/dashboard' element={<ProtectedRoute><DashboardLayout><DashboardHome /></DashboardLayout></ProtectedRoute>} />
        <Route path='/dashboard/interactions' element={<ProtectedRoute><DashboardLayout><InteractionHistory /></DashboardLayout></ProtectedRoute>} />
        <Route path='/dashboard/contacts' element={<ProtectedRoute><DashboardLayout><ContactsDirectory /></DashboardLayout></ProtectedRoute>} />
        <Route path='/dashboard/alerts' element={<ProtectedRoute><DashboardLayout><AlertsNotifications /></DashboardLayout></ProtectedRoute>} />
        <Route path='/dashboard/reminders' element={<ProtectedRoute><DashboardLayout><RemindersCalendar /></DashboardLayout></ProtectedRoute>} />
        <Route path='/dashboard/sos' element={<ProtectedRoute><DashboardLayout><SOSSettings /></DashboardLayout></ProtectedRoute>} />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App
