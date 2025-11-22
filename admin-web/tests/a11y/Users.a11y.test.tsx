import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Users from '../../src/pages/Users';

// Mock api used by the page
vi.mock('../../src/lib/api', () => ({
	__esModule: true,
	default: {
		get: vi.fn().mockResolvedValue({ data: { content: [], totalPages: 0, totalElements: 0 } }),
		patch: vi.fn().mockResolvedValue({ data: {} }),
	},
}));

expect.extend(toHaveNoViolations);

describe('Users page accessibility', () => {
	it('has no detectable a11y violations', async () => {
		const queryClient = new QueryClient();
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<Users />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});


