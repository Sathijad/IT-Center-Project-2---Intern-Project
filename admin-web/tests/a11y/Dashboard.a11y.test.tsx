import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../src/pages/Dashboard';

// Mock api calls used by the page
jest.mock('../../src/lib/api', () => ({
	__esModule: true,
	default: {
		get: jest.fn().mockResolvedValue({ data: { totalElements: 0, content: [] } }),
	},
}));

// Lightweight mock for AuthContext
jest.mock('../../src/contexts/AuthContext', () => {
	const React = require('react');
	return {
		useAuth: () => ({
			user: { email: 'admin@example.com', displayName: 'Admin', roles: ['ADMIN'] },
			loading: false,
			isAdmin: true,
			isAuthenticated: true,
			setUser: jest.fn(),
		}),
	};
});

expect.extend(toHaveNoViolations);

describe('Dashboard page accessibility', () => {
	it('has no detectable a11y violations', async () => {
		const queryClient = new QueryClient();
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Dashboard />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});


