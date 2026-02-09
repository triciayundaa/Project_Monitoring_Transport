import React, { useEffect, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api'; // <--- IMPORT CONFIG

// GUNAKAN API_BASE_URL
const API = `${API_BASE_URL}/api/water-truck/list`;

const filterInput = 'w-full px-4 py-2.5 rounded-[12px] bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200';

const DaftarTrukAir = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const res = await fetch(API);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const json = await res.json();
            
            console.log('📦 Raw API Response:', json);
            
            if (json.status === 'Success' && json.data && Array.isArray(json.data)) {
                const grouped = groupDataByPO(json.data);
                console.log('📊 Grouped Data:', grouped);
                
                // ✅ SORT: Data terbaru (berdasarkan tanggal_mulai) muncul paling atas
                const sortedData = grouped.sort((a, b) => {
                    const dateA = new Date(a.tanggal_mulai || 0);
                    const dateB = new Date(b.tanggal_mulai || 0);
                    return dateB - dateA; // Descending (terbaru di atas)
                });
                
                setData(sortedData);
                setFilteredData(sortedData);
            } else {
                console.warn('⚠️ Unexpected API response format:', json);
                setData([]);
                setFilteredData([]);
            }
        } catch (err) {
            console.error('❌ Gagal mengambil data truk air:', err);
            setError(err.message);
            setData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
        }
    };

    // Group data berdasarkan no_po dengan validasi ketat
    const groupDataByPO = (rawData) => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        const map = {};

        rawData.forEach(item => {
            // Validasi item memiliki no_po
            if (!item || !item.no_po) {
                console.warn('⚠️ Item tanpa no_po:', item);
                return;
            }

            if (!map[item.no_po]) {
                map[item.no_po] = {
                    no_po: item.no_po,
                    nama_vendor: item.nama_vendor || '-',
                    nama_kapal: item.nama_kapal || '-',
                    material: item.material || '-',
                    tanggal_mulai: item.tanggal_mulai || null,
                    tanggal_selesai: item.tanggal_selesai || null,
                    total_truk_air_keseluruhan: 0,
                    transporters: []
                };
            }

            // Hitung total truk air dari plat nomor
            const totalTrukAir = item.plat_nomor_truk_air 
                ? item.plat_nomor_truk_air.split(',').filter(p => p.trim()).length 
                : 0;

            map[item.no_po].total_truk_air_keseluruhan += totalTrukAir;

            // Pastikan id ada sebelum push
            if (item.id) {
                map[item.no_po].transporters.push({
                    id: item.id,
                    kegiatan_transporter_id: item.kegiatan_transporter_id || null,
                    nama_transporter: item.nama_transporter || 'Unknown',
                    plat_nomor_truk_air: item.plat_nomor_truk_air || '',
                    total_truk_air: totalTrukAir,
                    status: item.status || 'Draft',
                    created_at: item.created_at || null
                });
            } else {
                console.warn('⚠️ Item tanpa ID, skip:', item);
            }
        });

        return Object.values(map);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!Array.isArray(data)) {
            console.warn('⚠️ Data bukan array:', data);
            setFilteredData([]);
            return;
        }

        let filtered = [...data];

        // Filter by date range (tanggal_mulai dan tanggal_selesai dari kegiatan)
        if (startDate && endDate) {
            filtered = filtered.filter(item => {
                if (!item.tanggal_mulai || !item.tanggal_selesai) return false;
                
                try {
                    const itemStart = new Date(item.tanggal_mulai).setHours(0,0,0,0);
                    const itemEnd = new Date(item.tanggal_selesai).setHours(23,59,59,999);
                    const filterStart = new Date(startDate).setHours(0,0,0,0);
                    const filterEnd = new Date(endDate).setHours(23,59,59,999);
                    
                    // Cek apakah range kegiatan overlap dengan range filter
                    return (itemStart <= filterEnd && itemEnd >= filterStart);
                } catch (e) {
                    console.error('Error parsing date:', e);
                    return false;
                }
            });
        }

        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item => {
                try {
                    const fields = [
                        item.no_po,
                        item.nama_vendor,
                        item.nama_kapal,
                        item.material,
                        ...(Array.isArray(item.transporters) ? item.transporters.map(t => t?.nama_transporter || '') : [])
                    ];
                    
                    return fields
                        .map(f => (f || '').toString().toLowerCase())
                        .some(f => f.includes(q));
                } catch (e) {
                    console.error('Error filtering item:', e, item);
                    return false;
                }
            });
        }

        setFilteredData(filtered);
    }, [searchQuery, startDate, endDate, data]);

    const handleViewDetail = (item) => {
        console.log('🔍 View Detail Clicked:', item);
        
        // Validasi ketat
        if (!item) {
            console.error('❌ Error: Item undefined');
            alert('Error: Data tidak valid. Silakan refresh halaman.');
            return;
        }

        if (!item.id) {
            console.error('❌ Error: ID tidak ditemukan pada item:', item);
            alert('Error: ID tidak valid. Silakan refresh halaman.');
            return;
        }
        
        try {
            // Gunakan id dari item (bisa id kegiatan atau kegiatan_transporter_id tergantung struktur backend)
            const targetPath = `/daftar-truk-air/detail/${item.id}`;
            console.log('🚀 Navigating to:', targetPath);
            navigate(targetPath);
        } catch (error) {
            console.error('❌ Navigation Error:', error);
            alert('Gagal membuka halaman detail. Silakan coba lagi.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return '-';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <main className="flex-grow flex items-center justify-center">
                        <div className="text-gray-500">Memuat data...</div>
                    </main>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <main className="flex-grow flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-red-500 font-medium mb-2">Error memuat data</div>
                            <div className="text-sm text-gray-500 mb-4">{error}</div>
                            <button 
                                onClick={loadData}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                    {/* Filter Section */}
                    <div className="bg-gray-100 rounded-[14px] p-4 mb-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[200px] relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari PO, Vendor, Kapal, Material, Transporter..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${filterInput} pl-11 w-full`}
                                />
                            </div>

                            <div className="flex gap-2 min-w-[220px]">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={filterInput}
                                    placeholder="Dari Tanggal"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={filterInput}
                                    placeholder="Sampai Tanggal"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead className="bg-red-600 text-white">
                                <tr>
                                    <th className="px-4 py-3 border-r border-red-500/30">Tanggal</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">No PO</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Vendor</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Nama Kapal</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Material</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Transporter</th>
                                    <th className="px-4 py-3 border-r border-red-500/30 text-center">Total Truk Air<br/>Transporter</th>
                                    <th className="px-4 py-3 border-r border-red-500/30 text-center">Total Truk Air<br/>Keseluruhan</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!Array.isArray(filteredData) || filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-10 text-gray-400">
                                            Tidak ada data truk air
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => {
                                        const transporters = Array.isArray(item.transporters) ? item.transporters : [];
                                        const transporterCount = transporters.length;
                                        
                                        return (
                                            <React.Fragment key={`po-${item.no_po}-${index}`}>
                                                {transporterCount > 0 ? (
                                                    transporters.map((transporter, tIdx) => (
                                                        <tr
                                                            key={`${item.no_po}-${transporter.id}-${tIdx}`}
                                                            className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                        >
                                                            {tIdx === 0 && (
                                                                <>
                                                                    <td className="px-3 py-2 text-xs leading-tight border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <div className="font-medium">
                                                                            {formatDate(item.tanggal_mulai)}
                                                                        </div>
                                                                        <div className="text-gray-400">
                                                                            s.d {formatDate(item.tanggal_selesai)}
                                                                        </div>
                                                                    </td>

                                                                    <td className="px-4 py-3 font-medium border-r border-gray-200" rowSpan={transporterCount}>
                                                                        {item.no_po || '-'}
                                                                    </td>

                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        {item.nama_vendor || '-'}
                                                                    </td>

                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        {item.nama_kapal || '-'}
                                                                    </td>

                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <div className="max-w-xs truncate" title={item.material}>
                                                                            {item.material || '-'}
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}

                                                            <td className="px-4 py-3 border-r border-gray-200">
                                                                <div className="font-medium text-gray-800">
                                                                    {transporter.nama_transporter || '-'}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 text-center border-r border-gray-200">
                                                                <span className="inline-flex items-center justify-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                                                    {transporter.total_truk_air || 0}
                                                                </span>
                                                            </td>

                                                            {tIdx === 0 && (
                                                                <>
                                                                    <td className="px-4 py-3 text-center border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                                                            {item.total_truk_air_keseluruhan || 0}
                                                                        </span>
                                                                    </td>

                                                                    <td className="px-4 py-3" rowSpan={transporterCount}>
                                                                        <div className="flex justify-center">
                                                                            <button
                                                                                className="p-2 rounded hover:bg-gray-200 transition-colors"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    handleViewDetail(transporter);
                                                                                }}
                                                                                title="Lihat detail"
                                                                                disabled={!transporter.id}
                                                                            >
                                                                                <Eye size={16} className="text-blue-600" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                        <td className="px-3 py-2 text-xs leading-tight border-r border-gray-200">
                                                            <div className="font-medium">
                                                                {formatDate(item.tanggal_mulai)}
                                                            </div>
                                                            <div className="text-gray-400">
                                                                s.d {formatDate(item.tanggal_selesai)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium border-r border-gray-200">{item.no_po || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.nama_vendor || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.nama_kapal || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">
                                                            <div className="max-w-xs truncate">{item.material || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 italic border-r border-gray-200">Belum ada transporter</td>
                                                        <td className="px-4 py-3 text-center border-r border-gray-200">-</td>
                                                        <td className="px-4 py-3 text-center border-r border-gray-200">
                                                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                                                0
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-center">-</div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default DaftarTrukAir;