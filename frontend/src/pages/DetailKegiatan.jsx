import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, CheckCircle, XCircle, Search, AlertCircle, Calendar, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ManualInputModal from './ManualInputModal';
import API_BASE_URL from '../config/api';

const API = `${API_BASE_URL}/api/kegiatan`;

// ==========================================
// 0. HELPER URL FOTO
// ==========================================
const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
};

// ==========================================
// 1. KOMPONEN MODAL & CONFIRM
// ==========================================

const Modal = ({ isOpen, onClose, type = 'success', title, message }) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="w-16 md:w-24 h-16 md:h-24 text-green-600" />,
        error: <XCircle className="w-16 md:w-24 h-16 md:h-24 text-red-600" />,
        warning: <AlertCircle className="w-16 md:w-24 h-16 md:h-24 text-yellow-600" />
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
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm md:max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className={`w-32 h-32 md:w-48 md:h-48 ${bgColors[type]} rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-inner`}>
                    {icons[type]}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">{title}</h2>
                <p className={`${textColors[type]} font-semibold text-base md:text-lg mb-4 md:mb-6`}>{message}</p>
                <button 
                    onClick={onClose}
                    className="px-6 md:px-8 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider text-sm md:text-base"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm md:max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-yellow-50 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-inner">
                    <AlertCircle className="w-16 h-16 md:w-24 md:h-24 text-yellow-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">{title}</h2>
                <p className="text-gray-600 font-medium text-base md:text-lg mb-6 md:mb-8">{message}</p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider text-sm md:text-base"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider text-sm md:text-base"
                    >
                        Ya, Lanjutkan
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

const DetailKegiatan = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua Shift');
    const [selectedTransporter, setSelectedTransporter] = useState('Semua Transporter');
    const [filteredTruk, setFilteredTruk] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUpdatingComplete, setIsUpdatingComplete] = useState(false);

    const [modalSize, setModalSize] = useState({ width: 520, height: 320, isMax: false });
    const [modalPos, setModalPos] = useState({ x: (window.innerWidth - 520) / 2, y: 80 });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 640);

    const [trukTersediaPerBaris, setTrukTersediaPerBaris] = useState([]);
    const [isLoadingTruk, setIsLoadingTruk] = useState(false);

    const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    
    // 🔥 STATE untuk Manual Input Modal (Create & Edit)
    const [isManualInputOpen, setIsManualInputOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedTrukForEdit, setSelectedTrukForEdit] = useState(null);

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

    useEffect(() => {
        const onResize = () => setIsSmallScreen(window.innerWidth <= 640);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const startDrag = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPos = { ...modalPos };
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            setModalPos({ x: Math.max(8, Math.min(window.innerWidth - 80, startPos.x + dx)), y: Math.max(8, Math.min(window.innerHeight - 40, startPos.y + dy)) });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const startResizeEdge = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = modalSize.width;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const newW = Math.max(300, Math.min(window.innerWidth - 40 - modalPos.x, startW + dx));
            setModalSize(prev => ({ ...prev, width: newW }));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const startResizeCorner = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = modalSize.width;
        const startH = modalSize.height;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const newW = Math.max(300, Math.min(window.innerWidth - 40 - modalPos.x, startW + dx));
            const newH = Math.max(120, Math.min(window.innerHeight - 40 - modalPos.y, startH + dy));
            setModalSize(prev => ({ ...prev, width: newW, height: newH }));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const toggleMinimize = () => setIsMinimized(prev => !prev);
    const toggleMaximize = () => {
        setModalSize(prev => ({ ...prev, isMax: !prev.isMax }));
        if (!modalSize.isMax) setModalPos({ x: 20, y: 20 });
    };

    const no_po = window.location.pathname.split('/').pop();

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/${no_po}`);
            const json = await res.json();
            console.log('📦 Data fetched:', json);
            setData(json);
            setFilteredTruk(json.truk || []);
        } catch (err) {
            console.error(err);
            showModal('error', 'Gagal Memuat', 'Tidak dapat mengambil detail kegiatan.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDetail(); }, [no_po]);

    useEffect(() => {
        if (data?.transporters?.length === 1) {
            setSelectedTransporter(data.transporters[0].nama_transporter);
        }
    }, [data]);

    const transporterList = data?.transporters || [];
    const hasMultipleTransporters = transporterList.length > 1;

    const computedStatistik = () => {
        if (!data?.truk) return { total_truk: 0, terverifikasi: 0, tidak_valid: 0 };
        let truksToCount = data.truk;
        if (selectedTransporter !== 'Semua Transporter') {
            truksToCount = data.truk.filter(t => t.nama_transporter === selectedTransporter);
        }
        return {
            total_truk: truksToCount.length,
            terverifikasi: truksToCount.filter(t => t.status === 'Valid').length,
            tidak_valid: truksToCount.filter(t => t.status === 'Tolak').length
        };
    };

    const computedStatus = () => {
        if (!data) return null;
        if (selectedTransporter === 'Semua Transporter') {
            return null;
        } else {
            const transporterData = transporterList.find(t => t.nama_transporter === selectedTransporter);
            return transporterData?.status || 'Waiting';
        }
    };

    const displayedTransporter = () => {
        if (!transporterList || transporterList.length === 0) return '-';
        if (transporterList.length === 1) return transporterList[0].nama_transporter;
        
        if (selectedTransporter === 'Semua Transporter') {
            return transporterList.map(t => t.nama_transporter).join(', ');
        }
        return selectedTransporter;
    };

    useEffect(() => {
        if (!data?.truk) return;
        let temp = [...data.truk];
        if (selectedTransporter !== 'Semua Transporter') {
            temp = temp.filter(t => t.nama_transporter === selectedTransporter);
        }
        if (statusFilter !== 'Semua Shift') {
            temp = temp.filter(t => t.nama_shift === statusFilter);
        }
        if (selectedDate) {
            temp = temp.filter(t => {
                try { return new Date(t.created_at).toISOString().slice(0,10) === selectedDate; } catch (e) { return false; }
            });
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            temp = temp.filter(t =>
                (t.nopol || '').toLowerCase().includes(q) ||
                (t.nama_personil || '').toLowerCase().includes(q) ||
                (t.no_seri_pengantar || '').toLowerCase().includes(q)
            );
        }
        setFilteredTruk(temp);
    }, [searchQuery, statusFilter, selectedTransporter, data, selectedDate]);

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // 🔥 PERBAIKAN: Format DateTime tanpa AM/PM (format 24 jam)
    const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const dataURLToBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], { type: mime });
    };

    const downloadImage = async () => {
        if (!selectedImage?.src) return;
        try {
            let blob;
            const src = selectedImage.src;
            if (src.startsWith('data:')) {
                blob = dataURLToBlob(src);
            } else {
                const res = await fetch(src);
                if (!res.ok) throw new Error('Gagal mengambil file');
                blob = await res.blob();
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const baseName = selectedImage.type === 'foto_truk' ? (selectedImage.nopol || 'foto') : (selectedImage.no_seri_pengantar || 'surat');
            const filename = `${baseName}_${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`;
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            showModal('error', 'Gagal Download', 'Tidak dapat mendownload gambar. Pastikan file tersedia.');
        }
    };

    const handleToggleComplete = async () => {
        if (!data?.kegiatan) return;

        const currentSelected = transporterList.length === 1 ? transporterList[0].nama_transporter : selectedTransporter;

        if (currentSelected === 'Semua Transporter') {
            showModal('warning', 'Pilih Transporter', "Silakan pilih salah satu transporter terlebih dahulu untuk mengubah status.");
            return;
        }

        const transporterData = transporterList.find(t => t.nama_transporter === currentSelected);
        
        if (!transporterData) {
            showModal('error', 'Data Tidak Ditemukan', `Data untuk transporter '${currentSelected}' tidak ditemukan.`);
            return;
        }

        const currentStatus = transporterData.status;
        const statistik = computedStatistik();
        const totalTruk = statistik.total_truk;
        
        const newStatus = currentStatus === 'Completed' 
            ? (totalTruk > 0 ? 'On Progress' : 'Waiting') 
            : 'Completed';

        const confirmTitle = newStatus === 'Completed' ? 'Tandai Selesai?' : 'Batalkan Selesai?';
        const confirmMessage = newStatus === 'Completed'
            ? `Tandai transporter ${currentSelected} untuk PO ${kegiatan.no_po} telah selesai?`
            : `Batalkan penandaan selesai untuk transporter ${currentSelected}?`;

        showConfirm(confirmTitle, confirmMessage, async () => {
            setIsUpdatingComplete(true);
            closeConfirm();

            try {
                console.log("📤 Mengirim Request ke Backend...");
                
                const res = await fetch(`${API_BASE_URL}/api/kegiatan/update-transporter-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        no_po: kegiatan.no_po,
                        transporter_id: transporterData.kegiatan_transporter_id,
                        status: newStatus 
                    })
                });

                const textResponse = await res.text(); 
                if (!res.ok) {
                    throw new Error(`Server Error (${res.status}): ${textResponse}`);
                }

                await fetchDetail(); 
                showModal('success', 'Berhasil', 'Status berhasil diubah!');

            } catch (err) {
                console.error('❌ Error Detail:', err);
                showModal('error', 'Gagal', err.message);
            } finally {
                setIsUpdatingComplete(false);
            }
        });
    };

    // 🔥 PERBAIKAN: FUNGSI EDIT - Pastikan semua data terkirim lengkap
    const handleEditRow = async (truk) => {
        console.log('🔧 Opening Edit Modal for:', truk);
        
        if (!truk || !data?.kegiatan?.id) {
            showModal('error', 'Gagal', 'Data kegiatan belum siap.');
            return;
        }

        if (!truk.transporter_id) {
            console.error('❌ transporter_id tidak ditemukan pada truk:', truk);
            showModal('error', 'Gagal', 'ID Transporter tidak ditemukan. Refresh halaman dan coba lagi.');
            return;
        }

        // Load kendaraan alokasi untuk dropdown
        setIsLoadingTruk(true);
        setTrukTersediaPerBaris([]);
        
        try {
            const url = `${API_BASE_URL}/api/kegiatan/truk-alokasi/${data.kegiatan.id}/${truk.transporter_id}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`API Error ${res.status}: ${errorText}`);
            }
            
            const json = await res.json();
            
            if (Array.isArray(json) && json.length > 0) {
                setTrukTersediaPerBaris(json);
            } else {
                setTrukTersediaPerBaris([{ id: 0, plat_nomor: truk.nopol }]);
            }

            // 🔥 PERBAIKAN: Pastikan semua data terkirim ke modal (termasuk ID untuk update)
            const editDataComplete = {
                ...truk,
                id: truk.id, // PENTING: ID untuk endpoint PUT /api/keberangkatan/:id
                kegiatan_id: data.kegiatan.id,
                transporter_id: truk.transporter_id,
                nopol: truk.nopol,
                nama_personil: truk.nama_personil,
                shift_id: truk.shift_id,
                created_at: truk.created_at,
                no_seri_pengantar: truk.no_seri_pengantar,
                foto_truk: truk.foto_truk,
                foto_surat: truk.foto_surat,
                keterangan: truk.keterangan,
                status: truk.status
            };

            console.log('📦 Edit Data Complete:', editDataComplete);

            setSelectedTrukForEdit(editDataComplete);
            setIsEditMode(true);
            setIsManualInputOpen(true);
            
        } catch (err) {
            console.error("❌ Error fetch alokasi:", err);
            showModal('error', 'Gagal Memuat Data', `Tidak dapat memuat daftar truk: ${err.message}`);
        } finally {
            setIsLoadingTruk(false);
        }
    };

    if (loading) return <LoadingScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;
    if (!data) return <NoDataScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;

    const { kegiatan } = data;
    const shifts = [...new Set(data.truk.map(t => t.nama_shift))];
    const statistik = computedStatistik();

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

            {/* 🔥 MANUAL INPUT MODAL (Support Create & Edit) */}
            <ManualInputModal
                isOpen={isManualInputOpen}
                onClose={() => {
                    setIsManualInputOpen(false);
                    setIsEditMode(false);
                    setSelectedTrukForEdit(null);
                    setTrukTersediaPerBaris([]);
                }}
                onSuccess={fetchDetail}
                kegiatanData={data?.kegiatan}
                transporterList={transporterList}
                // 🆕 Props untuk Edit Mode
                editMode={isEditMode}
                editData={selectedTrukForEdit}
            />

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <div className="flex-1 overflow-y-auto p-3 md:p-6">

                    <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-4 md:mb-6 transition-colors text-sm md:text-base">
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="font-medium">Kembali ke Daftar Kegiatan</span>
                    </button>

                    {hasMultipleTransporters && (
                        <TransporterDropdown 
                            transporterList={transporterList}
                            selectedTransporter={selectedTransporter}
                            setSelectedTransporter={setSelectedTransporter}
                        />
                    )}

                    <HeaderPO 
                        kegiatan={kegiatan} 
                        formatDate={formatDate} 
                        displayedTransporter={displayedTransporter()}
                        computedStatus={computedStatus()}
                    />

                    <StatistikCards statistik={statistik} />

                    {/* 🔥 TOMBOL INPUT MANUAL */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setIsManualInputOpen(true)}
                            className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} className="hidden sm:inline" />
                            <Plus size={16} className="sm:hidden" />
                            <span className="text-sm md:text-base">Tambah List Truk</span>
                        </button>
                    </div>

                    <FilterBar 
                        shifts={shifts} 
                        searchQuery={searchQuery} 
                        setSearchQuery={setSearchQuery} 
                        statusFilter={statusFilter} 
                        setStatusFilter={setStatusFilter} 
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                    />

                    <TrukTable 
                        trukList={filteredTruk} 
                        setSelectedImage={setSelectedImage} 
                        formatDateTime={formatDateTime}
                        handleEditRow={handleEditRow}
                    />

                    <div className="flex justify-end mt-4">
                        {(selectedTransporter !== 'Semua Transporter' || transporterList.length === 1) && (
                            <button
                                onClick={handleToggleComplete}
                                disabled={!statistik.total_truk || isUpdatingComplete}
                                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold disabled:opacity-60 ${
                                    transporterList.find(t => t.nama_transporter === (transporterList.length === 1 ? transporterList[0].nama_transporter : selectedTransporter))?.status === 'Completed'
                                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                {transporterList.find(t => t.nama_transporter === (transporterList.length === 1 ? transporterList[0].nama_transporter : selectedTransporter))?.status === 'Completed'
                                    ? 'Batalkan Kegiatan Selesai'
                                    : 'Tandai Kegiatan Selesai'}
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {selectedImage && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <div className="absolute" style={{ left: isSmallScreen ? 8 : modalPos.x, top: isSmallScreen ? 8 : modalPos.y, width: isSmallScreen ? 'calc(100vw - 16px)' : (modalSize.isMax ? 'calc(100vw - 40px)' : modalSize.width), height: isSmallScreen ? 'calc(100vh - 16px)' : (modalSize.isMax ? 'calc(100vh - 40px)' : (isMinimized ? 40 : modalSize.height)) }}>
                        <div className="bg-white rounded-lg overflow-hidden shadow-lg pointer-events-auto relative" onClick={e => e.stopPropagation()}>
                            <div onMouseDown={startDrag} className="px-3 py-2 bg-gray-50 flex items-center justify-between gap-3 cursor-move select-none">
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold text-gray-800">
                                        {selectedImage.type === 'foto_truk' ? (
                                            <div>
                                                <div>{selectedImage.nopol}</div>
                                                {selectedImage.tanggal && <div className="text-xs text-gray-500">{formatDateTime(selectedImage.tanggal)}</div>}
                                            </div>
                                        ) : (
                                            <div>
                                                <div>{selectedImage.no_seri_pengantar}</div>
                                                {selectedImage.tanggal && <div className="text-xs text-gray-500">{formatDateTime(selectedImage.tanggal)}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={downloadImage} className="text-gray-700 hover:text-gray-900 mr-1" title="Download">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    </button>
                                    <button onClick={toggleMaximize} className="text-gray-600 hover:text-gray-900" title="Maximize">☐</button>
                                    <button onClick={() => setSelectedImage(null)} className="text-gray-700 hover:text-gray-900 text-xl" aria-label="Close">×</button>
                                </div>
                            </div>

                            {!isMinimized && (
                                <div className="bg-white p-4 flex items-center justify-center h-full">
                                    <div style={{ width: '100%', height: '100%' }} className="flex items-center justify-center bg-gray-100">
                                        <img src={selectedImage.src} alt="Preview" className="object-contain w-full h-full rounded-md" />
                                    </div>
                                </div>
                            )}

                            <div onMouseDown={startResizeEdge} className="absolute top-1/3 right-0 -translate-x-1/2 w-3 h-8 cursor-ew-resize" title="Resize width">
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-6 h-1 bg-gray-300 rounded"></div>
                                </div>
                            </div>

                            <div onMouseDown={startResizeCorner} className="absolute bottom-2 right-2 w-4 h-4 cursor-se-resize bg-gray-200 rounded-sm" title="Resize"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LoadingScreen = ({ isSidebarOpen, onToggle }) => (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={onToggle} />
        <div className="flex-1 flex flex-col min-w-0">
            <Topbar onToggleSidebar={onToggle} />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500">Memuat data...</div>
            </div>
        </div>
    </div>
);

const NoDataScreen = ({ isSidebarOpen, onToggle }) => (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={onToggle} />
        <div className="flex-1 flex flex-col min-w-0">
            <Topbar onToggleSidebar={onToggle} />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-red-500">Data tidak ditemukan</div>
            </div>
        </div>
    </div>
);

const HeaderPO = ({ kegiatan, formatDate, displayedTransporter, computedStatus }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">PO {kegiatan.no_po}</h1>
        <div className="mb-4 md:mb-6">
            <h2 className="text-xs md:text-sm font-semibold text-gray-700 mb-3 md:mb-4">Informasi PO</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-4">
                <InfoRow label="No PO" value={kegiatan.no_po} />
                <InfoRow label="Transporter" value={displayedTransporter} />
                <InfoRow label="Material" value={kegiatan.material || '-'} />
                <InfoRow label="Incoterm" value={kegiatan.incoterm || '-'} />
                <InfoRow label="No BL" value={kegiatan.no_bl || '-'} />
                <InfoRow label="Quantity" value={`${kegiatan.quantity} Ton`} />
                <InfoRow label="Vendor" value={kegiatan.vendor} />
                <InfoRow label="Nama Kapal" value={kegiatan.nama_kapal || '-'} />
                {computedStatus && <InfoRow label="Status" value={<StatusPOBadge status={computedStatus} />} />}
                <InfoRow label="Tanggal Mulai" value={formatDate(kegiatan.tanggal_mulai)} />
                <InfoRow label="Tanggal Selesai" value={formatDate(kegiatan.tanggal_selesai)} />
            </div>
        </div>
    </div>
);

const TransporterDropdown = ({ transporterList, selectedTransporter, setSelectedTransporter }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Pilih Transporter</label>
        <select 
            value={selectedTransporter} 
            onChange={(e) => setSelectedTransporter(e.target.value)}
            className="w-full md:w-64 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 text-xs md:text-sm"
        >
            <option>Semua Transporter</option>
            {transporterList.map(t => (
                <option key={t.kegiatan_transporter_id}>{t.nama_transporter}</option>
            ))}
        </select>
    </div>
);

const StatistikCards = ({ statistik }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <StatCard title="Total Truk" value={statistik.total_truk} bgColor="bg-yellow-50" textColor="text-yellow-700" />
        <StatCard title="Total Truk yang Valid" value={statistik.terverifikasi} bgColor="bg-green-50" textColor="text-green-700" />
        <StatCard title="Total Truk yang Tidak Valid" value={statistik.tidak_valid || 0} bgColor="bg-red-50" textColor="text-red-700" />
    </div>
);

const FilterBar = ({ shifts, searchQuery, setSearchQuery, statusFilter, setStatusFilter, selectedDate, setSelectedDate }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input 
                    type="text" 
                    placeholder="Cari nomor plat..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="block w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent text-sm transition-all" 
                />
            </div>
            
            {/* Shift Dropdown */}
            <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="w-full sm:w-auto sm:min-w-[140px] px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent text-sm transition-all"
            >
                <option>Semua Shift</option>
                {shifts.map(shift => <option key={shift}>{shift}</option>)}
            </select>
            
            {/* Date Input with Calendar Icon */}
            <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)} 
                    className="block w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent text-sm transition-all" 
                    style={{ colorScheme: 'light' }}
                />
            </div>
        </div>
    </div>
);

// 🆕 SIMPLIFIED TRUK TABLE (Tanpa Inline Editing)
const TrukTable = ({ 
    trukList, 
    setSelectedImage, 
    formatDateTime, 
    handleEditRow
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-red-600 text-white">
                        <Th>Transporter</Th>
                        <Th>Tanggal & Jam</Th>
                        <Th>Shift</Th>
                        <Th>Nama Personil</Th>
                        <Th>Plat Nomor</Th>
                        <Th>No Seri Pengantar</Th>
                        <Th>Foto Truk</Th>
                        <Th>Foto Surat</Th>
                        <Th>Keterangan</Th>
                        <Th>Status Verifikasi</Th>
                        <Th>Aksi</Th>
                    </tr>
                </thead>
                <tbody>
                    {trukList.length === 0 ? (
                        <tr>
                            <td colSpan="11" className="px-4 md:px-6 py-8 md:py-12 text-center">
                                <Truck className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                                <p className="text-gray-500 font-medium text-sm md:text-base">Tidak ada data truk</p>
                                <p className="text-xs md:text-sm text-gray-400 mt-1">Belum ada truk yang terdaftar</p>
                            </td>
                        </tr>
                    ) : (
                        trukList.map((truk, index) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                <Td>
                                    <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] md:text-xs font-medium">
                                        {truk.nama_transporter || '-'}
                                    </span>
                                </Td>
                                <Td>{formatDateTime(truk.created_at)}</Td>
                                <Td>
                                    <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] md:text-xs font-medium">
                                        {truk.nama_shift}
                                    </span>
                                </Td>
                                <Td>{truk.nama_personil || '-'}</Td>
                                <Td>
                                    <span className="font-medium text-gray-900">{truk.nopol}</span>
                                </Td>
                                <Td>
                                    <span className="text-gray-500">{truk.no_seri_pengantar || '-'}</span>
                                </Td>
                                <Td>
                                    {truk.foto_truk ? (
                                        <button 
                                            onClick={() => setSelectedImage({ 
                                                src: getPhotoUrl(truk.foto_truk), 
                                                type: 'foto_truk', 
                                                nopol: truk.nopol, 
                                                tanggal: truk.created_at 
                                            })} 
                                            className="text-blue-600 hover:text-blue-800 text-xs md:text-sm underline"
                                        >
                                            Lihat Foto
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs md:text-sm">-</span>
                                    )}
                                </Td>
                                <Td>
                                    {truk.foto_surat ? (
                                        <button 
                                            onClick={() => setSelectedImage({ 
                                                src: getPhotoUrl(truk.foto_surat), 
                                                type: 'foto_surat', 
                                                no_seri_pengantar: truk.no_seri_pengantar, 
                                                tanggal: truk.created_at 
                                            })} 
                                            className="text-blue-600 hover:text-blue-800 text-xs md:text-sm underline"
                                        >
                                            Lihat Foto
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs md:text-sm">-</span>
                                    )}
                                </Td>
                                <Td>
                                    <span className="text-xs md:text-sm font-medium text-gray-700">
                                        {truk.keterangan && truk.keterangan.trim() !== '' ? truk.keterangan : '-'}
                                    </span>
                                </Td>
                                <Td>
                                    {truk.status === 'Valid' ? (
                                        <span className="inline-flex px-2 md:px-3 py-1 md:py-1.5 bg-green-100 text-green-700 rounded text-[10px] md:text-sm font-medium items-center gap-1 md:gap-1.5">
                                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> 
                                            <span className="hidden sm:inline">Valid</span>
                                        </span>
                                    ) : truk.status === 'Tolak' ? (
                                        <span className="inline-flex px-2 md:px-3 py-1 md:py-1.5 bg-red-100 text-red-700 rounded text-[10px] md:text-sm font-medium items-center gap-1 md:gap-1.5">
                                            <XCircle className="w-3 h-3 md:w-4 md:h-4" /> 
                                            <span className="hidden sm:inline">Tolak</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex px-2 md:px-3 py-1 md:py-1.5 bg-yellow-100 text-yellow-700 rounded text-[10px] md:text-sm font-medium">
                                            Waiting
                                        </span>
                                    )}
                                </Td>
                                <Td>
                                    <button
                                        onClick={() => handleEditRow(truk)}
                                        className="p-1 md:p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                        title="Edit"
                                    >
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="w-3.5 h-3.5 md:w-4 md:h-4" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        >
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
        <span className="text-xs md:text-sm text-gray-500">{label}</span>
        <span className="text-xs md:text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
);

const StatusPOBadge = ({ status }) => (
    <span className={`inline-flex px-2 py-1 rounded text-[10px] md:text-xs font-semibold ${
        status === 'Completed' ? 'bg-green-100 text-green-700' :
        status === 'On Progress' ? 'bg-blue-100 text-blue-700' :
        'bg-yellow-100 text-yellow-700'
    }`}>{status}</span>
);

const StatCard = ({ title, value, bgColor, textColor }) => (
    <div className={`${bgColor} rounded-lg md:rounded-xl p-3 md:p-5 border border-gray-200`}>
        <p className="text-xs md:text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-xl md:text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
);

const Th = ({ children }) => <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-sm font-semibold whitespace-nowrap">{children}</th>;
const Td = ({ children }) => <td className="px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-sm text-gray-700 whitespace-nowrap">{children}</td>;

export default DetailKegiatan;