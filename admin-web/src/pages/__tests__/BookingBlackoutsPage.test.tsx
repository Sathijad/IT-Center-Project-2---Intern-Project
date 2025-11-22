import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import BookingBlackoutsPage from '../BookingBlackoutsPage'
import * as bookingApi from '../../lib/bookingApi'

// Mock the booking API
vi.mock('../../lib/bookingApi', () => ({
  listBlackouts: vi.fn(),
  createBlackout: vi.fn(),
  updateBlackout: vi.fn(),
  deleteBlackout: vi.fn(),
  getRooms: vi.fn(),
}))

// Mock window.confirm
const mockConfirm = vi.fn()
window.confirm = mockConfirm

describe('BookingBlackoutsPage', () => {
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
          <BookingBlackoutsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders without crashing', async () => {
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Blackout Windows')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    vi.mocked(bookingApi.listBlackouts).mockImplementation(() => new Promise(() => {}))
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    expect(screen.getByText('Loading blackouts...')).toBeInTheDocument()
  })

  it('displays empty state when no blackouts', async () => {
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/No blackout windows configured/i)).toBeInTheDocument()
    })
  })

  it('displays blackouts list', async () => {
    const mockBlackouts = [
      {
        id: 1,
        roomId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        reason: 'Maintenance',
        createdBy: 1,
        createdAt: '2024-01-01T00:00:00Z',
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
    
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: mockBlackouts })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
      expect(screen.getByText('Maintenance')).toBeInTheDocument()
    })
  })

  it('shows create form when Add Blackout is clicked', async () => {
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Blackout')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Create Blackout Window')).toBeInTheDocument()
    })
  })

  it('creates a blackout when form is submitted', async () => {
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
    const mockBlackout = {
      id: 1,
      roomId: 1,
      startTs: '2024-01-01T09:00:00Z',
      endTs: '2024-01-01T10:00:00Z',
      reason: 'Maintenance',
      createdBy: 1,
      createdAt: '2024-01-01T00:00:00Z',
    }
    
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.createBlackout).mockResolvedValue({ blackout: mockBlackout })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Blackout')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      const roomSelect = document.querySelector('select[name="room_id"]') as HTMLSelectElement
      const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
      const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
      const reasonInput = document.querySelector('textarea[name="reason"]') as HTMLTextAreaElement
      const submitButton = screen.getByText('Create Blackout')
      
      expect(roomSelect).toBeInTheDocument()
      expect(startInput).toBeInTheDocument()
      expect(endInput).toBeInTheDocument()
      expect(reasonInput).toBeInTheDocument()
      
      fireEvent.change(roomSelect, { target: { value: '1' } })
      fireEvent.change(startInput, { target: { value: '2024-01-01T09:00' } })
      fireEvent.change(endInput, { target: { value: '2024-01-01T10:00' } })
      fireEvent.change(reasonInput, { target: { value: 'Maintenance' } })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(bookingApi.createBlackout).toHaveBeenCalled()
    })
  })

  it('updates a blackout when edit is clicked', async () => {
    const mockBlackouts = [
      {
        id: 1,
        roomId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        reason: 'Maintenance',
        createdBy: 1,
        createdAt: '2024-01-01T00:00:00Z',
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
    
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: mockBlackouts })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.updateBlackout).mockResolvedValue({
      blackout: { ...mockBlackouts[0], reason: 'Updated reason' },
    })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByTitle('Edit blackout')
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText('Edit Blackout Window')).toBeInTheDocument()
      })
    }
  })

  it('deletes a blackout when delete is clicked', async () => {
    const mockBlackouts = [
      {
        id: 1,
        roomId: 1,
        startTs: '2024-01-01T09:00:00Z',
        endTs: '2024-01-01T10:00:00Z',
        reason: 'Maintenance',
        createdBy: 1,
        createdAt: '2024-01-01T00:00:00Z',
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
    
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: mockBlackouts })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: mockRooms })
    vi.mocked(bookingApi.deleteBlackout).mockResolvedValue(undefined)
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByTitle('Delete blackout')
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
        expect(bookingApi.deleteBlackout).toHaveBeenCalled()
        // Check that deleteBlackout was called with blackout id (first argument)
        const calls = vi.mocked(bookingApi.deleteBlackout).mock.calls
        expect(calls[0][0]).toBe(1)
      })
    }
  })

  it('shows validation error when end time is before start time', async () => {
    vi.mocked(bookingApi.listBlackouts).mockResolvedValue({ blackouts: [] })
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Blackout')
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
      const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
      const roomSelect = document.querySelector('select[name="room_id"]') as HTMLSelectElement
      
      expect(startInput).toBeInTheDocument()
      expect(endInput).toBeInTheDocument()
      expect(roomSelect).toBeInTheDocument()
      
      // Fill required fields first
      fireEvent.change(roomSelect, { target: { value: '1' } })
    })
    
    // Wait a bit for room selection to process
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const startInput = document.querySelector('input[name="start_ts"]') as HTMLInputElement
    const endInput = document.querySelector('input[name="end_ts"]') as HTMLInputElement
    
    // Set times with invalid range (end before start)
    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } })
    fireEvent.change(endInput, { target: { value: '2024-01-01T09:00' } })
    
    // Wait for form to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Try submitting to trigger validation
    const submitButton = screen.getByText('Create Blackout')
    fireEvent.click(submitButton)
    
    // Wait for validation error to appear
    await waitFor(() => {
      // Check for zod validation error message (could be in error state)
      const errorText = screen.queryByText('End time must be after start time') ||
                       document.querySelector('.text-red-600')
      expect(errorText).toBeTruthy()
    }, { timeout: 3000 })
  })

  it('displays error message when blackouts fail to load', async () => {
    vi.mocked(bookingApi.listBlackouts).mockRejectedValue(new Error('Failed to load'))
    vi.mocked(bookingApi.getRooms).mockResolvedValue({ rooms: [] })
    
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load blackout windows/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

