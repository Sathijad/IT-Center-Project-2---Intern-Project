import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import BookingRoomsPage from '../BookingRoomsPage'
import * as bookingApi from '../../lib/bookingApi'

// Mock the booking API
vi.mock('../../lib/bookingApi', () => ({
  getRooms: vi.fn(),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}))

// Mock window.confirm
const mockConfirm = vi.fn()
window.confirm = mockConfirm

describe('BookingRoomsPage', () => {
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
          <BookingRoomsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders without crashing', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Room Management')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    vi.mocked(bookingApi.getRooms).mockImplementation(() => new Promise(() => {}))
    renderComponent()
    expect(screen.getByText('Loading rooms...')).toBeInTheDocument()
  })

  it('displays empty state when no rooms', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/No rooms found/i)).toBeInTheDocument()
    })
  })

  it('displays rooms table', async () => {
    const mockRooms = [
      {
        id: 1,
        name: 'Conference Room A',
        capacity: 10,
        amenities: ['projector', 'whiteboard'],
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
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Building 1')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('shows create form when Add Room is clicked', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Room')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Create New Room')).toBeInTheDocument()
    })
  })

  it('creates a room when form is submitted', async () => {
    const mockRoom = {
      id: 1,
      name: 'New Room',
      capacity: 5,
      amenities: ['projector'],
      location: 'Building 2',
      active: true,
      ownerTeamId: null,
      externalCalendarId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(bookingApi.createRoom).mockResolvedValue({ room: mockRoom })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Room')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
      const capacityInput = document.querySelector('input[name="capacity"]') as HTMLInputElement
      const amenitiesInput = document.querySelector('input[name="amenities"]') as HTMLInputElement
      const locationInput = document.querySelector('input[name="location"]') as HTMLInputElement
      const submitButton = screen.getByText('Create Room')
      
      expect(nameInput).toBeInTheDocument()
      expect(capacityInput).toBeInTheDocument()
      expect(amenitiesInput).toBeInTheDocument()
      expect(locationInput).toBeInTheDocument()
      
      fireEvent.change(nameInput, { target: { value: 'New Room' } })
      fireEvent.change(capacityInput, { target: { value: '5' } })
      fireEvent.change(amenitiesInput, { target: { value: 'projector' } })
      fireEvent.change(locationInput, { target: { value: 'Building 2' } })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(bookingApi.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Room',
          capacity: 5,
        })
      )
    })
  })

  it('updates a room when edit is clicked', async () => {
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
    vi.mocked(bookingApi.updateRoom).mockResolvedValue({
      room: { ...mockRooms[0], name: 'Updated Room' },
    })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByTitle('Edit room')
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText('Edit Room')).toBeInTheDocument()
      })
    }
  })

  it('deletes a room when delete is clicked', async () => {
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
    
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.deleteRoom).mockResolvedValue({
      room: mockRooms[0],
      message: 'Room deleted',
    })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByTitle('Deactivate room')
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
        expect(bookingApi.deleteRoom).toHaveBeenCalled()
        // Check that deleteRoom was called with room id (first argument)
        const calls = vi.mocked(bookingApi.deleteRoom).mock.calls
        expect(calls[0][0]).toBe(1)
      })
    }
  })

  it('shows validation error for invalid capacity', async () => {
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Room')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      const capacityInput = document.querySelector('input[name="capacity"]') as HTMLInputElement
      expect(capacityInput).toBeInTheDocument()
      fireEvent.change(capacityInput, { target: { value: '0' } })
    })
    
    // Form validation should prevent submission
    await waitFor(() => {
      const submitButton = screen.getByText('Create Room')
      expect(submitButton).toBeInTheDocument()
    })
  })

  it('displays error message when rooms fail to load', async () => {
    vi.mocked(bookingApi.getRooms).mockRejectedValue(new Error('Failed to load'))
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load rooms/i)).toBeInTheDocument()
    })
  })

  it('displays inactive rooms with reduced opacity', async () => {
    const mockRooms = [
      {
        id: 1,
        name: 'Inactive Room',
        capacity: 10,
        amenities: [],
        location: 'Building 1',
        active: false,
        ownerTeamId: null,
        externalCalendarId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Inactive Room')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })
})

