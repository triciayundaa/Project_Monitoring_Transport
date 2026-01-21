import React, { useEffect, useState } from 'react';
import { Eye, Edit, Trash2, Plus, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import TambahKegiatan from './TambahKegiatan';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000/api/kegiatan';

// Modern Modal Component
const Modal = ({ isOpen, onClose, type = 'success', title, message }) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="w-24 h-24 text-green-600" />,
        error: <XCircle className="w-24 h-24 text-red-600" />,
        warning: <AlertCircle className="w-24 h-24 text-yellow-600" />
    };

    const bgColors = {
        success: 'bg-green-50',
        error: 'bg-red-50',
        warning: 'bg-yellow-50'
    };

    const textColors = {
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600'
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className={`w-48 h-48 ${bgColors[type]} rounded-full flex items-center justify-center mb-8 shadow-inner`}>
                    {icons[type]}
                </div>
                <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">{title}</h2>
                <p className={`${textColors[type]} font-semibold text-lg mb-6`}>{message}</p>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// Confirm Modal
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className="w-48 h-48 bg-yellow-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <AlertCircle className="w-24 h-24 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">{title}</h2>
                <p className="text-gray-600 font-medium text-lg mb-8">{message}</p>
                <div className="flex gap-4 w-full">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider"
                    >
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
};

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
    
    // Modal states
    const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showModal = (type, title, message) => {
        setModal({ isOpen: true, type, title, message });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: 'success', title: '', message: '' });
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    };

    const loadData = async () => {
        try {
            const res = await fetch(API);
            const json = await res.json();
            
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
            showModal('error', 'Gagal Memuat Data', 'Tidak dapat mengambil data kegiatan dari server');
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
                showModal('error', 'Gagal Memeriksa', 'Gagal memeriksa status kegiatan sebelum menghapus');
                return;
            }
            const detailJson = await detailRes.json();
            
            const totalTruk = detailJson.statistik?.total_truk || 0;
            const hasRunning = detailJson.transporters?.some(t => 
                t.status === 'On Progress' || t.status === 'Completed'
            );

            if (hasRunning) {
                showModal('warning', 'Tidak Dapat Dihapus', 'Kegiatan ini memiliki transporter yang sedang berjalan (On Progress/Completed)');
                return;
            }

            if (Number(totalTruk) > 0) {
                showModal('warning', 'Tidak Dapat Dihapus', `Kegiatan ini sudah memiliki ${totalTruk} truk yang masuk`);
                return;
            }

            showConfirm(
                'Konfirmasi Hapus',
                `Apakah Anda yakin ingin menghapus kegiatan ${no_po}?`,
                async () => {
                    try {
                        const delRes = await fetch(`${API}/${no_po}`, { method: 'DELETE' });
                        if (!delRes.ok) {
                            const text = await delRes.text();
                            showModal('error', 'Gagal Menghapus', text);
                            return;
                        }
                        
                        showModal('success', 'Berhasil Dihapus', 'Kegiatan berhasil dihapus dari sistem');
                        await loadData();
                        closeConfirm();
                    } catch (err) {
                        console.error(err);
                        showModal('error', 'Terjadi Kesalahan', 'Gagal menghapus kegiatan dari server');
                    }
                }
            );

        } catch (err) {
            console.error(err);
            showModal('error', 'Terjadi Kesalahan', 'Terjadi kesalahan saat menghapus kegiatan');
        }
    };

    const handleEdit = async (item) => {
        try {
            const detailRes = await fetch(`${API}/${item.no_po}`);
            if (!detailRes.ok) {
                showModal('error', 'Gagal Memuat', 'Gagal mengambil detail kegiatan');
                return;
            }
            const detailJson = await detailRes.json();
            
            let earliestTruckDate = null;
            if (detailJson.truk && detailJson.truk.length > 0) {
                const dates = detailJson.truk.map(t => new Date(t.tanggal));
                earliestTruckDate = new Date(Math.min(...dates));
            }

            const transportersMetadata = detailJson.transporters.map(t => ({
                kegiatan_transporter_id: t.kegiatan_transporter_id,
                nama: t.nama_transporter,
                status: t.status,
                jumlah_truk: t.jumlah_truk
            }));

            setSelected({
                ...item,
                earliestTruckDate: earliestTruckDate,
                transporterCount: item.transporters?.length || 0,
                transportersMetadata: transportersMetadata
            });
            setOpenEdit(true);
        } catch (err) {
            console.error(err);
            showModal('error', 'Terjadi Kesalahan', 'Gagal memuat data untuk edit');
        }
    };

    const formatDate = (date) => date ? new Date(date).toLocaleDateString('id-ID') : '-';

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Modal 
                isOpen={modal.isOpen}
                onClose={closeModal}
                type={modal.type}
                title={modal.title}
                message={modal.message}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />

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
                                                                                onClick={() => handleEdit(item)}
                                                                                className="p-2 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                                                                title="Edit kegiatan"
                                                                            >
                                                                                <Edit size={16} />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleDelete(item.no_po)}
                                                                                disabled={item.realisasi_truk > 0}
                                                                                className={`p-2 rounded transition-colors ${
                                                                                    item.realisasi_truk > 0
                                                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                                        : 'hover:bg-red-100 text-red-600'
                                                                                }`}
                                                                                title={
                                                                                    item.realisasi_truk > 0 
                                                                                        ? `Tidak dapat dihapus (${item.realisasi_truk} truk sudah masuk)` 
                                                                                        : 'Hapus kegiatan'
                                                                                }
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
                                                                    title="Lihat detail"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(item)}
                                                                    className="p-2 rounded hover:bg-blue-100 text-blue-600"
                                                                    title="Edit kegiatan"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(item.no_po)}
                                                                    disabled={item.realisasi_truk > 0}
                                                                    className={`p-2 rounded transition-colors ${
                                                                        item.realisasi_truk > 0
                                                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                            : 'hover:bg-red-100 text-red-600'
                                                                    }`}
                                                                    title={
                                                                        item.realisasi_truk > 0 
                                                                            ? `Tidak dapat dihapus (${item.realisasi_truk} truk sudah masuk)` 
                                                                            : 'Hapus kegiatan'
                                                                    }
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