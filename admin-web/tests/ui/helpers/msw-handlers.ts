// MSW Handlers for API Mocking
// These handlers intercept HTTP requests and return mock responses

export interface MockUser {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
}

export interface MockAuditLog {
  id: number;
  createdAt: string;
  userEmail: string;
  eventType: string;
  ipAddress: string;
}

// Mock data store
export const mockData = {
  me: {
    id: 1,
    email: 'admin@itcenter.com',
    displayName: 'Test Admin',
    roles: ['ADMIN']
  } as MockUser,
  
  users: {
    content: [
      { 
        id: 101, 
        email: 'admin@itcenter.com', 
        displayName: 'Test Admin', 
        roles: ['ADMIN'] 
      },
      { 
        id: 102, 
        email: 'user1@itcenter.com', 
        displayName: 'User One', 
        roles: ['EMPLOYEE'] 
      },
      { 
        id: 103, 
        email: 'user2@itcenter.com', 
        displayName: 'User Two', 
        roles: ['EMPLOYEE'] 
      }
    ] as MockUser[],
    totalElements: 3,
    totalPages: 1,
    page: 0,
    size: 20
  },
  
  auditLogs: {
    content: [
      { 
        id: 1,
        createdAt: '2025-10-28T10:00:00Z', 
        userEmail: 'admin@itcenter.com', 
        eventType: 'ROLE_ASSIGNED', 
        ipAddress: '127.0.0.1'
      },
      { 
        id: 2,
        createdAt: '2025-10-28T10:05:00Z', 
        userEmail: 'admin@itcenter.com', 
        eventType: 'ROLE_REMOVED', 
        ipAddress: '127.0.0.1'
      },
      { 
        id: 3,
        createdAt: '2025-10-28T09:00:00Z', 
        userEmail: 'admin@itcenter.com', 
        eventType: 'LOGIN_SUCCESS', 
        ipAddress: '127.0.0.1'
      }
    ] as MockAuditLog[],
    totalElements: 3,
    totalPages: 1,
    page: 0,
    size: 20
  }
};

// Export handlers as a simple structure for JavaScript injection
export const handlers = mockData;


