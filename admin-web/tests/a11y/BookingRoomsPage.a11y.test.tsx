import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingRoomsPage from '../../src/pages/BookingRoomsPage';

// Mock bookingApi
jest.mock('../../src/lib/bookingApi', () => ({
	__esModule: true,
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
				active: false,
				ownerTeamId: null,
				externalCalendarId: null,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			},
		],
	}),
	createRoom: jest.fn().mockResolvedValue({
		room: {
			id: 3,
			name: 'New Room',
			capacity: 8,
			amenities: [],
			location: null,
			active: true,
			ownerTeamId: null,
			externalCalendarId: null,
			createdAt: '2024-01-20T00:00:00Z',
			updatedAt: '2024-01-20T00:00:00Z',
		},
	}),
	updateRoom: jest.fn().mockResolvedValue({
		room: {
			id: 1,
			name: 'Updated Room',
			capacity: 12,
			amenities: ['projector'],
			location: 'Building 1, Floor 2',
			active: true,
			ownerTeamId: null,
			externalCalendarId: null,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-20T00:00:00Z',
		},
	}),
	deleteRoom: jest.fn().mockResolvedValue({
		room: {
			id: 1,
			name: 'Conference Room A',
			capacity: 10,
			amenities: [],
			location: null,
			active: true,
			ownerTeamId: null,
			externalCalendarId: null,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
		},
		message: 'Room deleted successfully',
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

// Mock window.confirm
global.window.confirm = jest.fn(() => true);

expect.extend(toHaveNoViolations);

describe('BookingRoomsPage accessibility', () => {
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
					<BookingRoomsPage />
				</QueryClientProvider>
			</MemoryRouter>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it('room form has proper labels and structure', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<BookingRoomsPage />
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

	it('action buttons are accessible', async () => {
		const { container } = render(
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<BookingRoomsPage />
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

