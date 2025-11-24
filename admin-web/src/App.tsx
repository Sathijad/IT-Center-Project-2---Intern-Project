import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import BookRoomPage from './pages/BookRoomPage'
import MyBookingsPage from './pages/MyBookingsPage'
import BookingRoomsPage from './pages/BookingRoomsPage'
import BookingBlackoutsPage from './pages/BookingBlackoutsPage'
import AdminBookingsPage from './pages/AdminBookingsPage'
import BookingReportsPage from './pages/BookingReportsPage'
import Layout from './components/Layout'
import SchedulesPlannerPage from './pages/SchedulesPlannerPage'
import TasksDashboardPage from './pages/TasksDashboardPage'
import CsvImportPage from './pages/CsvImportPage'
import ScheduleReportsPage from './pages/ScheduleReportsPage'

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
              <Route index element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
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
              <Route path="profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
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
              <Route path="leave" element={
                <ProtectedRoute>
                  <ApplyLeavePage />
                </ProtectedRoute>
              } />
              <Route path="leave/history" element={
                <ProtectedRoute>
                  <LeaveRequestPage />
                </ProtectedRoute>
              } />
              <Route path="bookings/new" element={
                <ProtectedRoute>
                  <BookRoomPage />
                </ProtectedRoute>
              } />
              <Route path="bookings/my" element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              } />
              <Route
                path="admin/booking/rooms"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <BookingRoomsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/booking/blackouts"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <BookingBlackoutsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/booking/bookings"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/booking/reports"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <BookingReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="schedules"
                element={
                  <ProtectedRoute requiredRole="TL">
                    <SchedulesPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tasks"
                element={
                  <ProtectedRoute>
                    <TasksDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="imports"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <CsvImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <ScheduleReportsPage />
                  </ProtectedRoute>
                }
              />
              {/* Legacy paths redirects */}
              <Route path="admin/booking/all" element={<Navigate to="/admin/booking/bookings" replace />} />
              <Route path="booking/book" element={<Navigate to="/bookings/new" replace />} />
              <Route path="booking/my-bookings" element={<Navigate to="/bookings/my" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

