import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import BookRoomPage from '../BookRoomPage'
import * as bookingApi from '../../lib/bookingApi'

// Mock the booking API
vi.mock('../../lib/bookingApi', () => ({
  getRooms: vi.fn(),
  getRoomAvailability: vi.fn(),
  createBooking: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('BookRoomPage', () => {
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
          <BookRoomPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders without crashing', () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    expect(screen.getByText('Book a Room')).toBeInTheDocument()
  })

  it('displays loading state when fetching rooms', () => {
    vi.mocked(bookingApi.getRooms).mockImplementation(() => new Promise(() => {}))
    renderComponent()
    expect(screen.getByText('Loading rooms...')).toBeInTheDocument()
  })

  it('displays rooms when loaded', async () => {
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: ['projector'],
        location: 'Building 1',
        active: true,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
  })

  it('displays error message when rooms fail to load', async () => {
    vi.mocked(bookingApi.getRooms).mockRejectedValue(new Error('Failed to load'))
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load rooms/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows selecting a room', async () => {
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: ['projector'],
        location: 'Building 1',
        active: true,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    const roomButtons = screen.getAllByText('Conference Room A')
    const roomButton = roomButtons[0].closest('button')
    expect(roomButton).toBeInTheDocument()
    fireEvent.click(roomButton!)
    
    await waitFor(() => {
      const selectedRoomDisplay = document.querySelector('.bg-blue-50')
      expect(selectedRoomDisplay).toBeInTheDocument()
      expect(selectedRoomDisplay?.textContent).toContain('Conference Room A')
    })
  })

  it('filters rooms by capacity', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    const capacityInput = screen.getByPlaceholderText('Any')
    fireEvent.change(capacityInput, { target: { value: '10' } })
    
    await waitFor(() => {
      expect(bookingApi.getRooms).toHaveBeenCalledWith(
        expect.objectContaining({ capacity: 10 })
      )
    })
  })

  it('shows validation error when end time is before start time', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
      const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
      
      expect(startInput).toBeInTheDocument()
      expect(endInput).toBeInTheDocument()
      
      // Set start time first
      fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } })
      // Then set end time before start time
      fireEvent.change(endInput, { target: { value: '2024-01-01T09:00' } })
    })
    
    // Wait for validation error to appear (component shows it when !isValidRange)
    await waitFor(() => {
      expect(screen.getByText(/End time must be after the start time/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('creates a booking when form is submitted', async () => {
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
    const mockBooking = {
      id: 1,
      roomId: 1,
      userId: 1,
      startTs: '2024-01-01T09:00:00Z',
      endTs: '2024-01-01T10:00:00Z',
      status: 'CONFIRMED' as const,
      title: 'Test Meeting',
      attendees: [],
      idempotencyKey: null,
      externalEventId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.createBooking).mockResolvedValue({ booking: mockBooking })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    // Select room
    const roomButton = screen.getByText('Conference Room A').closest('button')
    expect(roomButton).toBeInTheDocument()
    fireEvent.click(roomButton!)
    
    // Wait for room to be selected (form should show selected room in blue box)
    await waitFor(() => {
      const selectedRoomDisplay = document.querySelector('.bg-blue-50')
      expect(selectedRoomDisplay).toBeInTheDocument()
      expect(selectedRoomDisplay?.textContent).toContain('Conference Room A')
    })
    
    // Fill form
    const titleInput = screen.getByPlaceholderText('Meeting title')
    const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
    const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
    const submitButton = screen.getByText('Book Room')
    
    expect(titleInput).toBeInTheDocument()
    expect(startInput).toBeInTheDocument()
    expect(endInput).toBeInTheDocument()
    
    fireEvent.change(titleInput, { target: { value: 'Test Meeting' } })
    fireEvent.change(startInput, { target: { value: '2024-01-01T09:00' } })
    fireEvent.change(endInput, { target: { value: '2024-01-01T10:00' } })
    
    // Submit form
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(bookingApi.createBooking).toHaveBeenCalled()
    })
  })

  it('displays availability information', async () => {
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
    const mockAvailability = {
      roomId: 1,
      start: '2024-01-01T09:00:00Z',
      end: '2024-01-01T10:00:00Z',
      bookings: [],
      blackouts: [],
    }
    
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.getRoomAvailability).mockResolvedValue(mockAvailability)
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    // Select room and set times
    const roomButton = screen.getByText('Conference Room A').closest('button')
    if (roomButton) {
      fireEvent.click(roomButton)
    }
    
    await waitFor(() => {
      const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
      const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
      
      expect(startInput).toBeInTheDocument()
      expect(endInput).toBeInTheDocument()
      
      fireEvent.change(startInput, { target: { value: '2024-01-01T09:00' } })
      fireEvent.change(endInput, { target: { value: '2024-01-01T10:00' } })
    })
    
    await waitFor(() => {
      expect(bookingApi.getRoomAvailability).toHaveBeenCalled()
      expect(screen.getByText(/Room is available/i)).toBeInTheDocument()
    })
  })
})

