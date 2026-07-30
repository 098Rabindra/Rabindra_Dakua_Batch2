/**
 * API Fetch Client Wrapper
 */

const API_BASE_URL = '/api';

export async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const defaultMsg = (response.status === 500 || response.status === 503)
      ? 'Backend server is unavailable (Port 8080). Please start the Spring Boot backend service.'
      : `API Request failed with status ${response.status}`;
    throw new Error(data.message || data.error || defaultMsg);
  }

  return data;
}

export const authApi = {
  login: (credentials) => apiRequest('/auth/login', 'POST', credentials),
  register: (userData) => apiRequest('/auth/register', 'POST', userData),
};

export const vaultApi = {
  getItems: (token, category = '', favorite = false) => {
    let query = '';
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (favorite) params.push(`favorite=true`);
    if (params.length > 0) query = `?${params.join('&')}`;
    return apiRequest(`/vault/items${query}`, 'GET', null, token);
  },

  getItemById: (id, token) => apiRequest(`/vault/items/${id}`, 'GET', null, token),

  createItem: (itemData, token) => apiRequest('/vault/items', 'POST', itemData, token),

  updateItem: (id, itemData, token) => apiRequest(`/vault/items/${id}`, 'PUT', itemData, token),

  deleteItem: (id, token) => apiRequest(`/vault/items/${id}`, 'DELETE', null, token),

  toggleFavorite: (id, token) => apiRequest(`/vault/items/${id}/favorite`, 'PATCH', null, token),
};
