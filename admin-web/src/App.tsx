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
import LeaveList from './pages/LeaveList'
import ApplyLeave from './pages/ApplyLeave'
import LeaveApprovals from './pages/LeaveApprovals'
import Attendance from './pages/Attendance'
import LeaveReports from './pages/LeaveReports'
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
              {/* Phase 2: Leave & Attendance Routes */}
              <Route path="leave" element={<LeaveList />} />
              <Route path="leave/apply" element={<ApplyLeave />} />
              <Route
                path="leave/approvals"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <LeaveApprovals />
                  </ProtectedRoute>
                }
              />
              <Route path="attendance" element={<Attendance />} />
              <Route
                path="reports/leave"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <LeaveReports />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

