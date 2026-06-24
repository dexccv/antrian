import React, { useState, useEffect } from 'react';
import KtmQueue from './components/KtmQueue';
import HospitalQueue from './components/HospitalQueue';
import Login from './components/Login';
import { dbService } from './dbService';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Subscribe to Authentication state changes (real-time)
  useEffect(() => {
    const unsubscribe = dbService.subscribeAuth((session) => {
      setCurrentUser(session);
    });
    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleLogout = async () => {
    try {
      await dbService.logout();
      setCurrentUser(null);
      setActiveTab('overview');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf9f7] text-[#000000] font-sans overflow-x-hidden">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-[#ffffff] border-b border-[#dad4c8] sticky top-0 z-30 shadow-sm w-full">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#000000] flex items-center justify-center font-bold text-white shadow-md">
            Q
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-[#000000] font-outfit uppercase">Queue Hub</h1>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg border border-[#dad4c8] hover:bg-[#faf9f7] transition-colors"
          aria-label="Toggle Menu"
        >
          <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Nav */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#ffffff] border-r border-[#dad4c8] flex flex-col z-50 transform transition-transform duration-300 md:static md:translate-x-0 shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand/Title */}
        <div className="p-6 border-b border-[#dad4c8] hidden md:block">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#000000] flex items-center justify-center font-bold text-white shadow-md">
              Q
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-[#000000] font-outfit uppercase">Queue Hub</h1>
              <span className="text-[10px] text-[#55534e] block font-semibold">Struktur Data Kelompok 2</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => handleNavClick('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-[#eee9df] text-[#000000] font-bold border border-[#dad4c8]'
                : 'text-[#55534e] hover:bg-[#faf9f7] hover:text-[#000000]'
            }`}
          >
            <svg className="w-5 h-5 text-[#55534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span className="font-outfit">Overview</span>
          </button>

          <button
            onClick={() => handleNavClick('ktm')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'ktm'
                ? 'bg-[#c1b0ff]/30 text-[#43089f] font-bold border border-[#c1b0ff]/50'
                : 'text-[#55534e] hover:bg-[#faf9f7] hover:text-[#000000]'
            }`}
          >
            <svg className="w-5 h-5 text-[#43089f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="font-outfit">Layanan KTM BAAK</span>
          </button>

          <button
            onClick={() => handleNavClick('hospital')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'hospital'
                ? 'bg-[#84e7a5]/30 text-[#078a52] font-bold border border-[#84e7a5]/50'
                : 'text-[#55534e] hover:bg-[#faf9f7] hover:text-[#000000]'
            }`}
          >
            <svg className="w-5 h-5 text-[#078a52]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-outfit">Layanan Antrean Klinik</span>
          </button>
        </nav>

        {/* User Account / Auth Section in Sidebar */}
        <div className="p-4 border-t border-[#dad4c8] bg-[#faf9f7] space-y-3">
          {currentUser ? (
            <div className="space-y-2">
              <div className="p-3 bg-white border border-[#dad4c8] rounded-xl text-xs space-y-1">
                <p className="font-bold text-black truncate">{currentUser.name}</p>
                <div className="flex justify-between items-center text-[9px] font-mono-clay text-[#55534e]">
                  <span className="uppercase bg-[#eee9df] px-1.5 py-0.5 rounded font-bold">{currentUser.role}</span>
                  <span className="truncate max-w-[80px]">{currentUser.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 border border-black rounded-full text-xs font-bold font-outfit hover:bg-black hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2.5 bg-black text-white rounded-full text-xs font-bold font-outfit hover:bg-slate-800 transition-colors shadow-sm"
            >
              Sign In Petugas
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="h-16 border-b border-[#dad4c8] items-center justify-between px-8 bg-[#ffffff] shrink-0 hidden md:flex">
          <div className="text-xs font-bold text-[#55534e] tracking-wide uppercase font-mono-clay">
            SISTEM ANTRIAN INTEGRASI LOKAL &bull; PERSISTENCE DATA
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#078a52]"></span>
            <span className="text-xs font-bold text-[#000000]">System Connected</span>
          </div>
        </header>

        {/* Main Panel Content */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              {/* Welcome banner */}
              <div className="clay-card p-6 md:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#faf9f7] via-[#ffffff] to-[#eee9df] border-[#dad4c8]">
                <div className="max-w-2xl relative z-10">
                  <span className="text-xs text-[#078a52] uppercase font-bold tracking-widest block mb-2 font-mono-clay">Real-Time Database Synchronized</span>
                  <h2 className="text-2xl md:text-4xl font-bold text-[#000000] font-outfit mb-3 md:mb-4 tracking-tight leading-tight">
                    Aplikasi Dashboard Antrean Mahasiswa & Pasien RS
                  </h2>
                  <p className="text-[#55534e] text-xs md:text-sm leading-relaxed mb-6 font-medium">
                    Selamat datang di Queue Hub. Aplikasi ini dirancang berdasarkan konsep struktur data sirkular dan linked list yang disinkronkan langsung ke database Firebase. Silakan pilih menu layanan di samping untuk mencoba simulasi.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setActiveTab('ktm')}
                      className="clay-btn-playful clay-btn-playful-ube text-xs py-2.5 w-full sm:w-auto"
                    >
                      Buka Antrean KTM BAAK
                    </button>
                    <button
                      onClick={() => setActiveTab('hospital')}
                      className="clay-btn-playful clay-btn-playful-matcha text-xs py-2.5 w-full sm:w-auto"
                    >
                      Buka Antrean Rumah Sakit
                    </button>
                  </div>
                </div>
              </div>

              {/* Developer profiles */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#000000] font-outfit">Sistem Layanan Terintegrasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* BAAK Service Card */}
                  <div className="clay-card p-5 md:p-6 rounded-2xl flex flex-col justify-between hover:border-[#000000] transition-colors">
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#c1b0ff]/30 border border-[#c1b0ff]/50 flex items-center justify-center text-[#43089f] font-bold">
                          BK
                        </div>
                        <div>
                          <h4 className="text-sm md:text-md font-bold text-[#000000] font-outfit">Layanan Loket KTM BAAK</h4>
                          <span className="text-[9px] text-[#55534e] font-mono-clay font-bold">Role Petugas: BAAK Officer / Admin</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#55534e] leading-relaxed mb-6">
                        Sistem antrean pengambilan Kartu Tanda Mahasiswa (KTM) di loket BAAK. Berjalan berdasarkan data struktur **Circular Queue** untuk rollover indeks dan penghematan memori array.
                      </p>
                    </div>
                    <div className="border-t border-[#eee9df] pt-4 flex items-center justify-between text-xs text-[#55534e]">
                      <span className="font-mono-clay text-[9px] bg-[#eee9df] px-2 py-0.5 rounded">CIRCULAR QUEUE</span>
                      <button onClick={() => setActiveTab('ktm')} className="text-[#43089f] font-bold hover:underline">Kelola Loket &rarr;</button>
                    </div>
                  </div>

                  {/* Hospital Service Card */}
                  <div className="clay-card p-5 md:p-6 rounded-2xl flex flex-col justify-between hover:border-[#000000] transition-colors">
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#84e7a5]/30 border border-[#84e7a5]/50 flex items-center justify-center text-[#078a52] font-bold">
                          KL
                        </div>
                        <div>
                          <h4 className="text-sm md:text-md font-bold text-[#000000] font-outfit">Layanan Antrean Pasien Klinik</h4>
                          <span className="text-[9px] text-[#55534e] font-mono-clay font-bold">Role Petugas: Kasir / Dokter / Admin</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#55534e] leading-relaxed mb-6">
                        Sistem manajemen penanganan antrean pasien klinik/rumah sakit. Dilengkapi validasi pembayaran administrasi kasir dan visualisasi rantai **Single Linked List** pasien secara dinamis.
                      </p>
                    </div>
                    <div className="border-t border-[#eee9df] pt-4 flex items-center justify-between text-xs text-[#55534e]">
                      <span className="font-mono-clay text-[9px] bg-[#eee9df] px-2 py-0.5 rounded">SINGLE LINKED LIST</span>
                      <button onClick={() => setActiveTab('hospital')} className="text-[#078a52] font-bold hover:underline">Kelola Klinik &rarr;</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ktm' && <KtmQueue userRole={currentUser?.role || null} />}
          {activeTab === 'hospital' && <HospitalQueue userRole={currentUser?.role || null} />}
        </div>
      </main>

      {/* Login modal popup */}
      {isLoginModalOpen && (
        <Login
          onLoginSuccess={(session) => {
            setCurrentUser(session);
            setIsLoginModalOpen(false);
            showToast(`Sign in sukses sebagai ${session.name}!`, 'success');
          }}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-[#078a52] text-white' : 'bg-[#fbbd41] text-black border border-black'
        }`}>
          <span className="font-semibold text-xs">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
