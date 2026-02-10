import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import * as XLSX from 'xlsx'; 
import API_BASE_URL from '../config/api'; // <--- IMPORT CONFIG

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  
  const [schedules, setSchedules] = useState({}); 
  const [isEditing, setIsEditing] = useState(false);
  const [personOptions, setPersonOptions] = useState([]);
  
  // --- STATE MODAL ---
  const [showConfirmModal, setShowConfirmModal] = useState(false); 
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [showErrorModal, setShowErrorModal] = useState(false);     
  
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  
  const [pendingAction, setPendingAction] = useState(null); 
  const [loadingAction, setLoadingAction] = useState(false);

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
        // GUNAKAN API_BASE_URL
        const resUsers = await axios.get(`${API_BASE_URL}/api/users`);
        if (resUsers.data) {
            const personils = resUsers.data
                .filter(u => u.role === 'personil') 
                .map(u => u.nama)
                .sort();
            setPersonOptions([null, ...personils]); 
        }

        // GUNAKAN API_BASE_URL
        const resJadwal = await axios.get(`${API_BASE_URL}/api/jadwal?month=${monthKey}`);
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

  const handleGenerateClick = () => {
      const monthData = schedules[monthKey] || {};
      const hasData = Object.keys(monthData).length > 0;
      if (hasData) {
          showError(
              'Gagal Generate', 
              `Jadwal untuk bulan ${formatMonthName(year, month)} SUDAH ADA. Silakan hapus jadwal terlebih dahulu.`
          );
      } else {
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
      setModalMessage(`Apakah Anda yakin ingin menghapus SEMUA jadwal bulan ${formatMonthName(year, month)}?`);
      setPendingAction('delete');
      setShowConfirmModal(true); 
  };

  const executePendingAction = async (actionType) => {
      setShowConfirmModal(false); 
      setLoadingAction(true);
      try {
          if (actionType === 'generate') {
              // GUNAKAN API_BASE_URL
              const res = await axios.post(`${API_BASE_URL}/api/jadwal/generate?month=${monthKey}`);
              if (res.data.status === 'Success') {
                  setSchedules(prev => ({ ...prev, [monthKey]: res.data.data }));
                  showSuccess("Berhasil", "Jadwal berhasil digenerate!");
              }
          } else if (actionType === 'delete') {
              // GUNAKAN API_BASE_URL
              await axios.delete(`${API_BASE_URL}/api/jadwal?month=${monthKey}`);
              setSchedules(prev => ({ ...prev, [monthKey]: {} }));
              showSuccess("Berhasil", "Jadwal berhasil dihapus.");
          }
      } catch (error) {
          showError("Gagal", `Gagal memproses: ${error.response?.data?.message || error.message}`);
      } finally {
          setLoadingAction(false);
          setPendingAction(null); 
      }
  };

  const handleChangeCell = (dateKey, personIndex, value) => {
    const monthData = { ...(schedules[monthKey] || {}) };
    const oldRow = monthData[dateKey] ? [...monthData[dateKey]] : [null, null, null, null];
    oldRow[personIndex] = value;
    monthData[dateKey] = oldRow;
    setSchedules(prev => ({ ...prev, [monthKey]: monthData }));
    
    // GUNAKAN API_BASE_URL
    axios.patch(`${API_BASE_URL}/api/jadwal/day`, { date: dateKey, slots: oldRow })
          .catch(err => console.error("Auto-save failed", err));
  };

  const handleSaveAll = async () => {
    const monthData = schedules[monthKey] || {};
    try {
      // GUNAKAN API_BASE_URL
      await axios.put(`${API_BASE_URL}/api/jadwal`, { month: monthKey, data: monthData });
      setIsEditing(false);
      showSuccess("Tersimpan", "Perubahan jadwal berhasil disimpan.");
    } catch (err) {
      showError("Gagal Menyimpan", err.message);
    }
  };

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
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Shift");
    XLSX.writeFile(workbook, `Jadwal_Transport_${monthKey}.xlsx`);
  };

  const formatMonthName = (y, m) => {
    return new Date(y, m, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* BAGIAN KANAN: Struktur disamakan dengan Dashboard/Daftar Kegiatan */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar di luar tag <main> */}
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto relative">
          {/* Div pembungkus lebar penuh tanpa pembatasan max-w */}
          <div className="w-full">
            
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

          {/* Modal Components */}
          {showConfirmModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-[60] p-4">
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

            {showSuccessModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-[60] p-4">
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

            {showErrorModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-[60] p-4">
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

            {loadingAction && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/10 z-[70] flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="font-semibold text-gray-700">Sedang memproses...</span>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default ManajemenJadwal;