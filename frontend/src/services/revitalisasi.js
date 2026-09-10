import { api } from './api';

export async function fetchRevitFilters() {
  return api.get('/revitalisasi/filters');
}

export async function fetchRevitKPI(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/kpi${qs}`);
}

export async function fetchRevitChart(type, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/charts/${type}${qs}`);
}

export async function fetchRevitRekapJenjang(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/rekap/jenjang${qs}`);
}

export async function fetchRevitRekapMenu(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/rekap/menu${qs}`);
}

export async function fetchRevitRincianMenu(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/rincian-menu${qs}`);
}

export async function fetchRevitSebaranPenerima(filters = {}, isUsb = false) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  if (isUsb) {
    params.set('is_usb', 'true');
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/sebaran-penerima${qs}`);
}

export async function fetchRevitTable(search = '', skip = 0, limit = 50, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (key === 'search' && !val) return;
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  if (search && !filters.search) params.set('search', search);
  params.set('skip', skip);
  params.set('limit', limit);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/table${qs}`);
}

export async function fetchRevitMapData(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach(v => params.append(key, v));
    } else if (val) {
      params.set(key, val);
    }
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/revitalisasi/map-data${qs}`);
}

export async function uploadRevitExcel(file, tahun) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tahun', tahun.toString());

  const token = localStorage.getItem('simondb_token');
  const res = await fetch('http://localhost:8000/api/revitalisasi/import', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Upload failed');
  }
  return data;
}

export async function fetchRevitHistory() {
  return api.get('/revitalisasi/history');
}

export async function deleteRevitHistory(id) {
  return api.delete(`/revitalisasi/history/${id}`);
}
