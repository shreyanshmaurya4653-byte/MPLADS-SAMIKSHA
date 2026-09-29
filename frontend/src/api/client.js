const BASE_URL = '/api/v1';

// In-memory response cache and in-flight request deduplication map
const responseCache = new Map();
const inFlightRequests = new Map();

/**
 * Get cache TTL based on endpoint type
 */
function getEndpointTTL(endpoint) {
  if (endpoint.includes('/jurisdiction/')) return 600000; // 10 minutes for geography
  if (endpoint.includes('/dashboard/stats')) return 30000; // 30 seconds
  if (endpoint.includes('/dashboard/utilization-trends')) return 30000;
  if (endpoint.includes('/predictions/')) return 45000; // 45 seconds
  if (endpoint.includes('/analytics/')) return 45000;
  if (endpoint.includes('/works/')) return 20000; // 20 seconds
  return 15000; // 15 seconds default
}

/**
 * Invalidate cache on mutations
 */
export function clearApiCache(prefix = '') {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) {
      responseCache.delete(key);
    }
  }
}

export async function apiClient(endpoint, { body, skipCache = false, ...customConfig } = {}) {
  const token = localStorage.getItem('mplads_token');
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const method = customConfig.method || (body ? 'POST' : 'GET');
  const isGet = method.toUpperCase() === 'GET';

  // 1. For GET requests: Check in-memory cache
  const cacheKey = `${endpoint}::${token ? 'auth' : 'anon'}`;
  if (isGet && !skipCache) {
    const cached = responseCache.get(cacheKey);
    const ttl = getEndpointTTL(endpoint);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
      return cached.data;
    }

    // 2. In-flight request deduplication: if exact request is already flying, return that promise
    if (inFlightRequests.has(cacheKey)) {
      return await inFlightRequests.get(cacheKey);
    }
  }

  // 3. For mutation requests (POST, PUT, DELETE), invalidate cache
  if (!isGet) {
    clearApiCache();
  }

  const config = {
    method,
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        localStorage.removeItem('mplads_token');
        localStorage.removeItem('mplads_user');
        window.dispatchEvent(new CustomEvent('mplads:session_expired'));
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Server request failed');
      }

      const data = await response.json();

      // Store in memory cache for GET requests
      if (isGet) {
        responseCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        if (responseCache.size > 150) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
        }
      }

      return data;
    } catch (err) {
      console.warn(`API request to ${endpoint} failed:`, err.message);
      throw err;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return await fetchPromise;
}
