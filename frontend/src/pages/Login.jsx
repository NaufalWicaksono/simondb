import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Database, Eye, EyeOff, LogIn, AlertCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPw,  setShowPw]        = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Identifier dan password harus diisi.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Login gagal. Periksa kembali identifier dan password.');
      }

      login(data.access_token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Koneksi ke backend gagal. Pastikan backend aktif di port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Decorative Hero Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-r border-emerald-500/10 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">SiMonDB Demo</h1>
            <p className="text-xs text-emerald-400 font-semibold">Enterprise Platform</p>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles size={14} />
            Enterprise Supply Chain & Logistics Monitoring
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Monitoring Jaringan <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Logistik & Distribusi Nasional.
            </span>
          </h2>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-md">
            Eksplorasi data operasional di 38 provinsi, query builder dinamis, analisis sebaran geospasial interaktif, dan ekspor multi-format dengan database terintegrasi.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-3 mt-8 max-w-md">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-emerald-400 block mb-1">⚡ High Performance</span>
              Berjalan instan dengan efisiensi pemrosesan tinggi.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-emerald-400 block mb-1">🗺️ 38 Provinsi</span>
              1,300+ data fasilitas dengan koordinat akurat.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          SiMonDB Demo Edition &copy; {new Date().getFullYear()} — Siap Dipublikasikan
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang</h2>
            <p className="text-sm text-slate-500 mt-1">
              Masuk ke akun SiMonDB untuk mengakses dashboard analitik.
            </p>
          </div>


          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email atau Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nama@domain.com atau username"
                className="input-field"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5 shadow-sm"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            Punya token undangan pendaftaran?{' '}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Daftar via Undangan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
