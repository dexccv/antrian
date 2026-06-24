import React, { useState } from 'react';
import { dbService } from '../dbService';
import { isDemoMode } from '../firebase';

export default function Login({ onLoginSuccess, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('baak_officer');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError('Harap lengkapi seluruh kolom input.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Register flow
        const session = await dbService.register(email, password, name, role);
        onLoginSuccess(session);
      } else {
        // Login flow
        const session = await dbService.login(email, password);
        onLoginSuccess(session);
      }
    } catch (err) {
      setError(err.message || 'Proses gagal. Silakan periksa kembali.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('admin123');
    setIsSignUp(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="clay-card p-6 md:p-8 max-w-md w-full relative bg-white border border-[#dad4c8] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full border border-[#dad4c8] hover:bg-[#faf9f7] transition-colors"
          aria-label="Tutup"
        >
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#000000] flex items-center justify-center font-bold text-white shadow-md mx-auto mb-3">
            Q
          </div>
          <h2 className="text-2xl font-bold font-outfit text-black">
            {isSignUp ? 'Daftar Akun Baru' : 'Sign In Petugas'}
          </h2>
          <p className="text-xs text-[#55534e] mt-1">
            {isSignUp ? 'Buat kredensial login petugas layanan' : 'Masuk untuk mengelola sistem antrean instansi'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#fc7981]/20 border border-[#fc7981]/40 rounded-xl text-xs text-black font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-[#55534e] mb-1">NAMA LENGKAP</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 clay-input text-xs"
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#55534e] mb-1">EMAIL PETUGAS</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 clay-input text-xs"
              placeholder="nama@instansi.com"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#55534e] mb-1">KATA SANDI</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 clay-input text-xs"
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-[#55534e] mb-1">PILIH PERAN (ROLE)</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 clay-input text-xs bg-white"
              >
                <option value="baak_officer">Petugas BAAK (Layanan KTM)</option>
                <option value="cashier">Kasir Klinik (Administrasi RS)</option>
                <option value="doctor">Dokter Klinik (Pemeriksaan RS)</option>
                <option value="admin">Super Admin (Akses Global)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full clay-btn-playful clay-btn-playful-matcha text-xs py-2.5 font-bold disabled:opacity-50"
          >
            {loading ? 'Memproses...' : isSignUp ? 'Daftar & Masuk' : 'Masuk Log Loket'}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-xs text-[#43089f] font-semibold hover:underline"
          >
            {isSignUp ? 'Sudah punya akun? Sign In' : 'Belum punya akun petugas? Daftar di sini'}
          </button>
        </div>

        {/* Demo Accounts Panel (Only show on Login mode for simplicity) */}
        {!isSignUp && (
          <div className="mt-6 border-t border-[#eee9df] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#55534e] tracking-wider uppercase">Akun Demo (Password: admin123)</span>
              {isDemoMode && (
                <span className="bg-[#84e7a5]/30 text-[#078a52] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono-clay">Offline Active</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectDemoUser('admin@queuehub.com')}
                className="p-2 text-left bg-[#faf9f7] hover:bg-[#eee9df] border border-[#dad4c8] rounded-xl transition-colors"
              >
                <p className="text-[10px] font-bold text-black">Super Admin</p>
                <p className="text-[8px] text-[#55534e] truncate">admin@queuehub.com</p>
              </button>
              <button
                onClick={() => handleSelectDemoUser('baak@queuehub.com')}
                className="p-2 text-left bg-[#faf9f7] hover:bg-[#eee9df] border border-[#dad4c8] rounded-xl transition-colors"
              >
                <p className="text-[10px] font-bold text-black">Petugas BAAK</p>
                <p className="text-[8px] text-[#55534e] truncate">baak@queuehub.com</p>
              </button>
              <button
                onClick={() => handleSelectDemoUser('kasir@queuehub.com')}
                className="p-2 text-left bg-[#faf9f7] hover:bg-[#eee9df] border border-[#dad4c8] rounded-xl transition-colors"
              >
                <p className="text-[10px] font-bold text-black">Kasir Klinik</p>
                <p className="text-[8px] text-[#55534e] truncate">kasir@queuehub.com</p>
              </button>
              <button
                onClick={() => handleSelectDemoUser('dokter@queuehub.com')}
                className="p-2 text-left bg-[#faf9f7] hover:bg-[#eee9df] border border-[#dad4c8] rounded-xl transition-colors"
              >
                <p className="text-[10px] font-bold text-black">Dokter Klinik</p>
                <p className="text-[8px] text-[#55534e] truncate">dokter@queuehub.com</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
