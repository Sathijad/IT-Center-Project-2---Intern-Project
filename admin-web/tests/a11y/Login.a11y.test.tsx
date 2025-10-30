import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';

// Mock modules that pull in Vite env or API
jest.mock('../../src/lib/auth', () => ({
    __esModule: true,
    startLogin: jest.fn(),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: false }),
}));

// Import after mocks are in place to avoid evaluating real deps
const Login = require('../../src/pages/Login').default as React.FC;

expect.extend(toHaveNoViolations);

describe('Login page accessibility', () => {
	it('has no detectable a11y violations', async () => {
		const { container } = render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});


