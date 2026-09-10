import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Permintaan gagal.');

      navigate(`/reset-password?email=${encodeURIComponent(email)}&debug_otp=${data.debug_otp || ''}`);
    } catch (err) {
      setError(err.message || 'Gagal memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-600 items-center justify-center shadow-md mb-3">
            <KeyRound size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Lupa Password</h1>
          <p className="text-xs text-slate-500 mt-1">Masukkan email terdaftar untuk menerima OTP reset password</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Terdaftar</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@simondb.demo"
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-2.5"
          >
            {loading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-600 font-semibold">
            <ArrowLeft size={14} /> Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
