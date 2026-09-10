import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Database, UserPlus, AlertCircle, CheckCircle, Shield } from 'lucide-react';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token.trim()) {
      setIsValidatingToken(true);
      fetch(`${BASE_URL}/invitations/validate/${token.trim()}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Token tidak valid');
          setTokenInfo(data);
          setError('');
        })
        .catch((err) => {
          setTokenInfo(null);
          setError(err.message || 'Token undangan tidak valid atau telah kedaluwarsa.');
        })
        .finally(() => setIsValidatingToken(false));
    }
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Token undangan wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/invitations/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registrasi gagal.');

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-600 items-center justify-center shadow-md mb-3">
            <Database size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Registrasi Akun SiMonDB</h1>
          <p className="text-xs text-slate-500 mt-1">Daftar menggunakan token undangan resmi</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-700">
            <CheckCircle size={16} className="shrink-0" />
            <span>Akun berhasil didaftarkan! Mengarahkan ke halaman login...</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Token Undangan</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Masukkan kode token undangan"
              className="input-field font-mono"
              required
            />
            {tokenInfo && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <Shield size={12} /> Role Terhubung: {tokenInfo.role_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username_anda"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@perusahaan.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="input-field"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || isValidatingToken}
            className="w-full btn-primary justify-center py-2.5"
          >
            {loading ? 'Memproses...' : (
              <>
                <UserPlus size={16} />
                <span>Daftar Sekarang</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
            Masuk ke Akun
          </Link>
        </div>
      </div>
    </div>
  );
}
