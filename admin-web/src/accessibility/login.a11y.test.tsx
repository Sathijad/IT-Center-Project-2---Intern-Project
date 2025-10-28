import { describe, it, expect, vi } from 'vitest'
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
    // Check for violations - accessibility tests pass if no violations found
    if (results.violations && results.violations.length > 0) {
      console.log('Accessibility violations:', results.violations)
    }
    expect(results.violations).toHaveLength(0)
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

