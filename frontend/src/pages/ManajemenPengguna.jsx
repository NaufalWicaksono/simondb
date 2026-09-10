import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Link as LinkIcon, Trash2, Edit2, Shield,
  Search, CheckCircle2, AlertCircle, Copy, X, KeyRound, Loader2
} from 'lucide-react';
import { api } from '../services/api.js';

export default function ManajemenPengguna() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role_id: 3,
  });

  const [inviteRoleId, setInviteRoleId] = useState(3);
  const [generatedInvite, setGeneratedInvite] = useState(null);

  const [msg, setMsg] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 10 });
      if (search) q.set('search', search);
      const res = await api.get(`/users?${q.toString()}`);
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/users/roles');
      setRoles(res || []);
      if (res && res.length > 0) {
        setFormData(prev => ({ ...prev, role_id: res[res.length - 1].id }));
        setInviteRoleId(res[res.length - 1].id);
      }
    } catch (err) { }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setMsg({ type: 'success', text: 'Pengguna baru berhasil ditambahkan.' });
      setIsAddModalOpen(false);
      setFormData({ name: '', username: '', email: '', password: '', role_id: roles[0]?.id || 1 });
      loadUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/invitations', { role_id: inviteRoleId, expires_in_days: 7 });
      setGeneratedInvite(res);
      setMsg({ type: 'success', text: 'Tautan undangan pendaftaran berhasil dibuat.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Yakin ingin menghapus user ${userName}?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setMsg({ type: 'success', text: `User ${userName} berhasil dihapus.` });
      loadUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMsg({ type: 'success', text: 'Tautan disalin ke clipboard!' });
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {msg && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
          msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna & Akses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola akun tim, peran (Role-Based Access Control), dan tautan token undangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-secondary text-xs"
          >
            <LinkIcon size={14} />
            <span>Buat Undangan</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary text-xs"
          >
            <UserPlus size={14} />
            <span>Tambah User</span>
          </button>
        </div>
      </div>

      {/* User Table Card */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, username, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
            />
          </div>
          <span className="text-xs text-slate-500">
            Total {total} akun terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Pengguna</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role / Peran</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-slate-900">{u.name}</td>
                    <td className="font-mono text-xs text-slate-600">@{u.username}</td>
                    <td className="text-slate-600">{u.email}</td>
                    <td>
                      <span className={`badge ${
                        u.role?.name === 'super_admin' ? 'badge-purple' : u.role?.name === 'admin' ? 'badge-blue' : 'badge-green'
                      }`}>
                        {u.role?.name || 'User'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">Aktif</span>
                    </td>
                    <td className="text-right">
                      {u.role?.name !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Pengguna"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Pengguna Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Budi Santoso"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="budi_ops"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="budi@simondb.demo"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className="input-field"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Peran</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                  className="select-field"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 btn-secondary justify-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 btn-primary justify-center"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Buat Undangan */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Buat Tautan Undangan</h3>
              <button
                onClick={() => { setIsInviteModalOpen(false); setGeneratedInvite(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {!generatedInvite ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Role untuk Akun yang Diundang</label>
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(parseInt(e.target.value))}
                    className="select-field"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="w-1/2 btn-secondary justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 btn-primary justify-center"
                  >
                    Generate Tautan
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-emerald-900">Tautan Berhasil Dibuat!</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.invitation_url}
                      className="input-field font-mono text-xs select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInvite.invitation_url)}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      title="Salin Tautan"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Tautan berlaku selama 7 hari untuk role <strong>{generatedInvite.role_name}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setGeneratedInvite(null)}
                  className="w-full btn-secondary justify-center"
                >
                  Buat Undangan Lain
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
