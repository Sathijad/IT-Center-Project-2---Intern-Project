// API Mocking Script - Injected into browser context
// Intercepts axios requests by mocking XMLHttpRequest (which axios uses in browsers)
(function() {
  // Save original XMLHttpRequest
  window.__originalXHR = window.XMLHttpRequest;
  
  // Mock data store
  window.__mockData = {
    me: {
      id: 1,
      email: 'admin@itcenter.com',
      displayName: 'Test Admin',
      roles: ['ADMIN']
    },
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
      ],
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
      ],
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 20
    }
  };
  
  // Helper function to get mock response
  function getMockResponse(urlStr, method, body) {
    // Extract path from full URL (axios includes baseURL like http://localhost:8080)
    var path = urlStr;
    var pathMatch = urlStr.match(/https?:\/\/[^\/]+(\/.*)/);
    if (pathMatch) {
      path = pathMatch[1];
    }
    
    // Mock /api/v1/me
    if (path.indexOf('/api/v1/me') !== -1 || urlStr.indexOf('/api/v1/me') !== -1) {
      return {
        status: 200,
        data: window.__mockData.me
      };
    }
    
    // Mock /api/v1/admin/users (list, not detail)
    var isUserDetail = path.match(/\/api\/v1\/admin\/users\/[0-9]+$/) || urlStr.match(/\/api\/v1\/admin\/users\/[0-9]+$/);
    if ((path.indexOf('/api/v1/admin/users') !== -1 || urlStr.indexOf('/api/v1/admin/users') !== -1) && !isUserDetail) {
      // Check for PUT/PATCH (role updates)
      if ((method === 'PUT' || method === 'PATCH') && body) {
        try {
          var parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
          var userIdMatch = urlStr.match(/\/users\/([0-9]+)/);
          var userId = parsedBody.userId || (userIdMatch && userIdMatch[1] ? parseInt(userIdMatch[1]) : 0);
          var roles = parsedBody.roles || [];
          
          var user = window.__mockData.users.content.find(function(u) { return u.id === userId; });
          if (user) {
            user.roles = roles;
            
            // Add audit log entry
            var newEvent = {
              id: Date.now(),
              createdAt: new Date().toISOString(),
              userEmail: window.__mockData.me.email,
              eventType: 'ROLE_ASSIGNED',
              ipAddress: '127.0.0.1'
            };
            window.__mockData.auditLogs.content.unshift(newEvent);
          }
          
          return {
            status: 200,
            data: user || {}
          };
        } catch (e) {
          return {
            status: 400,
            data: { error: 'Invalid request' }
          };
        }
      }
      
      // Return users list
      var baseUrl = 'http://localhost:8080';
      try {
        var urlObj = new URL(urlStr);
        baseUrl = urlObj.origin;
      } catch (e) {
        // URL might be relative
      }
      var urlObj = new URL(urlStr, baseUrl);
      var query = urlObj.searchParams.get('query') || '';
      var page = parseInt(urlObj.searchParams.get('page') || '0');
      
      var filteredUsers = window.__mockData.users.content;
      if (query) {
        filteredUsers = filteredUsers.filter(function(u) {
          return u.email.toLowerCase().indexOf(query.toLowerCase()) !== -1 ||
                 u.displayName.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        });
      }
      
      var usersResponse = {
        content: filteredUsers,
        totalElements: window.__mockData.users.totalElements,
        totalPages: window.__mockData.users.totalPages,
        page: page,
        size: window.__mockData.users.size
      };
      
      return {
        status: 200,
        data: usersResponse
      };
    }
    
    // Mock /api/v1/admin/users/:id (user detail)
    var userDetailMatch = path.match(/\/api\/v1\/admin\/users\/([0-9]+)$/) || urlStr.match(/\/api\/v1\/admin\/users\/([0-9]+)$/);
    if (userDetailMatch) {
      var detailUserId = parseInt(userDetailMatch[1] || '0');
      var detailUser = window.__mockData.users.content.find(function(u) { return u.id === detailUserId; });
      
      if (detailUser) {
        return {
          status: 200,
          data: detailUser
        };
      }
      
      return {
        status: 404,
        data: { error: 'User not found' }
      };
    }
    
    // Mock /api/v1/admin/audit-log
    if (path.indexOf('/api/v1/admin/audit-log') !== -1 || urlStr.indexOf('/api/v1/admin/audit-log') !== -1) {
      var baseUrl = 'http://localhost:8080';
      try {
        var tempUrlObj = new URL(urlStr);
        baseUrl = tempUrlObj.origin;
      } catch (e) {
        // URL might be relative
      }
      var auditUrlObj = new URL(urlStr, baseUrl);
      var auditPage = parseInt(auditUrlObj.searchParams.get('page') || '0');
      var auditSize = parseInt(auditUrlObj.searchParams.get('size') || '20');
      
      var auditResponse = {
        content: window.__mockData.auditLogs.content,
        totalElements: window.__mockData.auditLogs.totalElements,
        totalPages: window.__mockData.auditLogs.totalPages,
        page: auditPage,
        size: auditSize
      };
      
      return {
        status: 200,
        data: auditResponse
      };
    }
    
    return null; // No mock for this URL
  }
  
  // Override XMLHttpRequest
  window.XMLHttpRequest = function() {
    var xhr = new window.__originalXHR();
    var originalOpen = xhr.open;
    var originalSend = xhr.send;
    var urlStr = '';
    var method = '';
    var requestBody = '';
    
    xhr.open = function(meth, url, async, user, password) {
      method = meth;
      urlStr = url;
      // Don't call original open for mocked URLs
      var mockRes = getMockResponse(urlStr, method);
      if (mockRes) {
        this._mocked = true;
        this._mockResponse = mockRes;
        return;
      }
      return originalOpen.apply(this, arguments);
    };
    
    xhr.send = function(body) {
      requestBody = body;
      
      if (this._mocked) {
        var mockRes = getMockResponse(urlStr, method, requestBody);
        if (mockRes) {
          // Simulate async response
          setTimeout(function() {
            Object.defineProperty(this, 'status', { value: mockRes.status, writable: false });
            Object.defineProperty(this, 'statusText', { value: mockRes.status === 200 ? 'OK' : 'Error', writable: false });
            Object.defineProperty(this, 'responseText', { value: JSON.stringify(mockRes.data), writable: false });
            Object.defineProperty(this, 'response', { value: JSON.stringify(mockRes.data), writable: false });
            Object.defineProperty(this, 'readyState', { value: 4, writable: false });
            
            if (this.onreadystatechange) {
              this.onreadystatechange();
            }
            if (this.onload) {
              this.onload();
            }
          }.bind(this), 0);
          return;
        }
      }
      
      return originalSend.apply(this, arguments);
    };
    
    return xhr;
  };
  
  // Also override fetch (in case some parts use it)
  window.__originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    var urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
    var method = options && options.method ? options.method : 'GET';
    var body = options && options.body ? options.body : null;
    
    var mockRes = getMockResponse(urlStr, method, body);
    if (mockRes) {
      return new Response(JSON.stringify(mockRes.data), {
        status: mockRes.status,
        statusText: mockRes.status === 200 ? 'OK' : 'Error',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return window.__originalFetch.apply(this, arguments);
  };
  
  console.log('API mocking enabled (XMLHttpRequest + fetch)');
})();
