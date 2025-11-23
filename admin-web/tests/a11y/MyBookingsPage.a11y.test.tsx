import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyBookingsPage from '../../src/pages/MyBookingsPage';

// Mock bookingApi
jest.mock('../../src/lib/bookingApi', () => ({
	__esModule: true,
	listBookings: jest.fn().mockResolvedValue({
		bookings: [
			{
				id: 1,
				roomId: 1,
				userId: 1,
				startTs: '2024-01-20T10:00:00Z',
				endTs: '2024-01-20T11:00:00Z',
				status: 'CONFIRMED',
				title: 'Team Meeting',
				attendees: ['user1@example.com'],
				idempotencyKey: null,
				externalEventId: null,
				createdAt: '2024-01-19T09:00:00Z',
				updatedAt: '2024-01-19T09:00:00Z',
				room: {
					id: 1,
					name: 'Conference Room A',
					capacity: 10,
					location: 'Building 1, Floor 2',
				},
			},
			{
				id: 2,
				roomId: 2,
				userId: 1,
				startTs: '2024-01-21T14:00:00Z',
				endTs: '2024-01-21T15:00:00Z',
				status: 'PENDING',
				title: 'Client Call',
				attendees: [],
				idempotencyKey: null,
				externalEventId: null,
				createdAt: '2024-01-20T10:00:00Z',
				updatedAt: '2024-01-20T10:00:00Z',
				room: {
					id: 2,
					name: 'Meeting Room B',
					capacity: 5,
					location: 'Building 1, Floor 1',
				},
			},
		],
	}),
	cancelBooking: jest.fn().mockResolvedValue({
		booking: {
			id: 1,
			roomId: 1,
			userId: 1,
			startTs: '2024-01-20T10:00:00Z',
			endTs: '2024-01-20T11:00:00Z',
			status: 'CANCELLED',
			title: 'Team Meeting',
			attendees: [],
			idempotencyKey: null,
			externalEventId: null,
			createdAt: '2024-01-19T09:00:00Z',
			updatedAt: '2024-01-19T09:00:00Z',
		},
	}),
}));

// Mock AuthContext
jest.mock('../../src/contexts/AuthContext', () => ({
	useAuth: () => ({
		user: {
			id: 1,
			email: 'employee@example.com',
			displayName: 'Test Employee',
			roles: ['EMPLOYEE'],
		},
		loading: false,
		isAuthenticated: true,
		isAdmin: false,
		setUser: jest.fn(),
	}),
}));

// Mock window.confirm
global.window.confirm = jest.fn(() => true);

expect.extend(toHaveNoViolations);

describe('MyBookingsPage accessibility', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
	});

	afterEach(() => {
		queryClient.clear();
	});

	it('has no detectable a11y violations', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<MyBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it('bookings list has proper structure and semantics', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<MyBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);

		const results = await axe(container, {
			rules: {
				'list': { enabled: true },
				'listitem': { enabled: true },
			},
		});
		expect(results).toHaveNoViolations();
	});

	it('cancel buttons are accessible', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<MyBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);

		const results = await axe(container, {
			rules: {
				'button-name': { enabled: true },
				'aria-hidden-focus': { enabled: true },
			},
		});
		expect(results).toHaveNoViolations();
	});

	// Note: Color contrast tests disabled in jsdom environment
	// jsdom doesn't support HTMLCanvasElement.getContext required by axe-core
	// Color contrast should be tested in E2E tests with real browser
});

