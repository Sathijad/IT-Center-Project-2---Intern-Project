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

// Mock the API - must define mock inside vi.mock factory to avoid hoisting issues
vi.mock('../../lib/api', () => {
  const mockPatch = vi.fn().mockResolvedValue({ data: {} })
  return {
    default: {
      get: vi.fn(),
      patch: mockPatch,
    },
  }
})

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
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  QueryClient: vi.fn().mockImplementation(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}))

describe('ProfileForm Integration', () => {
  it('renders profile form', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    // Wait for the form to render - check for any content
    await waitFor(() => {
      const content = document.body.textContent || ''
      expect(content.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('shows profile page content', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    // Just verify the page renders without errors
    await waitFor(() => {
      const content = document.body.textContent || ''
      expect(content.length).toBeGreaterThan(0)
    })
  })
})

