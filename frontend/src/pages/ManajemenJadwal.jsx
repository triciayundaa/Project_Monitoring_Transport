// file: src/pages/ManajemenJadwal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const personOptions = [null, 'Personil A', 'Personil B', 'Personil C', 'Personil D'];

const badgeColor = (person) => {
  switch (person) {
    case 'Personil A': return 'bg-purple-500 text-white';
    case 'Personil B': return 'bg-green-500 text-white';
    case 'Personil C': return 'bg-red-500 text-white';
    case 'Personil D': return 'bg-gray-500 text-white';
    default: return 'text-red-600 font-semibold';
  }
};

// Helper: Generate list of Date objects for current month
const generateMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Helper PENTING: Format Date object ke String 'YYYY-MM-DD' Lokal (Bukan UTC)
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

  // Key untuk API (YYYY-MM)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  // 1. Load Data
  useEffect(() => {
    const load = async () => {
      try {
        console.log("Fetching for:", monthKey);
        const res = await axios.get(`http://localhost:3000/api/jadwal?month=${monthKey}`);
        if (res.data.status === 'Success') {
          setSchedules(prev => ({ ...prev, [monthKey]: res.data.data }));
        } else {
            setSchedules(prev => ({ ...prev, [monthKey]: {} }));
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setSchedules(prev => ({ ...prev, [monthKey]: {} }));
      }
    };
    load();
  }, [monthKey]);

  const days = generateMonthDays(year, month);

  // 2. Ensure Data Array Exists for UI
  const ensureDayArray = (dateKey) => {
    const monthData = schedules[monthKey] || {};
    // Hanya inisialisasi visual, jangan set state terus menerus (infinite loop)
    return monthData[dateKey] || [null, null, null, null];
  };

  const handlePrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const handleNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleChangeCell = (dateKey, personIndex, value) => {
    const monthData = { ...(schedules[monthKey] || {}) };
    const oldRow = monthData[dateKey] ? [...monthData[dateKey]] : [null, null, null, null];
    oldRow[personIndex] = value;
    
    monthData[dateKey] = oldRow;
    
    // Update Local State
    setSchedules(prev => ({ ...prev, [monthKey]: monthData }));

    // Auto-save per cell ke server
    axios.patch('http://localhost:3000/api/jadwal/day', { date: dateKey, slots: oldRow })
         .catch(err => console.error("Auto-save failed", err));
  };

  const handleSaveAll = async () => {
    const monthData = schedules[monthKey] || {};
    try {
      await axios.put('http://localhost:3000/api/jadwal', { month: monthKey, data: monthData });
      alert('Jadwal berhasil disimpan!');
      setIsEditing(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleGenerate = async () => {
      try {
          const res = await axios.post(`http://localhost:3000/api/jadwal/generate?month=${monthKey}`);
          if (res.data.status === 'Success') {
              setSchedules(prev => ({ ...prev, [monthKey]: res.data.data }));
              alert("Jadwal Berhasil Digenerate!");
          }
      } catch (error) {
          alert("Gagal generate: " + (error.response?.data?.message || error.message));
      }
  };

  const handleDelete = async () => {
      if(!confirm("Yakin hapus jadwal bulan ini?")) return;
      try {
          await axios.delete(`http://localhost:3000/api/jadwal?month=${monthKey}`);
          setSchedules(prev => ({ ...prev, [monthKey]: {} }));
          alert("Jadwal Dihapus");
      } catch (error) {
          alert("Gagal hapus");
      }
  };

  const formatMonthName = (y, m) => {
    return new Date(y, m, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Topbar title="Manajemen Jadwal" onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
            {/* Controls Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
                <button onClick={handlePrev} className="px-3 py-1 hover:bg-gray-100 rounded">◀</button>
                <div className="font-bold text-lg text-red-600 w-48 text-center">{formatMonthName(year, month)}</div>
                <button onClick={handleNext} className="px-3 py-1 hover:bg-gray-100 rounded">▶</button>
              </div>

              <div className="flex gap-2">
                <button onClick={handleGenerate} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow">
                    Generate Jadwal
                </button>
                <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">
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

            {/* Table */}
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
                      // PENTING: Gunakan format YYYY-MM-DD lokal
                      const dateKey = formatDateKey(d);
                      const row = ensureDayArray(dateKey); // Ambil data dari state

                      return (
                        <tr key={dateKey} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{dayName}</td>
                          <td className="px-4 py-3">{d.getDate()}</td>
                          {[0, 1, 2, 3].map((idx) => (
                            <td key={idx} className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                {/* Badge Tampilan */}
                                <span className={`text-xs px-2 py-1 rounded-full text-center ${badgeColor(row[idx])}`}>
                                    {row[idx] || '-'}
                                </span>
                                {/* Select Input (Hanya muncul saat Edit) */}
                                {isEditing && (
                                    <select 
                                        value={row[idx] || ''}
                                        onChange={(e) => handleChangeCell(dateKey, idx, e.target.value)}
                                        className="border rounded text-xs p-1 mt-1 w-full"
                                    >
                                        <option value="">- Kosong -</option>
                                        {personOptions.filter(p => p !== null).map(p => (
                                            <option key={p} value={p}>{p}</option>
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
        </main>
      </div>
    </div>
  );
};

export default ManajemenJadwal;