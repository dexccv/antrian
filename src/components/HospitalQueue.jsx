import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';

class PasienNode {
  constructor(id, nama, keluhan, status = 'BELUM') {
    this.id = id;
    this.nomerAntri = 0;
    this.nama = nama;
    this.keluhan = keluhan;
    this.statusBayar = status;
  }
}

export default function HospitalQueue({ userRole }) {
  // Database states synchronized real-time
  const [pasienList, setPasienList] = useState([]);
  const [sedangDiperiksa, setSedangDiperiksa] = useState(null);
  const [noRegCounter, setNoRegCounter] = useState(1);
  const [nomerAntreSistem, setNomerAntreSistem] = useState(1);

  // Form states
  const [namaInput, setNamaInput] = useState('');
  const [keluhanInput, setKeluhanInput] = useState('');
  const [idBayarInput, setIdBayarInput] = useState('');
  const [cariIdInput, setCariIdInput] = useState('');

  // Results & Logs
  const [searchResult, setSearchResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // Enforce role actions & view permissions
  const isCashier = userRole === 'cashier' || userRole === 'admin';
  const isDoctor = userRole === 'doctor' || userRole === 'admin';
  const isSuperAdmin = userRole === 'admin';
  // Staff who are allowed to see full names & medical complaints
  const isStaff = userRole === 'cashier' || userRole === 'doctor' || userRole === 'admin';

  // Listen to the hospital queue changes in real-time
  useEffect(() => {
    const unsubscribe = dbService.subscribeHospitalQueue((state) => {
      if (state) {
        if (state.pasienList) setPasienList(state.pasienList);
        if (state.sedangDiperiksa !== undefined) setSedangDiperiksa(state.sedangDiperiksa);
        if (state.noRegCounter !== undefined) setNoRegCounter(state.noRegCounter);
        if (state.nomerAntreSistem !== undefined) setNomerAntreSistem(state.nomerAntreSistem);
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message, type }, ...prev].slice(0, 10));
  };

  // Helper to mask names for visitor privacy protection
  const maskName = (fullname) => {
    if (!fullname) return "";
    const parts = fullname.trim().split(" ");
    return parts.map(part => {
      if (part.length <= 2) return part;
      return part[0] + part[1] + "*".repeat(part.length - 2);
    }).join(" ");
  };

  // Helper to update all queue variables in Firestore
  const syncWithDatabase = async (updatedList, updatedCheckup = sedangDiperiksa, updatedRegCounter = noRegCounter, updatedQueueCounter = nomerAntreSistem) => {
    await dbService.updateHospitalQueue({
      pasienList: updatedList,
      sedangDiperiksa: updatedCheckup,
      noRegCounter: updatedRegCounter,
      nomerAntreSistem: updatedQueueCounter
    });
  };

  // 1. Registrasi Pasien Baru (Tambah Antrian) - Public / Admin
  const handleRegistrasi = async (e) => {
    e.preventDefault();
    if (!namaInput || !keluhanInput) {
      showToast('Harap lengkapi nama dan keluhan pasien!', 'error');
      return;
    }

    const regId = `REG-${noRegCounter}`;
    const newPasien = new PasienNode(regId, namaInput, keluhanInput);
    const updatedList = [...pasienList, { ...newPasien }];
    
    await syncWithDatabase(updatedList, sedangDiperiksa, noRegCounter + 1, nomerAntreSistem);

    addLog(`Nomor antrean berhasil diambil oleh pasien.`, 'success');
    showToast(`Registrasi sukses! ID: ${regId}`, 'success');

    setNamaInput('');
    setKeluhanInput('');
  };

  // 2. Pembayaran Kasir (Ubah Status Bayar) - Cashier / Admin Only
  const handleBayarKasir = async (e) => {
    e.preventDefault();
    if (!isCashier) return;
    if (!idBayarInput) return;

    const targetId = idBayarInput.trim().toUpperCase();
    const idx = pasienList.findIndex(p => p.id === targetId);

    if (idx === -1) {
      showToast(`Pasien dengan ID ${targetId} tidak ditemukan.`, 'error');
      return;
    }

    const targetPasien = pasienList[idx];
    if (targetPasien.statusBayar === 'SUDAH') {
      showToast(`Pasien sudah melunasi pembayaran.`, 'warning');
      return;
    }

    const updatedList = [...pasienList];
    updatedList[idx].statusBayar = 'SUDAH';
    updatedList[idx].nomerAntri = nomerAntreSistem;
    
    await syncWithDatabase(updatedList, sedangDiperiksa, noRegCounter, nomerAntreSistem + 1);

    addLog(`[KASIR] Pembayaran ID ${targetId} lunas. Nomor Antrean Dokter diterbitkan.`, 'success');
    showToast(`Pembayaran sukses! Nomor Dokter: ${nomerAntreSistem}`, 'success');

    setIdBayarInput('');
  };

  // 3. Panggil Pasien (Dokter) - Doctor / Admin Only
  const handlePanggilPasien = async () => {
    if (!isDoctor) return;
    
    let activeCheckup = sedangDiperiksa;
    if (activeCheckup) {
      addLog(`== [DOKTER] PEMERIKSAAN SELESAI == Sesi periksa pasien telah selesai.`, 'info');
      activeCheckup = null;
    }

    if (pasienList.length === 0) {
      await syncWithDatabase([], null, noRegCounter, nomerAntreSistem);
      showToast('Ruang tunggu kosong. Tidak ada pasien.', 'warning');
      return;
    }

    const frontPasien = pasienList[0];

    // Validasi status bayar (Auto-skip logic)
    if (frontPasien.statusBayar === 'BELUM') {
      showToast(`[WARNING] Pasien belum melunasi administrasi!`, 'error');
      addLog(`[WARNING] Panggilan ditolak. Antrean pasien digeser ke belakang karena belum bayar.`, 'warning');
      
      if (pasienList.length > 1) {
        const shiftedList = [...pasienList.slice(1), frontPasien];
        await syncWithDatabase(shiftedList, null, noRegCounter, nomerAntreSistem);
      }
      return;
    }

    // Call success
    addLog(`Panggilan dokter: Nomor Antrean ${frontPasien.nomerAntri} silakan masuk ke Ruang Dokter.`, 'info');
    
    const remainingList = pasienList.slice(1);
    await syncWithDatabase(remainingList, frontPasien, noRegCounter, nomerAntreSistem);
  };

  // 4. Batalkan / Hapus Node Pasien (Super Admin Only)
  const handleHapusPasien = async (idToCancel) => {
    if (!isSuperAdmin) return;
    if (window.confirm(`Apakah Anda yakin ingin membatalkan antrean ${idToCancel}?`)) {
      const updatedList = pasienList.filter(p => p.id !== idToCancel);
      await syncWithDatabase(updatedList, sedangDiperiksa, noRegCounter, nomerAntreSistem);
      addLog(`[CANCEL] Antrean ${idToCancel} dibatalkan oleh Administrator.`, 'warning');
      showToast(`Antrean ${idToCancel} berhasil dibatalkan.`, 'success');
    }
  };

  // 5. Reset Clinic (Super Admin Only)
  const handleResetKlinik = async () => {
    if (!isSuperAdmin) return;
    if (window.confirm("Apakah Anda yakin ingin mengosongkan antrean Klinik?")) {
      await dbService.updateHospitalQueue({
        pasienList: [],
        sedangDiperiksa: null,
        nomerAntreSistem: 1,
        noRegCounter: 1
      });
      addLog(`[SYSTEM] Antrean klinik direset oleh Administrator.`, 'warning');
      showToast(`Sistem klinik berhasil dikosongkan.`, 'success');
    }
  };

  // 6. Cari Pasien
  const handleCariPasien = (e) => {
    e.preventDefault();
    if (!cariIdInput) return;

    const targetId = cariIdInput.trim().toUpperCase();
    
    if (sedangDiperiksa && sedangDiperiksa.id === targetId) {
      setSearchResult({
        pasien: sedangDiperiksa,
        lokasi: 'RUANG DOKTER (Sedang Diperiksa)'
      });
      return;
    }

    const idx = pasienList.findIndex(p => p.id === targetId);
    if (idx !== -1) {
      setSearchResult({
        pasien: pasienList[idx],
        lokasi: `RUANG TUNGGU (Antrean ke-${idx + 1})`
      });
    } else {
      setSearchResult({
        error: `Pasien dengan ID "${targetId}" tidak ditemukan.`
      });
    }
  };

  return (
    <div className="space-y-6 text-black">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-[#078a52] text-white' : 
          toast.type === 'error' ? 'bg-[#fc7981] text-black border border-black' : 'bg-[#fbbd41] text-black border border-black'
        }`}>
          <span className="font-semibold text-xs">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#dad4c8] pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000000] font-outfit">
            Sistem Antrean Rumah Sakit
          </h2>
          <p className="text-[#55534e] text-xs font-mono-clay">Implementasi FIFO Queue berbasis Dynamic Single Linked List</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-4 items-center">
          {isSuperAdmin && (
            <button
              onClick={handleResetKlinik}
              className="px-3 py-1.5 rounded-full border border-[#fc7981] text-[#fc7981] text-xs font-bold hover:bg-[#fc7981] hover:text-white transition-colors"
            >
              Reset Klinik
            </button>
          )}
          <div className="px-4 py-2 rounded-xl bg-white border border-[#dad4c8]">
            <span className="text-[10px] text-[#55534e] block uppercase font-bold tracking-wider">Di Ruang Tunggu</span>
            <span className="text-lg font-bold text-[#000000] font-outfit">{pasienList.length} Pasien</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white border border-[#dad4c8]">
            <span className="text-[10px] text-[#55534e] block uppercase font-bold tracking-wider">Sedang Diperiksa</span>
            <span className="text-lg font-bold text-[#078a52] font-outfit">{sedangDiperiksa ? '1 Pasien' : 'Kosong'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Forms column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Form Registrasi Pasien */}
          <div className="clay-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#000000] font-outfit">
              <svg className="w-5 h-5 text-[#078a52]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5m4 0H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              </svg>
              Registrasi Pasien Baru
            </h3>
            <form onSubmit={handleRegistrasi} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#55534e] mb-1">NAMA PASIEN</label>
                <input
                  type="text"
                  value={namaInput}
                  onChange={e => setNamaInput(e.target.value)}
                  className="w-full px-3 py-2 clay-input text-xs"
                  placeholder="Contoh: Gilang Bagus"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#55534e] mb-1">KELUHAN MEDIS</label>
                <textarea
                  value={keluhanInput}
                  onChange={e => setKeluhanInput(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 clay-input text-xs resize-none"
                  placeholder="Keluhan medis..."
                />
              </div>
              <button
                type="submit"
                className="w-full clay-btn-playful clay-btn-playful-matcha text-xs py-2"
              >
                Daftarkan Pasien
              </button>
            </form>
          </div>

          {/* Loket Pembayaran Kasir */}
          <div className="clay-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#000000] font-outfit">
              <svg className="w-5 h-5 text-[#d08a11]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Loket Administrasi & Kasir
            </h3>
            {!isCashier ? (
              <div className="text-center py-4">
                <p className="text-[11px] text-[#55534e] font-semibold bg-[#eee9df] p-3 rounded-xl border border-[#dad4c8]">
                  Menu terkunci. Silakan masuk sebagai **Kasir** atau **Admin** untuk memproses pembayaran.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBayarKasir} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#55534e] mb-1">ID REGISTRASI PASIEN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={idBayarInput}
                      onChange={e => setIdBayarInput(e.target.value)}
                      className="flex-1 px-3 py-2 clay-input text-xs"
                      placeholder="Contoh: REG-1"
                    />
                    <button
                      type="submit"
                      className="clay-btn-playful clay-btn-playful-matcha text-xs py-2 px-4 shrink-0"
                    >
                      Bayar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Cari Pasien */}
          <div className="clay-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#000000] font-outfit">
              <svg className="w-5 h-5 text-[#55534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Pencarian Data Pasien
            </h3>
            <form onSubmit={handleCariPasien} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cariIdInput}
                  onChange={e => setCariIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 clay-input text-xs"
                  placeholder="ID Pasien..."
                />
                <button
                  type="submit"
                  className="clay-btn-playful text-xs py-2 px-4 shrink-0"
                >
                  Cari
                </button>
              </div>
            </form>

            {searchResult && (
              <div className="mt-3 p-3 rounded-xl bg-[#faf9f7] border border-[#dad4c8] text-xs space-y-1.5">
                {searchResult.error ? (
                  <p className="text-[#fc7981] font-bold">{searchResult.error}</p>
                ) : (
                  <>
                    <p className="text-[#078a52] font-extrabold font-outfit">Data Ditemukan!</p>
                    <p><span className="text-[#55534e] font-bold">Nama:</span> {isStaff ? searchResult.pasien.nama : maskName(searchResult.pasien.nama)}</p>
                    <p><span className="text-[#55534e] font-bold">ID Reg:</span> {searchResult.pasien.id}</p>
                    <p><span className="text-[#55534e] font-bold">Antrean:</span> {searchResult.pasien.statusBayar === 'SUDAH' ? searchResult.pasien.nomerAntri : 'Belum Bayar (Ke Kasir)'}</p>
                    {isStaff && (
                      <p><span className="text-[#55534e] font-bold">Keluhan:</span> {searchResult.pasien.keluhan}</p>
                    )}
                    <p className="text-[10px] bg-[#eee9df] px-2 py-0.5 rounded inline-block font-bold text-[#55534e] mt-1">{searchResult.lokasi}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visualizer & Queue list */}
        <div className="lg:col-span-8 space-y-6">
          {/* Visual Linked List Chain */}
          <div className="clay-card p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between text-[#000000] font-outfit">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#078a52]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Struktur Single Linked List (Pasien Node)
              </span>
            </h3>

            {/* Doctor Room Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Doctor Room Box */}
              <div className="flex-1 bg-[#84e7a5]/10 border border-[#84e7a5]/50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-[#078a52] font-bold uppercase tracking-wider block mb-0.5 font-mono-clay">Ruang Periksa Dokter</span>
                  {sedangDiperiksa ? (
                    <div>
                      <span className="text-md font-bold text-black font-outfit block">
                        {isStaff ? sedangDiperiksa.nama : maskName(sedangDiperiksa.nama)}
                      </span>
                      <span className="text-xs text-[#55534e]">ID: {sedangDiperiksa.id} &bull; No. Antrean Dokter: {sedangDiperiksa.nomerAntri}</span>
                      {isStaff && (
                        <p className="text-[11px] text-[#55534e] mt-1 font-semibold">Keluhan: {sedangDiperiksa.keluhan}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[#9f9b93] font-medium">Tidak ada pasien di dalam ruang dokter.</span>
                  )}
                </div>
                {isDoctor ? (
                  <button
                    onClick={handlePanggilPasien}
                    className="clay-btn-playful clay-btn-playful-matcha text-xs py-2"
                  >
                    Panggil Dokter
                  </button>
                ) : (
                  <span className="text-[10px] text-[#55534e] bg-[#eee9df] px-2.5 py-1 rounded-full font-bold font-outfit">
                    Panggilan Dokter (Terkunci)
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Node rendering */}
            <div className="p-4 bg-[#faf9f7] border border-[#dad4c8] rounded-2xl overflow-x-auto">
              <div className="flex items-center space-x-4 min-w-max py-4">
                {/* HEAD Pointer */}
                <div className="flex flex-col items-center">
                  <div className="bg-black text-[9px] text-white px-2 py-0.5 rounded font-mono-clay font-bold mb-1">HEAD</div>
                  <div className="w-0.5 h-6 bg-black"></div>
                </div>

                {pasienList.length === 0 ? (
                  <div className="text-xs text-[#9f9b93] pl-4 font-medium">Linked List Kosong (NULL)</div>
                ) : (
                  pasienList.map((pasien, idx) => (
                    <React.Fragment key={pasien.id}>
                      {/* Node Box */}
                      <div className={`p-3 rounded-xl border transition-all duration-300 w-44 bg-white relative ${
                        pasien.statusBayar === 'SUDAH' 
                          ? 'border-[#078a52] shadow-sm shadow-[#84e7a5]/20' 
                          : 'border-[#dad4c8]'
                      }`}>
                        
                        {/* Cancel node button for super admins */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleHapusPasien(pasien.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#fc7981] hover:bg-red-600 border border-black flex items-center justify-center text-[9px] font-bold text-black"
                            title="Batalkan Antrean Pasien"
                          >
                            &times;
                          </button>
                        )}

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] bg-[#eee9df] text-[#55534e] px-1.5 py-0.5 rounded font-mono-clay font-bold">
                            {pasien.id}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                            pasien.statusBayar === 'SUDAH' 
                              ? 'bg-[#84e7a5]/20 text-[#078a52] border border-[#84e7a5]/30' 
                              : 'bg-[#fc7981]/20 text-black border border-[#fc7981]/30'
                          }`}>
                            {pasien.statusBayar}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-black truncate">
                          {isStaff ? pasien.nama : maskName(pasien.nama)}
                        </div>
                        {isStaff && (
                          <div className="text-[10px] text-[#55534e] mt-1 truncate">Klh: {pasien.keluhan}</div>
                        )}
                        <div className="text-[8px] text-[#9f9b93] font-mono-clay mt-2 pt-1 border-t border-[#dad4c8]/50 flex justify-between">
                          <span>Next:</span>
                          <span className="font-bold text-[#000000]">{idx === pasienList.length - 1 ? 'NULL' : pasienList[idx+1].id}</span>
                        </div>
                      </div>

                      {/* Linked list arrow */}
                      {idx !== pasienList.length - 1 && (
                        <div className="flex items-center text-[#dad4c8] font-bold text-lg">
                          &rarr;
                        </div>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="clay-card p-5 h-64 flex flex-col">
            <h3 className="text-xs font-bold mb-3 text-[#000000] font-outfit">Log Aktivitas Rumah Sakit</h3>
            <div className="overflow-y-auto flex-1 space-y-2 font-mono-clay text-[10px] pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#9f9b93] text-xs py-10">
                  Belum ada aktivitas terekam.
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="border-b border-[#eee9df] pb-2 text-[#55534e]">
                    <span className="text-[#9f9b93] font-bold">[{log.time}]</span>{' '}
                    <span className={
                      log.type === 'success' ? 'text-[#078a52] font-semibold' :
                      log.type === 'warning' ? 'text-[#d08a11] font-semibold' : 'text-black'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
