import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingBlackoutsPage from '../../src/pages/BookingBlackoutsPage';

// Mock bookingApi
jest.mock('../../src/lib/bookingApi', () => ({
	__esModule: true,
	listBlackouts: jest.fn().mockResolvedValue({
		blackouts: [
			{
				id: 1,
				roomId: 1,
				startTs: '2024-01-20T00:00:00Z',
				endTs: '2024-01-20T23:59:59Z',
				reason: 'Maintenance',
				createdBy: 1,
				createdAt: '2024-01-19T00:00:00Z',
			},
			{
				id: 2,
				roomId: 2,
				startTs: '2024-01-21T00:00:00Z',
				endTs: '2024-01-21T23:59:59Z',
				reason: 'Event',
				createdBy: 1,
				createdAt: '2024-01-20T00:00:00Z',
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
	createBlackout: jest.fn().mockResolvedValue({
		blackout: {
			id: 3,
			roomId: 1,
			startTs: '2024-01-22T00:00:00Z',
			endTs: '2024-01-22T23:59:59Z',
			reason: 'New Blackout',
			createdBy: 1,
			createdAt: '2024-01-21T00:00:00Z',
		},
	}),
	updateBlackout: jest.fn().mockResolvedValue({
		blackout: {
			id: 1,
			roomId: 1,
			startTs: '2024-01-20T00:00:00Z',
			endTs: '2024-01-20T23:59:59Z',
			reason: 'Updated Maintenance',
			createdBy: 1,
			createdAt: '2024-01-19T00:00:00Z',
		},
	}),
	deleteBlackout: jest.fn().mockResolvedValue(undefined),
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

// Mock window.confirm
global.window.confirm = jest.fn(() => true);

expect.extend(toHaveNoViolations);

describe('BookingBlackoutsPage accessibility', () => {
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
					<BookingBlackoutsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it('blackout form has proper labels and structure', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<BookingBlackoutsPage />
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

	it('blackouts list has proper structure', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<BookingBlackoutsPage />
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

	it('action buttons are accessible', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<BookingBlackoutsPage />
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

