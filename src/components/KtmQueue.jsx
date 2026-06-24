import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';

const MAX_ANTREAN = 100;

export default function KtmQueue({ userRole }) {
  // Database states synchronized real-time
  const [data, setData] = useState(Array(MAX_ANTREAN).fill(null));
  const [frontIdx, setFrontIdx] = useState(0);
  const [rearIdx, setRearIdx] = useState(-1);
  const [count, setCount] = useState(0);

  // Form states
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [prodi, setProdi] = useState('');

  // Call history & temporary states
  const [panggilanAktif, setPanggilanAktif] = useState(null);
  const [logAktivitas, setLogAktivitas] = useState([]);
  const [toast, setToast] = useState(null);

  // Determine role permissions
  const hasAccess = userRole === 'baak_officer' || userRole === 'admin';
  const canReset = userRole === 'admin';

  // Listen to the queue changes in real-time
  useEffect(() => {
    const unsubscribe = dbService.subscribeKtmQueue((state) => {
      if (state) {
        if (state.data) setData(state.data);
        if (state.frontIdx !== undefined) setFrontIdx(state.frontIdx);
        if (state.rearIdx !== undefined) setRearIdx(state.rearIdx);
        if (state.count !== undefined) setCount(state.count);
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
    setLogAktivitas(prev => [{ time, message, type }, ...prev].slice(0, 10));
  };

  const isFull = count === MAX_ANTREAN;
  const isEmpty = count === 0;

  // Enqueue (Public / Admin)
  const handleTambahAntrean = async (e) => {
    e.preventDefault();
    if (!nama || !nim || !prodi) {
      showToast('Harap isi semua input!', 'error');
      return;
    }
    if (isFull()) {
      showToast('Antrean penuh! Mohon tunggu beberapa saat.', 'warning');
      return;
    }

    const newRearIdx = (rearIdx + 1) % MAX_ANTREAN;
    const newStudent = { nama, nim: parseInt(nim), prodi };
    
    const newData = [...data];
    newData[newRearIdx] = newStudent;
    
    // Sync to Db
    await dbService.updateKtmQueue({
      data: newData,
      rearIdx: newRearIdx,
      frontIdx,
      count: count + 1
    });

    addLog(`Mahasiswa ${nama} (NIM: ${nim}) berhasil mengambil nomor antrean.`, 'success');
    showToast(`Antrean berhasil dibuat untuk ${nama}`, 'success');

    // Reset form
    setNama('');
    setNim('');
    setProdi('');
  };

  // Panggil (Staff / Admin Only)
  const handlePanggilAntrean = () => {
    if (!hasAccess) return;
    if (isEmpty()) {
      showToast('Antrean kosong. Tidak ada mahasiswa yang menunggu.', 'warning');
      return;
    }
    const mhs = data[frontIdx];
    setPanggilanAktif(mhs);
    addLog(`Memanggil: ${mhs.nama} ke loket BAAK.`, 'info');
  };

  // Dequeue - Sudah Ambil KTM (Staff / Admin Only)
  const handleSelesaiAmbil = async () => {
    if (!hasAccess || !panggilanAktif) return;
    
    const mhs = panggilanAktif;
    const newData = [...data];
    newData[frontIdx] = null; // Clear from array
    
    await dbService.updateKtmQueue({
      data: newData,
      frontIdx: (frontIdx + 1) % MAX_ANTREAN,
      rearIdx,
      count: count - 1
    });
    
    addLog(`[SUKSES] ${mhs.nama} telah selesai mengambil KTM.`, 'success');
    showToast(`${mhs.nama} selesai mengambil KTM.`, 'success');
    setPanggilanAktif(null);
  };

  // Dequeue - Belum Hadir (Staff / Admin Only)
  const handleBelumHadir = async () => {
    if (!hasAccess || !panggilanAktif) return;
    
    const mhs = panggilanAktif;
    if (count === 1) {
      showToast(`Hanya ada 1 orang di antrean. Posisi ${mhs.nama} tetap di depan.`, 'info');
      return;
    }

    const tempFrontIdx = (frontIdx + 1) % MAX_ANTREAN;
    const tempRearIdx = (rearIdx + 1) % MAX_ANTREAN;
    const newData = [...data];
    newData[frontIdx] = null;
    newData[tempRearIdx] = mhs;

    await dbService.updateKtmQueue({
      data: newData,
      frontIdx: tempFrontIdx,
      rearIdx: tempRearIdx,
      count
    });
    
    addLog(`[INFO] ${mhs.nama} belum hadir. Antrean dipindahkan ke paling belakang.`, 'warning');
    showToast(`${mhs.nama} digeser ke paling belakang.`, 'info');
    setPanggilanAktif(null);
  };

  // Reset Queue (Admin Only)
  const handleResetQueue = async () => {
    if (!canReset) return;
    if (window.confirm("Apakah Anda yakin ingin mengosongkan antrean KTM?")) {
      await dbService.updateKtmQueue({
        data: Array(MAX_ANTREAN).fill(null),
        frontIdx: 0,
        rearIdx: -1,
        count: 0
      });
      setPanggilanAktif(null);
      addLog(`[SYSTEM] Antrean KTM direset oleh Administrator.`, 'warning');
      showToast(`Sistem loket berhasil dikosongkan.`, 'success');
    }
  };

  // Get active queue array for visualization
  const getQueueList = () => {
    const list = [];
    let current = frontIdx;
    for (let i = 0; i < count; i++) {
      if (data[current]) {
        list.push({ ...data[current], index: current });
      }
      current = (current + 1) % MAX_ANTREAN;
    }
    return list;
  };

  // Generate index mapping for visual ring (showing 12 slots for visual simplicity)
  const ringSize = 12;
  const ringSlots = Array(ringSize).fill(null).map((_, i) => {
    const mappedIdx = i;
    const item = data[mappedIdx];
    const isFront = count > 0 && frontIdx === mappedIdx;
    const isRear = count > 0 && rearIdx === mappedIdx;
    const isActive = item !== null;
    
    return {
      slot: i,
      item,
      isFront,
      isRear,
      isActive
    };
  });

  return (
    <div className="space-y-6 text-[#000000]">
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
            Sistem Antrean KTM BAAK
          </h2>
          <p className="text-[#55534e] text-xs font-mono-clay">Implementasi Circular Queue berbasis Array Statis (Maks. 100)</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-4 items-center">
          {canReset && (
            <button
              onClick={handleResetQueue}
              className="px-3 py-1.5 rounded-full border border-[#fc7981] text-[#fc7981] text-xs font-bold hover:bg-[#fc7981] hover:text-white transition-colors"
            >
              Reset Loket
            </button>
          )}
          <div className="px-4 py-2 rounded-xl bg-white border border-[#dad4c8]">
            <span className="text-[10px] text-[#55534e] block uppercase font-bold tracking-wider">Antrean Aktif</span>
            <span className="text-lg font-bold text-[#000000] font-outfit">{count} / {MAX_ANTREAN}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white border border-[#dad4c8]">
            <span className="text-[10px] text-[#55534e] block uppercase font-bold tracking-wider">Front Index</span>
            <span className="text-lg font-bold text-[#43089f] font-outfit">{frontIdx}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white border border-[#dad4c8]">
            <span className="text-[10px] text-[#55534e] block uppercase font-bold tracking-wider">Rear Index</span>
            <span className="text-lg font-bold text-[#fc7981] font-outfit">{rearIdx === -1 ? '-' : rearIdx}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form & Call Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Form Registrasi */}
          <div className="clay-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#000000] font-outfit">
              <svg className="w-5 h-5 text-[#43089f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Ambil Nomor Antrean (Enqueue)
            </h3>
            <form onSubmit={handleTambahAntrean} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#55534e] mb-1">NAMA MAHASISWA</label>
                <input
                  type="text"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className="w-full px-3 py-2 clay-input text-xs"
                  placeholder="Contoh: Afnan Aufa"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#55534e] mb-1">NIM MAHASISWA</label>
                <input
                  type="number"
                  value={nim}
                  onChange={e => setNim(e.target.value)}
                  className="w-full px-3 py-2 clay-input text-xs"
                  placeholder="Contoh: 25091011"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#55534e] mb-1">PRODI MAHASISWA</label>
                <input
                  type="text"
                  value={prodi}
                  onChange={e => setProdi(e.target.value)}
                  className="w-full px-3 py-2 clay-input text-xs"
                  placeholder="Contoh: S1 Informatika"
                />
              </div>
              <button
                type="submit"
                disabled={isFull}
                className="w-full clay-btn-playful clay-btn-playful-ube text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Daftar Antrean
              </button>
            </form>
          </div>

          {/* Panel Pemanggilan (Visible only to BAAK Officers or Admins) */}
          <div className="clay-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#000000] font-outfit">
              <svg className="w-5 h-5 text-[#078a52]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Panggilan Loket BAAK
            </h3>
            {!hasAccess ? (
              <div className="text-center py-6">
                <p className="text-xs text-[#55534e] font-semibold bg-[#eee9df] p-3 rounded-xl border border-[#dad4c8]">
                  Fitur ini dikunci. Silakan masuk sebagai **Petugas BAAK** atau **Admin** untuk mengoperasikan panggilan loket.
                </p>
              </div>
            ) : panggilanAktif ? (
              <div className="space-y-4">
                <div className="bg-[#eee9df] border border-[#dad4c8] rounded-2xl p-4 text-center">
                  <div className="text-[10px] text-[#43089f] font-bold uppercase tracking-wider mb-1">Sedang Dipanggil</div>
                  <div className="text-md font-bold text-[#000000] font-outfit mb-0.5">{panggilanAktif.nama}</div>
                  <div className="text-xs text-[#55534e]">NIM: {panggilanAktif.nim}</div>
                  <div className="text-[10px] text-[#9f9b93] font-bold mt-1 uppercase">{panggilanAktif.prodi}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSelesaiAmbil}
                    className="clay-btn-playful clay-btn-playful-matcha text-xs py-2"
                  >
                    Hadir & Ambil KTM
                  </button>
                  <button
                    onClick={handleBelumHadir}
                    className="clay-btn-playful clay-btn-playful-pomegranate text-xs py-2"
                  >
                    Belum Hadir (Geser ke Belakang)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <p className="text-xs text-[#55534e] font-medium">Tidak ada panggilan aktif saat ini.</p>
                <button
                  onClick={handlePanggilAntrean}
                  disabled={isEmpty}
                  className="clay-btn-playful clay-btn-playful-ube text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed w-full"
                >
                  Panggil Antrean Terdepan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visualizer Structure & List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Visualisasi Circular Ring (12 Slots) */}
          <div className="clay-card p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between text-[#000000] font-outfit">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#fc7981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                </svg>
                Visualisasi Circular Queue (Index 0-11)
              </span>
              <span className="text-[10px] text-[#9f9b93] font-mono-clay">Mempresentasikan Slot Array Sirkular</span>
            </h3>

            {/* Circular representation */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-64 h-64 rounded-full border-2 border-dashed border-[#dad4c8] flex items-center justify-center">
                
                {/* Center status */}
                <div className="text-center z-10 bg-white border border-[#dad4c8] shadow-sm rounded-full w-28 h-28 flex flex-col justify-center items-center">
                  <span className="text-[9px] text-[#55534e] uppercase font-bold tracking-wider">Ukuran</span>
                  <span className="text-2xl font-bold text-[#000000] font-outfit">{count}</span>
                  <span className="text-[9px] text-[#9f9b93] font-bold">MAHASISWA</span>
                </div>

                {/* Render 12 visual slots */}
                {ringSlots.map((slot, index) => {
                  const angle = (index * 360) / ringSize;
                  const radius = 100; //px
                  const x = radius * Math.cos((angle - 90) * Math.PI / 180);
                  const y = radius * Math.sin((angle - 90) * Math.PI / 180);

                  return (
                    <div
                      key={index}
                      className="absolute flex flex-col items-center justify-center transition-all duration-500"
                      style={{
                        transform: `translate(${x}px, ${y}px)`
                      }}
                    >
                      {/* Node circle */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 relative border ${
                        slot.isFront ? 'bg-[#c1b0ff] text-[#43089f] border-[#43089f] scale-110 shadow-md' :
                        slot.isRear ? 'bg-[#fc7981] text-black border-black scale-110 shadow-md' :
                        slot.isActive ? 'bg-[#84e7a5] text-[#02492a] border-[#078a52]' :
                        'bg-white text-[#9f9b93] border-[#dad4c8]'
                      }`}>
                        {index}

                        {/* Front/Rear label pointers */}
                        {slot.isFront && (
                          <span className="absolute -top-6 bg-[#43089f] text-[8px] text-white px-1 py-0.5 rounded font-bold uppercase tracking-wider font-mono-clay">
                            FRONT
                          </span>
                        )}
                        {slot.isRear && (
                          <span className="absolute -bottom-6 bg-[#fc7981] text-[8px] text-black border border-black px-1 py-0.5 rounded font-bold uppercase tracking-wider font-mono-clay">
                            REAR
                          </span>
                        )}
                      </div>

                      {/* Tooltip on active */}
                      {slot.isActive && (
                        <div className="absolute opacity-0 hover:opacity-100 bg-[#000000] text-white text-[9px] p-2 rounded-lg pointer-events-none whitespace-nowrap z-30 transition-opacity -translate-y-10 shadow-lg">
                          <p className="font-bold">{slot.item.nama}</p>
                          <p>NIM: {slot.item.nim}</p>
                          <p>{slot.item.prodi}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daftar Urutan Antrean */}
            <div className="clay-card p-5 h-80 flex flex-col">
              <h3 className="text-xs font-bold mb-3 text-[#000000] flex items-center justify-between font-outfit">
                <span>Daftar Tunggu Antrean</span>
                <span className="text-[10px] text-[#55534e] bg-[#eee9df] px-2.5 py-0.5 rounded font-bold">{count} Antre</span>
              </h3>
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {isEmpty ? (
                  <div className="h-full flex items-center justify-center text-[#9f9b93] text-xs py-10">
                    Tidak ada antrean mahasiswa saat ini.
                  </div>
                ) : (
                  getQueueList().map((item, idx) => (
                    <div
                      key={`${item.nim}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f7] border border-[#dad4c8] hover:border-black transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded bg-[#eee9df] flex items-center justify-center text-xs font-bold text-[#55534e]">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-black">{item.nama}</div>
                          <div className="text-[10px] text-[#55534e]">NIM: {item.nim} &bull; {item.prodi}</div>
                        </div>
                      </div>
                      <div className="text-[9px] bg-white border border-[#dad4c8] px-2 py-0.5 rounded font-mono-clay text-[#55534e] font-bold">
                        Slot {item.index}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Log Aktivitas */}
            <div className="clay-card p-5 h-80 flex flex-col">
              <h3 className="text-xs font-bold mb-3 text-[#000000] font-outfit">Log Aktivitas Antrean</h3>
              <div className="overflow-y-auto flex-1 space-y-2 font-mono-clay text-[10px] pr-1">
                {logAktivitas.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#9f9b93] text-xs py-10">
                    Belum ada aktivitas terekam.
                  </div>
                ) : (
                  logAktivitas.map((log, idx) => (
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
    </div>
  );
}
