const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const TOKEN_KEY = 'simondb_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('simondb_user');
  fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

async function refreshAccessToken() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, { 
    method: 'POST', 
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
  return data.access_token;
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!retryRes.ok) throw new Error('Retry failed');
      return retryRes.json();
    } catch (err) {
      handleUnauthorized();
      throw new Error('Sesi telah berakhir. Silakan login kembali.');
    }
  }

  if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Sesi telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request gagal: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

export async function fetchStats() {
  return apiFetch('/stats');
}

export async function fetchDashboardStats() {
  return apiFetch('/dashboard/stats');
}

export async function fetchStatus() {
  return apiFetch('/status');
}

export async function fetchMetadataTables() {
  return apiFetch('/visualisasi/metadata/tables');
}

export async function fetchMetadataColumns(table) {
  return apiFetch(`/visualisasi/metadata/columns/${table}`);
}

export async function fetchColumnValues(table, column, search = '', limit = 50, filters = []) {
  return apiFetch('/visualisasi/column-values', {
    method: 'POST',
    body: JSON.stringify({
      sumber_data: table,
      column: column,
      search: search || null,
      limit: limit,
      filters: filters,
    }),
  });
}

export async function postPreview(sumberData, filters = [], search = '') {
  return apiFetch('/visualisasi/preview', {
    method: 'POST',
    body: JSON.stringify({
      sumber_data: sumberData,
      filters,
      search: search || null,
    }),
  });
}

export async function postDynamicChart(data) {
  return apiFetch('/visualisasi/dynamic-chart', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function postExportRawExcel(sumberData, filters = [], search = '') {
  const token = localStorage.getItem('simondb_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/visualisasi/export-excel`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      sumber_data: sumberData,
      filters,
      search: search || null,
    }),
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesi telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Gagal mengunduh Excel: ${res.status}`);
  }

  return res.blob();
}

export async function fetchExport(table, params = {}, columns = [], filters = []) {
  const token = getToken();
  const qs = new URLSearchParams({ format: 'xlsx', ...params });

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = {
    columns: columns.length > 0 ? columns : null,
    filters: filters.length > 0 ? filters : null,
  };

  const res = await fetch(`${BASE_URL}/export/${table}?${qs}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesi telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Export gagal: ${res.status}`);
  }
  return res.blob();
}

export async function fetchTemplate(table) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/import-export/template/${table}`, { headers, credentials: 'include' });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesi telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Gagal mengunduh template: ${res.status}`);
  }
  return res.blob();
}

export async function fetchExportPreview(table, limit = 10, filters = []) {
  const params = new URLSearchParams({ limit });
  return apiFetch(`/export/${table}/preview?${params}`, {
    method: 'POST',
    body: JSON.stringify({
      filters: filters,
    }),
  });
}
