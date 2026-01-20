import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import * as XLSX from 'xlsx'; 

// --- HELPER FUNGSI ---
const generateMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const formatDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const ManajemenJadwal = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  
  const [schedules, setSchedules] = useState({}); 
  const [isEditing, setIsEditing] = useState(false);
  const [personOptions, setPersonOptions] = useState([]);
  
  // --- STATE MODAL ---
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Untuk Hapus
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Untuk Sukses
  const [showErrorModal, setShowErrorModal] = useState(false);     // Untuk Error / Peringatan (Generate Tertolak)
  
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  
  const [pendingAction, setPendingAction] = useState(null); 
  const [loadingAction, setLoadingAction] = useState(false);
  // -------------------

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  const getBadgeColor = (name) => {
    if (!name) return 'text-red-600 font-semibold';
    const index = personOptions.indexOf(name);
    const realIndex = index - 1; 
    switch (realIndex) {
        case 0: return 'bg-purple-500 text-white';
        case 1: return 'bg-green-500 text-white';
        case 2: return 'bg-red-500 text-white';
        case 3: return 'bg-gray-500 text-white';
        default: return 'bg-blue-500 text-white';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const resUsers = await axios.get('http://localhost:3000/api/users');
        if (resUsers.data) {
            const personils = resUsers.data
                .filter(u => u.role === 'personil') 
                .map(u => u.nama)
                .sort();
            setPersonOptions([null, ...personils]); 
        }

        const resJadwal = await axios.get(`http://localhost:3000/api/jadwal?month=${monthKey}`);
        if (resJadwal.data.status === 'Success') {
          setSchedules(prev => ({ ...prev, [monthKey]: resJadwal.data.data }));
        } else {
          setSchedules(prev => ({ ...prev, [monthKey]: {} }));
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setSchedules(prev => ({ ...prev, [monthKey]: {} }));
      }
    };
    loadData();
  }, [monthKey]);

  const days = generateMonthDays(year, month);

  const ensureDayArray = (dateKey) => {
    const monthData = schedules[monthKey] || {};
    return monthData[dateKey] || [null, null, null, null];
  };

  // --- HELPER MODAL ---
  const showSuccess = (title, message) => {
      setModalTitle(title);
      setModalMessage(message);
      setShowSuccessModal(true);
  };

  const showError = (title, message) => {
      setModalTitle(title);
      setModalMessage(message);
      setShowErrorModal(true);
  };
  // --------------------

  // --- LOGIKA GENERATE & DELETE ---

  const handleGenerateClick = () => {
      const monthData = schedules[monthKey] || {};
      const hasData = Object.keys(monthData).length > 0;

      if (hasData) {
          // JIKA SUDAH ADA DATA -> TAMPILKAN ERROR (TIDAK BISA GENERATE ULANG)
          // Tombolnya hanya "Oke" (Tutup)
          showError(
              'Gagal Generate', 
              `Jadwal untuk bulan ${formatMonthName(year, month)} SUDAH ADA. Anda tidak dapat meng-generate ulang jika data masih ada. Silakan hapus jadwal terlebih dahulu.`
          );
      } else {
          // Jika belum ada data, langsung eksekusi tanpa tanya
          executePendingAction('generate');
      }
  };

  const handleDeleteClick = () => {
      const monthData = schedules[monthKey] || {};
      if (Object.keys(monthData).length === 0) {
          showError("Gagal Hapus", "Tidak ada data jadwal di bulan ini untuk dihapus.");
          return;
      }

      setModalTitle('Konfirmasi Hapus');
      setModalMessage(`Apakah Anda yakin ingin menghapus SEMUA jadwal bulan ${formatMonthName(year, month)}? Tindakan ini tidak dapat dibatalkan.`);
      setPendingAction('delete');
      setShowConfirmModal(true); // Tampilkan modal konfirmasi merah
  };

  const executePendingAction = async (actionType) => {
      setShowConfirmModal(false); 
      setLoadingAction(true);

      try {
          if (actionType === 'generate') {
              const res = await axios.post(`http://localhost:3000/api/jadwal/generate?month=${monthKey}`);
              if (res.data.status === 'Success') {
                  setSchedules(prev => ({ ...prev, [monthKey]: res.data.data }));
                  showSuccess("Berhasil", "Jadwal berhasil digenerate!");
              }
          } else if (actionType === 'delete') {
              await axios.delete(`http://localhost:3000/api/jadwal?month=${monthKey}`);
              setSchedules(prev => ({ ...prev, [monthKey]: {} }));
              showSuccess("Berhasil", "Jadwal berhasil dihapus.");
          }
      } catch (error) {
          const actionText = actionType === 'generate' ? 'generate' : 'menghapus';
          showError("Gagal", `Gagal ${actionText} jadwal: ${error.response?.data?.message || error.message}`);
      } finally {
          setLoadingAction(false);
          setPendingAction(null); 
      }
  };

  // --- EDIT & SAVE ---
  const handleChangeCell = (dateKey, personIndex, value) => {
    const monthData = { ...(schedules[monthKey] || {}) };
    const oldRow = monthData[dateKey] ? [...monthData[dateKey]] : [null, null, null, null];
    oldRow[personIndex] = value;
    monthData[dateKey] = oldRow;
    setSchedules(prev => ({ ...prev, [monthKey]: monthData }));
    axios.patch('http://localhost:3000/api/jadwal/day', { date: dateKey, slots: oldRow })
          .catch(err => console.error("Auto-save failed", err));
  };

  const handleSaveAll = async () => {
    const monthData = schedules[monthKey] || {};
    try {
      await axios.put('http://localhost:3000/api/jadwal', { month: monthKey, data: monthData });
      setIsEditing(false);
      showSuccess("Tersimpan", "Perubahan jadwal berhasil disimpan ke database.");
    } catch (err) {
      showError("Gagal Menyimpan", err.message);
    }
  };

  // --- NAVIGASI & EXCEL ---
  const handlePrev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const handleNext = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleDownloadExcel = () => {
    const currentDays = generateMonthDays(year, month);
    const monthData = schedules[monthKey] || {};
    const dataToExport = currentDays.map(dateObj => {
        const dateKey = formatDateKey(dateObj);
        const row = monthData[dateKey] || [null, null, null, null];
        return {
            'Hari': dateObj.toLocaleDateString('id-ID', { weekday: 'long' }),
            'Tanggal': dateKey,
            'Shift 1': row[0] || '-',
            'Shift 2': row[1] || '-',
            'Shift 3': row[2] || '-',
            'Libur': row[3] || '-'
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [{wch:10}, {wch:15}, {wch:20}, {wch:20}, {wch:20}, {wch:20}];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Shift");
    const namaBulan = new Date(year, month, 1).toLocaleString('id-ID', { month: 'long' });
    XLSX.writeFile(workbook, `Jadwal_Transport_${namaBulan}_${year}.xlsx`);
  };

  const formatMonthName = (y, m) => {
    return new Date(y, m, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Topbar title="Manajemen Jadwal" onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-grow p-6 overflow-y-auto relative">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
                <button onClick={handlePrev} className="px-3 py-1 hover:bg-gray-100 rounded">◀</button>
                <div className="font-bold text-lg text-red-600 w-48 text-center">{formatMonthName(year, month)}</div>
                <button onClick={handleNext} className="px-3 py-1 hover:bg-gray-100 rounded">▶</button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={handleDownloadExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2">
                   <i className="fas fa-file-excel"></i> Download Excel
                </button>
                <button onClick={handleGenerateClick} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow">
                    Generate Jadwal
                </button>
                <button onClick={handleDeleteClick} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">
                    Hapus Jadwal
                </button>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow">
                    Edit Jadwal
                  </button>
                ) : (
                  <button onClick={handleSaveAll} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow">
                    Simpan Perubahan
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-red-600 text-white uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Hari</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Shift 1</th>
                      <th className="px-4 py-3">Shift 2</th>
                      <th className="px-4 py-3">Shift 3</th>
                      <th className="px-4 py-3">Libur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(d => {
                      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
                      const dateKey = formatDateKey(d);
                      const row = ensureDayArray(dateKey); 

                      return (
                        <tr key={dateKey} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{dayName}</td>
                          <td className="px-4 py-3">{d.getDate()}</td>
                          {[0, 1, 2, 3].map((idx) => (
                            <td key={idx} className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs px-2 py-1 rounded-full text-center ${getBadgeColor(row[idx])}`}>
                                    {row[idx] || '-'}
                                </span>
                                {isEditing && (
                                    <select 
                                        value={row[idx] || ''}
                                        onChange={(e) => handleChangeCell(dateKey, idx, e.target.value)}
                                        className="border rounded text-xs p-1 mt-1 w-full focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">- Kosong -</option>
                                        {personOptions.filter(p => p !== null).map((p, i) => (
                                            <option key={i} value={p}>{p}</option>
                                        ))}
                                    </select>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ================= MODAL COMPONENTS ================= */}
          
          {/* 1. Modal Konfirmasi HAPUS (MERAH) */}
          {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-md w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{modalTitle}</h2>
                        <p className="text-gray-600 mb-6">{modalMessage}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-full transition-colors">
                                Batal
                            </button>
                            <button onClick={() => executePendingAction(pendingAction)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-colors">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Modal Sukses (HIJAU) */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg border-2 border-green-500 p-6 max-w-md w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{modalTitle}</h2>
                        <p className="text-gray-600 mb-6">{modalMessage}</p>
                        <button onClick={() => setShowSuccessModal(false)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-8 rounded-full transition-colors">
                            Oke
                        </button>
                    </div>
                </div>
            )}

            {/* 3. Modal Error / Peringatan Generate (MERAH - Tanpa Opsi Lanjut) */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-md w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{modalTitle}</h2>
                        <p className="text-gray-600 mb-6">{modalMessage}</p>
                        <button onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-full transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Loading Overlay */}
            {loadingAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="font-semibold text-gray-700">Sedang memproses...</span>
                    </div>
                </div>
            )}
          {/* ================================================= */}

        </main>
      </div>
    </div>
  );
};

export default ManajemenJadwal;