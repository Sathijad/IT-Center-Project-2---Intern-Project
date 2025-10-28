import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'

// Mock the auth context
const mockUseAuth = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock auth library
vi.mock('../../lib/auth', () => ({
  isAuthenticated: () => true,
}))

describe('ProtectedRoute Component', () => {
  it('hides content for EMPLOYEE role when ADMIN required', () => {
    mockUseAuth.mockReturnValue({
      user: { roles: ['EMPLOYEE'] },
      loading: false,
      isAdmin: false,
    })

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="ADMIN">
          <div>Admin Only Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument()
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument()
  })

  it('shows content for ADMIN role when ADMIN required', () => {
    mockUseAuth.mockReturnValue({
      user: { roles: ['ADMIN'] },
      loading: false,
      isAdmin: true,
    })

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="ADMIN">
          <div>Admin Only Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAdmin: false,
    })

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="ADMIN">
          <div>Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('allows access without required role', () => {
    mockUseAuth.mockReturnValue({
      user: { roles: ['EMPLOYEE'] },
      loading: false,
      isAdmin: false,
    })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Public Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Public Content')).toBeInTheDocument()
  })
})

