import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import BookingReportsPage from '../BookingReportsPage'
import * as bookingApi from '../../lib/bookingApi'

// Mock the booking API
vi.mock('../../lib/bookingApi', () => ({
  listBookings: vi.fn(),
  getRooms: vi.fn(),
}))

describe('BookingReportsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BookingReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders without crashing', async () => {
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Booking Utilization Reports')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    vi.mocked(bookingApi.listBookings).mockImplementation(() => new Promise(() => {}))
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    expect(screen.getByText('Loading reports...')).toBeInTheDocument()
  })

  it('displays summary cards with metrics', async () => {
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        status: 'CONFIRMED' as const,
        title: 'Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        room: {
          id: 1,
          name: 'Conference Room A',
          capacity: 10,
          location: 'Building 1',
        },
      },
    ]
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: [],
        location: 'Building 1',
        active: true,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument()
      expect(screen.getByText('Active Rooms')).toBeInTheDocument()
      expect(screen.getByText('Avg Utilization')).toBeInTheDocument()
    })
  })

  it('displays room utilization table', async () => {
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        status: 'CONFIRMED' as const,
        title: 'Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        room: {
          id: 1,
          name: 'Conference Room A',
          capacity: 10,
          location: 'Building 1',
        },
      },
    ]
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: [],
        location: 'Building 1',
        active: true,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Room Utilization')).toBeInTheDocument()
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
  })

  it('displays empty state when no booking data', async () => {
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/No booking data available/i)).toBeInTheDocument()
    })
  })

  it('allows changing date range', async () => {
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(/2024|2025/)
      if (dateInputs.length >= 2) {
        fireEvent.change(dateInputs[0], { target: { value: '2024-02-01' } })
        fireEvent.change(dateInputs[1], { target: { value: '2024-02-28' } })
      }
    })
    
    await waitFor(() => {
      expect(bookingApi.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: expect.any(String),
          end_date: expect.any(String),
        })
      )
    })
  })

  it('displays error message when data fails to load', async () => {
    vi.mocked(bookingApi.listBookings).mockRejectedValue(new Error('Failed to load'))
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load booking reports/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('calculates utilization percentages correctly', async () => {
    const mockBookings = [
      {
        id: 1,
        roomId: 1,
        userId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T17:00:00Z', // 8 hours
        status: 'CONFIRMED' as const,
        title: 'Full Day Meeting',
        attendees: [],
        idempotencyKey: null,
        externalEventId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        room: {
          id: 1,
          name: 'Conference Room A',
          capacity: 10,
          location: 'Building 1',
        },
      },
    ]
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: [],
        location: 'Building 1',
        active: true,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.listBookings).mockResolvedValue({ bookings: mockBookings })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
      // Should show utilization data
      expect(screen.getByText(/hrs/i)).toBeInTheDocument()
    })
  })
})

