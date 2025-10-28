import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '../../pages/Profile'

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      displayName: 'Test User',
      locale: 'en',
      roles: ['EMPLOYEE'],
    },
    loading: false,
    isAdmin: false,
  }),
}))

// Mock the API
const mockPatch = vi.fn().mockResolvedValue({ data: {} })

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    patch: mockPatch,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: any) => ({
    data: {
      email: 'test@example.com',
      displayName: 'Test User',
      locale: 'en',
    },
    isLoading: false,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isLoading: false,
  }),
}))

describe('ProfileForm Integration', () => {
  it('calls onSave with correct data when form is submitted', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    // Wait for the form to render
    await waitFor(() => {
      expect(screen.getByText(/display name/i)).toBeInTheDocument()
    })

    // Find and update the display name field
    const displayNameInput = screen.getByLabelText(/display name/i)
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } })

    // Find and update the locale field
    const localeInput = screen.getByLabelText(/locale/i)
    fireEvent.change(localeInput, { target: { value: 'fr' } })

    // Find and click the save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    // Wait for the API call
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalled()
    })

    // Verify the API was called with correct data
    const calls = mockPatch.mock.calls
    expect(calls[0][1]).toEqual({
      displayName: 'Updated Name',
      locale: 'fr',
    })
  })

  it('shows current values in form fields', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    // Should display current profile data
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('en')).toBeInTheDocument()
  })
})

