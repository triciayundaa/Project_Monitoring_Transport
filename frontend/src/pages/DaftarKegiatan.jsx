import React, { useEffect, useState } from 'react';
import { Eye, Edit, Trash2, Plus, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import TambahKegiatan from './TambahKegiatan';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000/api/kegiatan';

const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    const normalizedStatus = status.toString().trim();
    
    if (normalizedStatus === 'Waiting' || normalizedStatus === 'waiting') {
        return 'bg-yellow-100 text-yellow-700';
    }
    if (normalizedStatus === 'On Progress' || normalizedStatus === 'on progress' || normalizedStatus === 'OnProgress') {
        return 'bg-blue-100 text-blue-700';
    }
    if (normalizedStatus === 'Completed' || normalizedStatus === 'completed') {
        return 'bg-green-100 text-green-700';
    }
    
    return 'bg-gray-100 text-gray-700';
};

const filterInput = 'w-full px-4 py-2.5 rounded-[12px] bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200';

const DaftarKegiatan = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openTambah, setOpenTambah] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [openEdit, setOpenEdit] = useState(false);
    const [selected, setSelected] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua Status');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const navigate = useNavigate();

    const loadData = async () => {
        try {
            const res = await fetch(API);
            const json = await res.json();
            
            // Transform data untuk menyesuaikan dengan format yang diharapkan
            const transformedData = json.map(item => ({
                ...item,
                realisasi_truk: item.total_truk || 0,
                transporters: item.transporters?.map(t => t.nama) || [],
                statuses: item.transporters?.map(t => t.status || 'Waiting') || []
            }));
            
            setData(transformedData);
            setFilteredData(transformedData);
        } catch (err) {
            console.error('Gagal mengambil data kegiatan', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let filtered = [...data];

        if (statusFilter !== 'Semua Status') {
            filtered = filtered.filter(item => 
                item.statuses && item.statuses.includes(statusFilter)
            );
        }

        if (startDate && endDate) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.tanggal_mulai).setHours(0,0,0,0);
                const start = new Date(startDate).setHours(0,0,0,0);
                const end = new Date(endDate).setHours(23,59,59,999);
                return itemDate >= start && itemDate <= end;
            });
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const fields = [
                    item.no_po,
                    item.vendor,
                    item.nama_kapal,
                    item.material,
                    ...(item.transporters || [])
                ];
                return fields
                    .map(f => (f || '').toString().toLowerCase())
                    .some(f => f.includes(q));
            });
        }

        setFilteredData(filtered);
    }, [searchQuery, statusFilter, startDate, endDate, data]);

    const handleDelete = async (no_po) => {
        try {
            const detailRes = await fetch(`${API}/${no_po}`);
            if (!detailRes.ok) {
                alert('Gagal memeriksa status kegiatan sebelum menghapus');
                return;
            }
            const detailJson = await detailRes.json();
            
            // Cek total truk dari statistik
            const totalTruk = detailJson.statistik?.total_truk || 0;
            
            // Cek status transporter dari array transporters
            const hasRunning = detailJson.transporters?.some(t => 
                t.status === 'On Progress' || t.status === 'Completed'
            );

            if (hasRunning) {
                alert('Kegiatan ini memiliki transporter yang sedang berjalan (On Progress/Completed) dan tidak dapat dihapus.');
                return;
            }

            if (Number(totalTruk) > 0) {
                alert(`Kegiatan ini sudah memiliki ${totalTruk} truk yang masuk dan tidak dapat dihapus.`);
                return;
            }

            if (!confirm(`Hapus kegiatan ${no_po}?`)) return;

            const delRes = await fetch(`${API}/${no_po}`, { method: 'DELETE' });
            if (!delRes.ok) {
                const text = await delRes.text();
                alert('Gagal menghapus kegiatan: ' + text);
                return;
            }
            
            alert('Kegiatan berhasil dihapus');
            await loadData();
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat menghapus kegiatan');
        }
    };

    const formatDate = (date) => date ? new Date(date).toLocaleDateString('id-ID') : '-';

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                    <button
                        onClick={() => setOpenTambah(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 mb-4 hover:bg-red-700"
                    >
                        <Plus size={18} /> Tambah Kegiatan
                    </button>

                    {openTambah && (
                        <TambahKegiatan onClose={() => setOpenTambah(false)} onSuccess={loadData} />
                    )}

                    {openEdit && (
                        <TambahKegiatan
                            mode="edit"
                            data={{ ...selected, old_no_po: selected.no_po }}
                            onClose={() => setOpenEdit(false)}
                            onSuccess={loadData}
                        />
                    )}

                    <div className="bg-gray-100 rounded-[14px] p-4 mb-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[200px] relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari PO, Vendor, Transporter, Kapal, Material..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${filterInput} pl-11 w-full`}
                                />
                            </div>

                            <div className="min-w-[150px]">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className={filterInput}
                                >
                                    <option>Semua Status</option>
                                    <option>Waiting</option>
                                    <option>On Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>

                            <div className="flex gap-2 min-w-[220px]">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={filterInput}
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={filterInput}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead className="bg-red-600 text-white">
                                <tr>
                                    <th className="px-4 py-3 border-r border-red-500/30">Tanggal</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">No PO</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Vendor</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Nama Kapal</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Material</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Incoterm</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">No BL</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Qty</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Transporter</th>
                                    <th className="px-4 py-3 border-r border-red-500/30">Status</th>
                                    <th className="px-4 py-3 text-center border-r border-red-500/30">Total Truk</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="text-center py-10 text-gray-400">
                                            Tidak ada data kegiatan
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => {
                                        const transporterCount = item.transporters?.length || 0;
                                        const hasRunning = item.statuses?.some(s => 
                                            s === 'On Progress' || s === 'Completed'
                                        );
                                        
                                        return (
                                            <React.Fragment key={item.no_po}>
                                                {transporterCount > 0 ? (
                                                    item.transporters.map((transporter, tIdx) => (
                                                        <tr
                                                            key={`${item.no_po}-${tIdx}`}
                                                            className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                        >
                                                            {tIdx === 0 && (
                                                                <>
                                                                    <td className="px-3 py-2 text-xs leading-tight border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <div>{formatDate(item.tanggal_mulai)}</div>
                                                                        <div className="text-gray-400 truncate">
                                                                            s.d {formatDate(item.tanggal_selesai)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-medium border-r border-gray-200" rowSpan={transporterCount}>{item.no_po}</td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>{item.vendor}</td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>{item.nama_kapal || '-'}</td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <div className="max-w-xs truncate" title={item.material}>{item.material}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>{item.incoterm || '-'}</td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>{item.no_bl || '-'}</td>
                                                                    <td className="px-4 py-3 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        {parseFloat(item.quantity)} ton
                                                                    </td>
                                                                </>
                                                            )}
                                                            
                                                            <td className="px-4 py-3 border-r border-gray-200">
                                                                <div className="font-medium text-gray-800">{transporter || '-'}</div>
                                                            </td>
                                                            
                                                            <td className="px-4 py-3 border-r border-gray-200">
                                                                <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(item.statuses?.[tIdx])}`}>
                                                                    {item.statuses?.[tIdx] || 'Waiting'}
                                                                </span>
                                                            </td>

                                                            {tIdx === 0 && (
                                                                <>
                                                                    <td className="px-4 py-3 text-center font-bold text-gray-700 border-r border-gray-200" rowSpan={transporterCount}>
                                                                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                                                            {item.realisasi_truk || 0}
                                                                        </span>
                                                                    </td>

                                                                    <td className="px-4 py-3" rowSpan={transporterCount}>
                                                                        <div className="flex justify-center gap-2">
                                                                            <button
                                                                                className="p-2 rounded hover:bg-gray-200 transition-colors"
                                                                                onClick={() => navigate(`/manajemen-kegiatan/detail/${item.no_po}`)}
                                                                                title="Lihat detail"
                                                                            >
                                                                                <Eye size={16} />
                                                                            </button>
                                                                            
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelected({
                                                                                        ...item,
                                                                                        hasRunningTransporter: hasRunning
                                                                                    });
                                                                                    setOpenEdit(true);
                                                                                }}
                                                                                disabled={hasRunning}
                                                                                className={`p-2 rounded transition-colors ${
                                                                                    hasRunning
                                                                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                                                        : 'hover:bg-blue-100 text-blue-600'
                                                                                }`}
                                                                                title={hasRunning ? 'Ada transporter yang sedang berjalan, tidak bisa diedit' : 'Edit kegiatan'}
                                                                            >
                                                                                <Edit size={16} />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleDelete(item.no_po)}
                                                                                disabled={hasRunning}
                                                                                className={`p-2 rounded transition-colors ${
                                                                                    hasRunning
                                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                        : 'hover:bg-red-100 text-red-600'
                                                                                }`}
                                                                                title={hasRunning ? 'Tidak dapat dihapus' : 'Hapus kegiatan'}
                                                                            >
                                                                                <Trash2 size={16} />
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
                                                            <div>{formatDate(item.tanggal_mulai)}</div>
                                                            <div className="text-gray-400 truncate">
                                                                s.d {formatDate(item.tanggal_selesai)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium border-r border-gray-200">{item.no_po}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.vendor}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.nama_kapal || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">
                                                            <div className="max-w-xs truncate">{item.material}</div>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.incoterm || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{item.no_bl || '-'}</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">{parseFloat(item.quantity)} ton</td>
                                                        <td className="px-4 py-3 text-gray-400 italic border-r border-gray-200">Belum ada transporter</td>
                                                        <td className="px-4 py-3 border-r border-gray-200">-</td>
                                                        <td className="px-4 py-3 text-center font-bold border-r border-gray-200">
                                                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                                                {item.realisasi_truk || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-center gap-2">
                                                                <button
                                                                    className="p-2 rounded hover:bg-gray-200"
                                                                    onClick={() => navigate(`/manajemen-kegiatan/detail/${item.no_po}`)}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelected(item);
                                                                        setOpenEdit(true);
                                                                    }}
                                                                    className="p-2 rounded hover:bg-blue-100 text-blue-600"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(item.no_po)}
                                                                    className="p-2 rounded hover:bg-red-100 text-red-600"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
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

export default DaftarKegiatan;