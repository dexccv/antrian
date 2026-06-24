import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';

export default function AdminConsole() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await dbService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError('Gagal memuat daftar pengguna.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    
    // Refresh users list if db updates in demo mode
    const handleUpdate = () => loadUsers();
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await dbService.updateUserRole(userId, newRole);
      showToast(`Peran pengguna berhasil diperbarui ke: ${newRole}`, 'success');
      loadUsers();
    } catch (err) {
      showToast('Gagal memperbarui peran pengguna.', 'error');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-black">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-[#078a52] text-white' : 'bg-[#fc7981] text-black border border-black'
        }`}>
          <span className="font-semibold text-xs">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#dad4c8] pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000000] font-outfit">
            Admin Management Console
          </h2>
          <p className="text-[#55534e] text-xs font-mono-clay">Alokasi Peran, Persetujuan Akun, dan Manajemen Pengguna Instansi</p>
        </div>
        <button
          onClick={loadUsers}
          className="mt-3 md:mt-0 clay-btn-playful text-xs py-1.5 px-4"
        >
          Muat Ulang Data
        </button>
      </div>

      <div className="clay-card p-6 bg-white border border-[#dad4c8]">
        <h3 className="text-sm font-bold mb-4 font-outfit text-black flex items-center gap-2">
          <svg className="w-5 h-5 text-[#43089f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Daftar Petugas Layanan & Pengaturan Hak Akses
        </h3>

        {loading ? (
          <div className="text-center py-10 text-xs text-[#55534e] font-semibold">
            Memuat data pengguna...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-xs text-[#fc7981] font-bold">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#9f9b93]">
            Belum ada petugas terdaftar di database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#dad4c8] text-[#55534e] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Peran Saat Ini (Role)</th>
                  <th className="py-3 px-4 text-right">Alokasi Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9df]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#faf9f7] transition-colors text-xs text-black">
                    <td className="py-3.5 px-4 font-bold">{u.name || "Petugas Layanan"}</td>
                    <td className="py-3.5 px-4 font-mono-clay text-[#55534e]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                        u.role === 'admin' ? 'bg-[#fc7981]/20 text-black border border-[#fc7981]/30' :
                        u.role === 'doctor' ? 'bg-[#84e7a5]/20 text-[#078a52] border border-[#84e7a5]/30' :
                        u.role === 'cashier' ? 'bg-[#fbbd41]/20 text-[#d08a11] border border-[#fbbd41]/30' :
                        u.role === 'baak_officer' ? 'bg-[#c1b0ff]/20 text-[#43089f] border border-[#c1b0ff]/30' :
                        'bg-slate-200 text-slate-500 border border-slate-300'
                      }`}>
                        {u.role === 'pending_approval' ? 'MENUNGGU DISETUJUI' : u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1.5 border border-[#dad4c8] rounded-xl text-xs bg-white font-semibold focus:outline-none focus:border-black cursor-pointer"
                      >
                        <option value="pending_approval">Tangguhkan (Pending)</option>
                        <option value="baak_officer">Petugas BAAK (KTM)</option>
                        <option value="cashier">Kasir Klinik</option>
                        <option value="doctor">Dokter Klinik</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
