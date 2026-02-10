import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API_BASE_URL from '../../config/api';

const LaporanList = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [filter, setFilter] = useState('Semua Laporan');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const [daftarLaporan, setDaftarLaporan] = useState([]);
    const [poList, setPoList] = useState([]);
    const [selectedPo, setSelectedPo] = useState('');
    
    const [reportType, setReportType] = useState('po');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    
    const navigate = useNavigate();

    const fetchRiwayatLaporan = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/laporan`);
            setDaftarLaporan(res.data.data || []);
        } catch (err) {
            console.error("Gagal memuat riwayat laporan:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!reportToDelete) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/laporan/${reportToDelete.id}`);
            setIsDeleteModalOpen(false);
            setReportToDelete(null);
            fetchRiwayatLaporan(); 
        } catch (err) {
            console.error("Gagal menghapus laporan:", err);
            alert("Gagal menghapus laporan");
        }
    };

    const handleOpenModal = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/kegiatan`);
            setPoList(res.data);
            setIsModalOpen(true);
        } catch (err) {
            alert("Gagal memuat daftar PO aktif");
        }
    };

    const handleGenerate = async () => {
        const userStr = localStorage.getItem('user');
        const userData = userStr ? JSON.parse(userStr) : { nama: 'Admin' };

        try {
            if (reportType === 'po') {
                if (!selectedPo) return alert("Silakan pilih No PO terlebih dahulu");
                
                await axios.post(`${API_BASE_URL}/api/laporan/add`, {
                    judul: `Laporan Rekapitulasi PO ${selectedPo}`,
                    tipe_laporan: 'Mingguan',
                    file_path: `/laporan/detail/${selectedPo}`,
                    dibuat_oleh: userData.nama
                });
                navigate(`/laporan/detail/${selectedPo}`);
            } else {
                if (!startDate || !endDate) return alert("Silakan pilih rentang tanggal");
                
                const diffInDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
                let kategori = 'Bulanan';
                if (diffInDays > 60) kategori = 'Lainnya';

                await axios.post(`${API_BASE_URL}/api/laporan/add`, {
                    judul: `Laporan Periodik (${startDate} s/d ${endDate})`,
                    tipe_laporan: kategori, 
                    file_path: `/laporan/periodik?start=${startDate}&end=${endDate}`,
                    dibuat_oleh: userData.nama
                });
                navigate(`/laporan/periodik?start=${startDate}&end=${endDate}`);
            }

            setIsModalOpen(false);
            fetchRiwayatLaporan();
        } catch (err) {
            alert("Gagal melakukan generate laporan");
        }
    };

    useEffect(() => {
        fetchRiwayatLaporan();
    }, []);

    const filteredData = daftarLaporan.filter(item => {
        const matchType = filter === 'Semua Laporan' || item.tipe_laporan === filter;
        const matchSearch = 
            item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.file_path.toLowerCase().includes(searchQuery.toLowerCase());
        return matchType && matchSearch;
    });

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Laporan" />
                
                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 md:mb-12">
                            <button 
                                onClick={handleOpenModal}
                                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 md:px-10 py-2.5 md:py-3 rounded-xl font-bold shadow-lg transition-all text-xs md:text-sm uppercase tracking-wider transform hover:scale-105 active:scale-95"
                            >
                                <i className="fas fa-plus-circle mr-2"></i>
                                Generate laporan
                            </button>

                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1 md:justify-end">
                                {/* Search Bar */}
                                <div className="relative flex-1 max-w-md">
                                    <input 
                                        type="text"
                                        placeholder="Cari No. PO..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 md:py-3 rounded-xl shadow-sm outline-none focus:border-red-500 font-medium text-sm transition-all"
                                    />
                                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                </div>

                                {/* Filter Dropdown */}
                                <div className="relative inline-block w-full md:w-52">
                                    <select 
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="w-full bg-white border border-gray-200 p-2.5 md:p-3 rounded-xl shadow-sm outline-none font-bold text-gray-700 appearance-none cursor-pointer focus:border-red-500 text-sm transition-colors"
                                    >
                                        <option value="Semua Laporan">Semua Laporan</option>
                                        <option value="Bulanan">Per Bulan</option>
                                        <option value="Lainnya">Per Tahun</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                                        <i className="fas fa-chevron-down text-[10px]"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List Section */}
                        <div className="space-y-3 md:space-y-6">
                            {/* Title Section */}
                            <div className="flex items-center space-x-4 mb-4 md:mb-6">
                                <h2 className="text-xl md:text-3xl font-black text-red-600 tracking-tighter uppercase">
                                    Daftar Laporan
                                </h2>
                                <div className="h-[2px] flex-grow bg-red-100 mt-2"></div>
                            </div>
                            
                            {loading ? (
                                <div className="text-center py-10 font-bold text-gray-400 italic text-sm">
                                    Menyingkronkan riwayat...
                                </div>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="group bg-white border-2 border-red-500 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-sm hover:shadow-xl hover:bg-red-50/40 transition-all duration-300"
                                    >
                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex justify-between items-center">
                                            <div className="flex items-center space-x-6">
                                                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 text-2xl group-hover:bg-red-600 group-hover:text-white shadow-inner transition-all duration-300">
                                                    <i className="fas fa-file-invoice"></i>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-red-600 font-black text-xl tracking-tight uppercase mb-1">
                                                        {item.judul}
                                                    </span>
                                                    <div className="flex items-center space-x-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <span className="flex items-center">
                                                            <i className="far fa-calendar-alt mr-2 text-red-400"></i> 
                                                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span className="flex items-center">
                                                            <i className="far fa-user mr-2 text-red-400"></i> {item.dibuat_oleh}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <button 
                                                    onClick={() => navigate(item.file_path)}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-md transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                    Detail
                                                </button>
                                                
                                                <button 
                                                    onClick={() => {
                                                        setReportToDelete(item);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-3 rounded-2xl font-black text-xs uppercase shadow-sm transition-all active:scale-95"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile Layout */}
                                        <div className="md:hidden">
                                            <div className="flex items-start space-x-3 mb-3">
                                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 text-xl group-hover:bg-red-600 group-hover:text-white shadow-inner transition-all flex-shrink-0">
                                                    <i className="fas fa-file-invoice"></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-red-600 font-black text-base tracking-tight uppercase mb-1 break-words">
                                                        {item.judul}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex flex-col space-y-1 text-[10px] font-bold text-gray-400 uppercase mb-3 pl-1">
                                                <span className="flex items-center">
                                                    <i className="far fa-calendar-alt mr-2 text-red-400"></i> 
                                                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="flex items-center">
                                                    <i className="far fa-user mr-2 text-red-400"></i> 
                                                    {item.dibuat_oleh}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => navigate(item.file_path)}
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-black text-xs uppercase shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                    Detail
                                                </button>
                                                
                                                <button 
                                                    onClick={() => {
                                                        setReportToDelete(item);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase shadow-sm transition-all active:scale-95"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 md:py-20 bg-white rounded-2xl md:rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold uppercase italic text-sm">
                                    {searchQuery ? "Laporan tidak ditemukan." : "Belum ada riwayat laporan."}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* MODAL GENERATE */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl md:text-2xl font-black text-red-600 text-center mb-6 md:mb-8 uppercase tracking-tighter">
                            Generate Laporan
                        </h3>
                        
                        <div className="space-y-5 md:space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                                    Tipe Laporan
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setReportType('po')}
                                        className={`py-2.5 md:py-2 rounded-xl font-bold text-xs uppercase transition-all ${reportType === 'po' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        Per Nomor PO
                                    </button>
                                    <button 
                                        onClick={() => setReportType('periodik')}
                                        className={`py-2.5 md:py-2 rounded-xl font-bold text-xs uppercase transition-all ${reportType === 'periodik' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        Rentang Tanggal
                                    </button>
                                </div>
                            </div>

                            {reportType === 'po' ? (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                                        Pilih Nomor PO
                                    </label>
                                    <select 
                                        className="w-full border-2 border-gray-100 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:border-red-600 font-bold text-gray-700 bg-gray-50 text-sm"
                                        value={selectedPo}
                                        onChange={(e) => setSelectedPo(e.target.value)}
                                    >
                                        <option value="">-- Pilih Nomor PO --</option>
                                        {poList.map((po) => (
                                            <option key={po.id} value={po.no_po}>
                                                {po.no_po} - {po.nama_kapal || 'Tanpa Kapal'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                                            Tanggal Mulai
                                        </label>
                                        <input 
                                            type="date" 
                                            className="w-full border-2 border-gray-100 p-3 rounded-xl md:rounded-2xl outline-none focus:border-red-600 font-bold text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                                            Tanggal Selesai
                                        </label>
                                        <input 
                                            type="date" 
                                            className="w-full border-2 border-gray-100 p-3 rounded-xl md:rounded-2xl outline-none focus:border-red-600 font-bold text-sm"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-8 md:mt-10 gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="flex-1 text-gray-400 font-black uppercase text-xs hover:text-gray-600 py-3"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleGenerate} 
                                className="flex-1 bg-red-600 text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-black uppercase shadow-lg hover:bg-red-700 transition-all text-xs"
                            >
                                Proses
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-sm shadow-2xl text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-2xl md:text-3xl">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tighter mb-2">
                            Konfirmasi Hapus
                        </h3>
                        <p className="text-gray-500 text-xs md:text-sm font-medium mb-6 md:mb-8 px-2">
                            Apakah Anda yakin ingin menghapus riwayat laporan <span className="text-red-600 font-bold">"{reportToDelete?.judul}"</span>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3 md:gap-4">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 bg-gray-100 text-gray-400 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black uppercase text-[10px] hover:bg-gray-200 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 text-white py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-red-700 transition-all"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanList;