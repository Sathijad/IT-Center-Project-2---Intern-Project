import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import AuditLog from './pages/AuditLog'
import Profile from './pages/Profile'
import LeaveRequestPage from './pages/LeaveRequestPage'
import ApplyLeavePage from './pages/ApplyLeavePage'
import AttendancePage from './pages/AttendancePage'
import Layout from './components/Layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/:id"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <UserDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route path="profile" element={<Profile />} />
              <Route
                path="admin/leave"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <LeaveRequestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/attendance"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route path="leave" element={<ApplyLeavePage />} />
              <Route path="leave/history" element={<LeaveRequestPage />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

