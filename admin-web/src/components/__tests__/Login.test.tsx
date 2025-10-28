import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../pages/Login'

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}))

// Mock the auth library
vi.mock('../../lib/auth', () => ({
  startLogin: vi.fn(),
}))

describe('Login Component', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen).toBeDefined()
  })

  it('displays sign in button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Sign in with Cognito')).toBeInTheDocument()
  })
})

