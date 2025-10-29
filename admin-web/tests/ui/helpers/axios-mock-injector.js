// Axios Mock Injector - Intercepts axios requests in browser
// This works by overriding axios's adapter after axios is loaded
(function() {
  // Mock data (same structure as msw-handlers.ts)
  window.__mockData = {
    me: {
      id: 1,
      email: 'admin@itcenter.com',
      displayName: 'Test Admin',
      roles: ['ADMIN']
    },
    users: {
      content: [
        { id: 101, email: 'admin@itcenter.com', displayName: 'Test Admin', roles: ['ADMIN'] },
        { id: 102, email: 'user1@itcenter.com', displayName: 'User One', roles: ['EMPLOYEE'] },
        { id: 103, email: 'user2@itcenter.com', displayName: 'User Two', roles: ['EMPLOYEE'] }
      ],
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 20
    },
    auditLogs: {
      content: [
        { id: 1, createdAt: '2025-10-28T10:00:00Z', userEmail: 'admin@itcenter.com', eventType: 'ROLE_ASSIGNED', ipAddress: '127.0.0.1' },
        { id: 2, createdAt: '2025-10-28T10:05:00Z', userEmail: 'admin@itcenter.com', eventType: 'ROLE_REMOVED', ipAddress: '127.0.0.1' },
        { id: 3, createdAt: '2025-10-28T09:00:00Z', userEmail: 'admin@itcenter.com', eventType: 'LOGIN_SUCCESS', ipAddress: '127.0.0.1' }
      ],
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 20
    }
  };
  
  // Function to get mock response based on URL and method
  function getMockResponse(url, method, data) {
    var urlStr = typeof url === 'string' ? url : url.toString();
    var path = urlStr;
    var pathMatch = urlStr.match(/https?:\/\/[^\/]+(\/.*)/);
    if (pathMatch) {
      path = pathMatch[1];
    }
    
    // Normalize method
    method = (method || 'GET').toUpperCase();
    
    // Remove verbose logging - only log when matching
    
    // GET /api/v1/me - check both relative and absolute URLs
    var isMeEndpoint = path.indexOf('/api/v1/me') !== -1 || 
                       urlStr.indexOf('/api/v1/me') !== -1 ||
                       urlStr.indexOf('localhost:8080/api/v1/me') !== -1 ||
                       urlStr.indexOf('http://localhost:8080/api/v1/me') !== -1;
    
    if (isMeEndpoint && method === 'GET') {
      console.log('Mocking /api/v1/me - URL:', urlStr);
      if (!window.__mockData || !window.__mockData.me) {
        console.error('Mock data not available!');
        return null;
      }
      return { status: 200, data: window.__mockData.me };
    }
    
    // GET /api/v1/admin/users (list)
    var isUserDetail = path.match(/\/api\/v1\/admin\/users\/[0-9]+$/) || urlStr.match(/\/api\/v1\/admin\/users\/[0-9]+$/);
    if ((path.indexOf('/api/v1/admin/users') !== -1 || urlStr.indexOf('/api/v1/admin/users') !== -1) && !isUserDetail) {
      // PUT/PATCH for role updates
      if ((method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH') && data) {
        try {
          var roles = data.roles || [];
          var userIdMatch = urlStr.match(/\/users\/([0-9]+)/);
          var userId = data.userId || (userIdMatch && userIdMatch[1] ? parseInt(userIdMatch[1]) : 0);
          
          var user = window.__mockData.users.content.find(function(u) { return u.id === userId; });
          if (user) {
            user.roles = roles;
            window.__mockData.auditLogs.content.unshift({
              id: Date.now(),
              createdAt: new Date().toISOString(),
              userEmail: window.__mockData.me.email,
              eventType: 'ROLE_ASSIGNED',
              ipAddress: '127.0.0.1'
            });
          }
          return { status: 200, data: user || {} };
        } catch (e) {
          return { status: 400, data: { error: 'Invalid request' } };
        }
      }
      
      // GET users list
      var baseUrl = 'http://localhost:8080';
      try {
        var urlObj = new URL(urlStr);
        baseUrl = urlObj.origin;
      } catch (e) {}
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
      
      return {
        status: 200,
        data: {
          content: filteredUsers,
          totalElements: window.__mockData.users.totalElements,
          totalPages: window.__mockData.users.totalPages,
          page: page,
          size: window.__mockData.users.size
        }
      };
    }
    
    // GET /api/v1/admin/users/:id
    var userDetailMatch = path.match(/\/api\/v1\/admin\/users\/([0-9]+)$/) || urlStr.match(/\/api\/v1\/admin\/users\/([0-9]+)$/);
    if (userDetailMatch && method.toUpperCase() === 'GET') {
      var detailUserId = parseInt(userDetailMatch[1] || '0');
      var detailUser = window.__mockData.users.content.find(function(u) { return u.id === detailUserId; });
      return { status: detailUser ? 200 : 404, data: detailUser || { error: 'User not found' } };
    }
    
    // GET /api/v1/admin/audit-log
    if ((path.indexOf('/api/v1/admin/audit-log') !== -1 || urlStr.indexOf('/api/v1/admin/audit-log') !== -1) && method.toUpperCase() === 'GET') {
      var baseUrl = 'http://localhost:8080';
      try {
        var tempUrlObj = new URL(urlStr);
        baseUrl = tempUrlObj.origin;
      } catch (e) {}
      var auditUrlObj = new URL(urlStr, baseUrl);
      var auditPage = parseInt(auditUrlObj.searchParams.get('page') || '0');
      var auditSize = parseInt(auditUrlObj.searchParams.get('size') || '20');
      
      return {
        status: 200,
        data: {
          content: window.__mockData.auditLogs.content,
          totalElements: window.__mockData.auditLogs.totalElements,
          totalPages: window.__mockData.auditLogs.totalPages,
          page: auditPage,
          size: auditSize
        }
      };
    }
    
    return null;
  }
  
  // Custom axios adapter that intercepts requests
  function createMockAdapter() {
    return function(config) {
      var url = config.url;
      var baseURL = config.baseURL || '';
      var fullUrl = baseURL ? (baseURL + url) : url;
      var method = (config.method || 'GET').toUpperCase();
      var data = config.data;
      
      var mockRes = getMockResponse(fullUrl, method, data);
      
      if (mockRes) {
        // Return axios-compatible response
        return Promise.resolve({
          data: mockRes.data,
          status: mockRes.status,
          statusText: mockRes.status === 200 ? 'OK' : 'Error',
          headers: { 'content-type': 'application/json' },
          config: config,
          request: {}
        });
      }
      
      // For non-mocked requests, use original XMLHttpRequest
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = fullUrl;
        
        xhr.open(method, url, true);
        
        // Set headers
        if (config.headers) {
          for (var key in config.headers) {
            if (config.headers.hasOwnProperty(key)) {
              xhr.setRequestHeader(key, config.headers[key]);
            }
          }
        }
        
        xhr.onload = function() {
          var response = {
            data: JSON.parse(xhr.responseText || '{}'),
            status: xhr.status,
            statusText: xhr.statusText,
            headers: {},
            config: config,
            request: xhr
          };
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject({
              response: response,
              message: 'Request failed with status code ' + xhr.status
            });
          }
        };
        
        xhr.onerror = function() {
          reject({
            message: 'Network Error',
            config: config,
            request: xhr
          });
        };
        
        if (data) {
          xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
          xhr.send();
        }
      });
    };
  }
  
  // Intercept axios by overriding its adapter
  // This works by patching axios before it's used
  function setupAxiosMock() {
    // Method 1: If axios is on window
    if (typeof window.axios !== 'undefined') {
      var originalCreate = window.axios.create;
      window.axios.create = function(config) {
        config = config || {};
        config.adapter = createMockAdapter();
        return originalCreate.call(this, config);
      };
      window.axios.defaults.adapter = createMockAdapter();
      console.log('Axios mocking enabled (window.axios)');
      return;
    }
    
    // Method 2: Intercept when axios module loads
    // Override require/import by intercepting at module level
    // Since we can't easily do this, we'll intercept via interceptor pattern
    
    // Method 3: Override at axios adapter level globally
    // Store adapter globally so we can use it
    window.__mockAdapter = createMockAdapter();
    
    // Try to patch axios when it becomes available
    var checkCount = 0;
    var checkInterval = setInterval(function() {
      checkCount++;
      if (checkCount > 50) {
        clearInterval(checkInterval);
        console.log('Axios not found after 5 seconds');
        return;
      }
      
      // Try multiple ways to access axios
      var axios = window.axios || 
                  (window.module && window.module.exports && window.module.exports.axios) ||
                  null;
      
      if (axios) {
        clearInterval(checkInterval);
        var originalCreate = axios.create;
        axios.create = function(config) {
          config = config || {};
          config.adapter = window.__mockAdapter;
          return originalCreate.call(this, config);
        };
        axios.defaults.adapter = window.__mockAdapter;
        console.log('Axios mocking enabled (delayed)');
      }
    }, 100);
  }
  
  // Start setup immediately and also on DOM ready
  setupAxiosMock();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAxiosMock);
  } else {
    setTimeout(setupAxiosMock, 100);
  }
  
  // Also try at various intervals
  setTimeout(setupAxiosMock, 500);
  setTimeout(setupAxiosMock, 1000);
  setTimeout(setupAxiosMock, 2000);
  
  // Patch XMLHttpRequest at the prototype level BEFORE axios loads
  // This ensures all XHR instances are intercepted
  var OriginalXHR = window.XMLHttpRequest;
  var OriginalXHRPrototype = OriginalXHR.prototype;
  
  // Store original methods
  var originalOpen = OriginalXHRPrototype.open;
  var originalSend = OriginalXHRPrototype.send;
  
  // Override open method on prototype
  OriginalXHRPrototype.open = function(method, url, async, user, password) {
    this._mockMethod = method.toUpperCase();
    this._mockUrl = url;
    this._mockAsync = async !== false;
    
    // Check if this should be mocked
    var mockRes = getMockResponse(url, this._mockMethod);
    if (mockRes) {
      console.log('XHR Mock - intercepting in open():', this._mockMethod, url);
      this._shouldMock = true;
      this._mockResponse = mockRes;
      // Don't call original open
      return;
    }
    
    // Not mocked, call original
    return originalOpen.apply(this, arguments);
  };
  
  // Override send method on prototype
  OriginalXHRPrototype.send = function(data) {
    // If marked for mocking, simulate response
    if (this._shouldMock && this._mockResponse) {
      var mockRes = this._mockResponse;
      var self = this;
      
      console.log('XHR Mock - providing response:', this._mockMethod, this._mockUrl, '->', mockRes.status);
      
      // Simulate async response (axios expects async)
      setTimeout(function() {
        try {
          // Set all response properties
          self.responseText = JSON.stringify(mockRes.data);
          self.response = JSON.stringify(mockRes.data);
          self.status = mockRes.status;
          self.statusText = mockRes.status === 200 ? 'OK' : 'Error';
          self.readyState = 4;
          
          // Fire events in correct order
          if (self.onreadystatechange) {
            self.readyState = 4;
            try {
              self.onreadystatechange();
            } catch (e) {
              console.error('Error in onreadystatechange:', e);
            }
          }
          
          if (self.onload) {
            try {
              self.onload();
            } catch (e) {
              console.error('Error in onload:', e);
            }
          }
          
          if (self.onloadend) {
            try {
              self.onloadend();
            } catch (e) {
              console.error('Error in onloadend:', e);
            }
          }
        } catch (e) {
          console.error('Error setting XHR mock response:', e);
        }
      }, 0);
      
      return; // Don't call original send
    }
    
    // Not mocked, call original send
    return originalSend.apply(this, arguments);
  };
  
  console.log('API mocking initialized (XHR prototype patched)');
})();

