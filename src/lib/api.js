const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });

    const contentType = response.headers.get('content-type');

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(
        data?.message || data || `HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout: el servidor no respondió');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: (path) => request(path),

  post: (path, data) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (path, data) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (path) =>
    request(path, {
      method: 'DELETE',
    }),
};