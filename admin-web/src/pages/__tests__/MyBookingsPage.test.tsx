import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MyBookingsPage from '../MyBookingsPage'
import * as bookingApi from '../../lib/bookingApi'

// Mock the booking API
vi.mock('../../lib/bookingApi', () => ({
  listBookings: vi.fn(),
  cancelBooking: vi.fn(),
}))

// Mock AuthContext
const mockUser = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  roles: ['EMPLOYEE'],
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    isAdmin: false,
    isAuthenticated: true,
    setUser: vi.fn(),
  }),
}))

// Mock window.confirm
const mockConfirm = vi.fn()
window.confirm = mockConfirm

describe('MyBookingsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MyBookingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders without crashing', async () => {
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    vi.mocked(bookingApi.listBookings).mockImplementation(() => new Promise(() => {}))
    renderComponent()
    expect(screen.getByText('Loading bookings...')).toBeInTheDocument()
  })

  it('displays empty state when no bookings', async () => {
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/You don't have any bookings yet/i)).toBeInTheDocument()
    })
  })

  it('displays bookings list', async () => {
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        status: 'CONFIRMED' as const,
        title: 'Team Meeting',
        attendees: ['user@example.com'],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.getByText('CONFIRMED')).toBeInTheDocument()
    })
  })

  it('displays error message when bookings fail to load', async () => {
    vi.mocked(bookingApi.listBookings).mockRejectedValue(new Error('Failed to load'))
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load bookings. Please try again/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows cancelling a booking', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: futureDate.toISOString(),
        endTs: new Date(futureDate.getTime() + 3600000).toISOString(),
        status: 'CONFIRMED' as const,
        title: 'Team Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    const cancelledBooking = { ...mockBookings[0], status: 'CANCELLED' as const }
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    vi.mocked(bookingApi.cancelBooking).mockResolvedValue({ booking: cancelledBooking })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    })
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled()
      expect(bookingApi.cancelBooking).toHaveBeenCalled()
      // Check that cancelBooking was called with booking id (first argument)
      const calls = vi.mocked(bookingApi.cancelBooking).mock.calls
      expect(calls[0][0]).toBe(1)
    })
  })

  it('does not show cancel button for past bookings', async () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: pastDate.toISOString(),
        endTs: new Date(pastDate.getTime() + 3600000).toISOString(),
        status: 'CONFIRMED' as const,
        title: 'Past Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Past Meeting')).toBeInTheDocument()
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  it('does not show cancel button for cancelled bookings', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: futureDate.toISOString(),
        endTs: new Date(futureDate.getTime() + 3600000).toISOString(),
        status: 'CANCELLED' as const,
        title: 'Cancelled Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Cancelled Meeting')).toBeInTheDocument()
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  it('displays attendees when present', async () => {
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        status: 'CONFIRMED' as const,
        title: 'Team Meeting',
        attendees: ['user1@example.com', 'user2@example.com'],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/user1@example.com, user2@example.com/i)).toBeInTheDocument()
    })
  })
})

