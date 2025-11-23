import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminBookingsPage from '../../src/pages/AdminBookingsPage';

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
				userId: 2,
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
			{
				id: 3,
				roomId: 1,
				userId: 3,
				startTs: '2024-01-22T09:00:00Z',
				endTs: '2024-01-22T10:00:00Z',
				status: 'CANCELLED',
				title: 'Cancelled Meeting',
				attendees: [],
				idempotencyKey: null,
				externalEventId: null,
				createdAt: '2024-01-21T08:00:00Z',
				updatedAt: '2024-01-21T08:30:00Z',
				room: {
					id: 1,
					name: 'Conference Room A',
					capacity: 10,
					location: 'Building 1, Floor 2',
				},
			},
		],
	}),
	getRooms: jest.fn().mockResolvedValue({
		rooms: [
			{
				id: 1,
				name: 'Conference Room A',
				capacity: 10,
				amenities: ['projector', 'whiteboard'],
				location: 'Building 1, Floor 2',
				active: true,
				ownerTeamId: null,
				externalCalendarId: null,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			},
			{
				id: 2,
				name: 'Meeting Room B',
				capacity: 5,
				amenities: ['tv'],
				location: 'Building 1, Floor 1',
				active: true,
				ownerTeamId: null,
				externalCalendarId: null,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			},
		],
	}),
}));

// Mock AuthContext (ADMIN role)
jest.mock('../../src/contexts/AuthContext', () => ({
	useAuth: () => ({
		user: {
			id: 1,
			email: 'admin@example.com',
			displayName: 'Admin User',
			roles: ['ADMIN'],
		},
		loading: false,
		isAuthenticated: true,
		isAdmin: true,
		setUser: jest.fn(),
	}),
}));

expect.extend(toHaveNoViolations);

describe('AdminBookingsPage accessibility', () => {
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
					<AdminBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it('bookings table has proper structure', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<AdminBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);

		const results = await axe(container, {
			rules: {
				'table-fake-caption': { enabled: true },
				'th-has-data-cells': { enabled: true },
			},
		});
		expect(results).toHaveNoViolations();
	});

	it('filter form has proper labels', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<AdminBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);

		const results = await axe(container, {
			rules: {
				'label': { enabled: true },
				'form-field-multiple-labels': { enabled: true },
			},
		});
		expect(results).toHaveNoViolations();
	});

	it('filter inputs are keyboard navigable', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<AdminBookingsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);

		const results = await axe(container, {
			rules: {
				'focus-order-semantics': { enabled: true },
			},
		});
		expect(results).toHaveNoViolations();
	});

	// Note: Color contrast tests disabled in jsdom environment
	// jsdom doesn't support HTMLCanvasElement.getContext required by axe-core
	// Color contrast should be tested in E2E tests with real browser
});

