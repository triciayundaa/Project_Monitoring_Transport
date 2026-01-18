// file: src/pages/ManajemenJadwal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import * as XLSX from 'xlsx'; 

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

// Helper Format Date
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

  // STATE: Data Personil Dinamis
  const [personOptions, setPersonOptions] = useState([]);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  // --- FUNGSI WARNA (DIPERBAIKI) ---
  // Mencocokkan nama dengan urutan di database untuk mempertahankan warna lama
  const getBadgeColor = (name) => {
    if (!name) return 'text-red-600 font-semibold'; // Kosong/Libur
    
    // Cari urutan nama ini di daftar personil
    // Index 0 (dulu Personil A) -> Ungu
    // Index 1 (dulu Personil B) -> Hijau
    // Index 2 (dulu Personil C) -> Merah
    // Index 3 (dulu Personil D) -> Abu-abu
    const index = personOptions.indexOf(name);

    // Kita kurangi 1 karena index 0 di personOptions itu 'null' (pilihan kosong)
    // Jadi Personil pertama ada di index 1 array personOptions
    const realIndex = index - 1; 

    switch (realIndex) {
        case 0: return 'bg-purple-500 text-white'; // Pengganti Personil A
        case 1: return 'bg-green-500 text-white';  // Pengganti Personil B
        case 2: return 'bg-red-500 text-white';    // Pengganti Personil C
        case 3: return 'bg-gray-500 text-white';   // Pengganti Personil D
        default: return 'bg-blue-500 text-white';  // Jika ada personil ke-5 dst
    }
  };

  // 1. Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        // A. Ambil Personil Terbaru dari Database (Agar "Adit" muncul)
        const resUsers = await axios.get('http://localhost:3000/api/users');
        if (resUsers.data) {
            const personils = resUsers.data
                .filter(u => u.role === 'personil') 
                .map(u => u.nama)
                .sort(); // Sort abjad agar urutan warna konsisten
            setPersonOptions([null, ...personils]); 
        }

        // B. Ambil Jadwal
        console.log("Fetching schedule for:", monthKey);
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
    setSchedules(prev => ({ ...prev, [monthKey]: monthData }));
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

        <main className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
            {/* Controls Header */}
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
                      const dateKey = formatDateKey(d);
                      const row = ensureDayArray(dateKey); 

                      return (
                        <tr key={dateKey} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{dayName}</td>
                          <td className="px-4 py-3">{d.getDate()}</td>
                          {[0, 1, 2, 3].map((idx) => (
                            <td key={idx} className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                {/* Panggil fungsi warna yang sudah diperbaiki */}
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
                                        {/* Render Opsi Personil Dinamis dari API */}
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
        </main>
      </div>
    </div>
  );
};

export default ManajemenJadwal;