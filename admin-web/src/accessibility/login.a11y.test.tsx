import { describe, it, vi, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import Login from '../pages/Login'

// Mock the auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}))

// Mock the auth library
vi.mock('../lib/auth', () => ({
  startLogin: vi.fn(),
}))

describe('Login Accessibility Tests', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    const results = await axe(container)
    expect(results.violations.length).toBe(0)
  })

  it('login form is accessible', async () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    
    const results = await axe(container)
    
    // Verify no critical violations
    expect(results.violations.length).toBe(0)
  })
})

