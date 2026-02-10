import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, Search, MapPin, Clock, CheckCircle, XCircle, Image as ImageIcon, FileText, FileDown, Calendar } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useParams } from 'react-router-dom';
import PreviewLaporan from './PreviewLaporan';
import PreviewLaporanAll from './PreviewLaporanAll';
import UnduhLaporanTrukAir from './UnduhLaporanTrukAir';
import API_BASE_URL from '../config/api';

const API = `${API_BASE_URL}/api/water-truck`;

const getPhotoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

const splitPhotos = (photoString) => {
  if (!photoString) return [];
  return photoString.split(',').map(p => p.trim()).filter(p => p);
};

const Modal = ({ isOpen, onClose, type = 'success', title, message }) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-16 md:w-24 h-16 md:h-24 text-green-600" />,
    error: <XCircle className="w-16 md:w-24 h-16 md:h-24 text-red-600" />,
    warning: <Clock className="w-16 md:w-24 h-16 md:h-24 text-yellow-600" />
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

const DetailTrukAir = () => {
  const { id } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLaporan, setFilteredLaporan] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState('Semua Transporter');

  const [modalSize, setModalSize] = useState({ width: 520, height: 320, isMax: false });
  const [modalPos, setModalPos] = useState({ x: (window.innerWidth - 520) / 2, y: 80 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 640);

  const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [previewLaporan, setPreviewLaporan] = useState(null);
  const [previewAll, setPreviewAll] = useState(false);
  const [showUnduhModal, setShowUnduhModal] = useState(false);

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: 'success', title: '', message: '' });
  };

  const handlePrintPreview = (laporan) => {
    setPreviewLaporan(laporan);
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
      const filename = `${selectedImage.label}_${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`;
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

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/detail/${id}`);
      const json = await res.json();
      console.log('📦 Data fetched:', json);
      
      if (json.status === 'Success' && json.data) {
        setData(json.data);
        setFilteredLaporan(json.data.laporan || []);
      } else {
        showModal('error', 'Gagal Memuat', 'Data tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      showModal('error', 'Gagal Memuat', 'Tidak dapat mengambil detail truk air.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDetail(); 
  }, [id]);

  useEffect(() => {
    if (data?.transporters?.length === 1) {
      setSelectedTransporter(data.transporters[0].nama_transporter);
    }
  }, [data]);

  useEffect(() => {
    if (!data?.laporan) return;
    let temp = [...data.laporan];

    if (selectedTransporter !== 'Semua Transporter') {
      temp = temp.filter(lap => lap.nama_transporter === selectedTransporter);
    }

    if (selectedDate) {
      temp = temp.filter(lap => {
        try { 
          return new Date(lap.created_at).toISOString().slice(0,10) === selectedDate; 
        } catch (e) { 
          return false; 
        }
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter(lap =>
        (lap.plat_nomor_truk_air || '').toLowerCase().includes(q) ||
        (lap.nama_petugas || '').toLowerCase().includes(q) ||
        (lap.lokasi_pembersihan || '').toLowerCase().includes(q)
      );
    }

    setFilteredLaporan(temp);
  }, [searchQuery, selectedDate, selectedTransporter, data]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <LoadingScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;
  if (!data) return <NoDataScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;

  const { kegiatan, transporter, laporan } = data;

  const transporterList = data.transporters || [];
  const hasMultipleTransporters = transporterList.length > 1;

  const computedStatistik = () => {
    let laporanToCount = laporan;
    if (selectedTransporter !== 'Semua Transporter') {
      laporanToCount = laporan.filter(l => l.nama_transporter === selectedTransporter);
    }
    
    return {
      total_laporan: laporanToCount.length,
      completed: laporanToCount.filter(l => l.status === 'Completed').length,
      draft: laporanToCount.filter(l => l.status === 'Draft').length,
      total_truk_air: laporanToCount.reduce((sum, l) => {
        const count = l.plat_nomor_truk_air ? l.plat_nomor_truk_air.split(',').length : 0;
        return sum + count;
      }, 0)
    };
  };

  const statistik = computedStatistik();

  const displayedTransporter = () => {
    if (!transporterList || transporterList.length === 0) return transporter || '-';
    if (transporterList.length === 1) return transporterList[0].nama_transporter;
    
    if (selectedTransporter === 'Semua Transporter') {
      return transporterList.map(t => t.nama_transporter).join(', ');
    }
    return selectedTransporter;
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Modal 
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      {previewLaporan && (
        <PreviewLaporan 
          laporan={previewLaporan}
          onClose={() => setPreviewLaporan(null)}
          kegiatan={kegiatan}
          formatDateTime={formatDateTime}
          allTransporters={selectedTransporter === 'Semua Transporter' ? transporterList : null}
        />
      )}

      {previewAll && (
        <PreviewLaporanAll
          laporanList={filteredLaporan}
          onClose={() => setPreviewAll(false)}
        />
      )}

      {showUnduhModal && (
        <UnduhLaporanTrukAir
          isOpen={showUnduhModal}
          onClose={() => setShowUnduhModal(false)}
          laporanList={filteredLaporan}
          kegiatan={kegiatan}
          transporter={displayedTransporter()} 
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-6">

          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-4 md:mb-6 transition-colors text-sm md:text-base">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Kembali ke Daftar Truk Air</span>
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
            displayedTransporter={displayedTransporter()}
            formatDate={formatDate} 
          />

          <StatistikCards statistik={statistik} />

          <FilterBar 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />

          {/* Tombol Preview & Unduh - RESPONSIVE */}
          {filteredLaporan.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
              <button
                onClick={() => setPreviewAll(true)}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Preview Semua Laporan</span>
              </button>

              <button
                onClick={() => setShowUnduhModal(true)}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-colors shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Unduh Laporan</span>
              </button>
            </div>
          )}

          <LaporanTable 
            laporanList={filteredLaporan} 
            setSelectedImage={setSelectedImage} 
            formatDateTime={formatDateTime}
            handlePrintPreview={handlePrintPreview}
            showTransporterColumn={selectedTransporter === 'Semua Transporter' && hasMultipleTransporters}
          />

        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute" style={{ left: isSmallScreen ? 8 : modalPos.x, top: isSmallScreen ? 8 : modalPos.y, width: isSmallScreen ? 'calc(100vw - 16px)' : (modalSize.isMax ? 'calc(100vw - 40px)' : modalSize.width), height: isSmallScreen ? 'calc(100vh - 16px)' : (modalSize.isMax ? 'calc(100vh - 40px)' : (isMinimized ? 40 : modalSize.height)) }}>
            <div className="bg-white rounded-lg overflow-hidden shadow-lg pointer-events-auto relative" onClick={e => e.stopPropagation()}>
              <div onMouseDown={startDrag} className="px-3 py-2 bg-gray-50 flex items-center justify-between gap-3 cursor-move select-none">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-800">
                    <div>{selectedImage.label}</div>
                    {selectedImage.tanggal && <div className="text-xs text-gray-500">{formatDateTime(selectedImage.tanggal)}</div>}
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
        <option key={t.id}>{t.nama_transporter}</option>
      ))}
    </select>
  </div>
);

const HeaderPO = ({ kegiatan, displayedTransporter, formatDate }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
    <h1 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">PO {kegiatan.no_po}</h1>
    <div className="mb-4 md:mb-6">
      <h2 className="text-xs md:text-sm font-semibold text-gray-700 mb-3 md:mb-4">Informasi Kegiatan</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-4">
        <InfoRow label="No PO" value={kegiatan.no_po} />
        <InfoRow label="Transporter" value={displayedTransporter} />
        <InfoRow label="Material" value={kegiatan.material || '-'} />
        <InfoRow label="Incoterm" value={kegiatan.incoterm || '-'} />
        <InfoRow label="No BL" value={kegiatan.no_bl || '-'} />
        <InfoRow label="Quantity" value={`${kegiatan.quantity} Ton`} />
        <InfoRow label="Vendor" value={kegiatan.nama_vendor} />
        <InfoRow label="Nama Kapal" value={kegiatan.nama_kapal || '-'} />
        <InfoRow label="Tanggal Mulai" value={formatDate(kegiatan.tanggal_mulai)} />
        <InfoRow label="Tanggal Selesai" value={formatDate(kegiatan.tanggal_selesai)} />
      </div>
    </div>
  </div>
);

const StatistikCards = ({ statistik }) => (
  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
    <StatCard title="Total Laporan" value={statistik.total_laporan} bgColor="bg-blue-50" textColor="text-blue-700" />
    <StatCard title="Total Truk Air" value={statistik.total_truk_air} bgColor="bg-green-50" textColor="text-green-700" />
    <StatCard title="Completed" value={statistik.completed} bgColor="bg-green-50" textColor="text-green-700" />
    <StatCard title="Draft" value={statistik.draft} bgColor="bg-yellow-50" textColor="text-yellow-700" />
  </div>
);

const FilterBar = ({ searchQuery, setSearchQuery, selectedDate, setSelectedDate }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
        <input 
          type="text" 
          placeholder="Cari plat nomor, nama patroler..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="block w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent text-sm transition-all" 
        />
      </div>
      
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

const LaporanTable = ({ laporanList, setSelectedImage, formatDateTime, handlePrintPreview, showTransporterColumn }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-red-600 text-white">
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Tanggal & Jam
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Nama Patroler
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Area Pembersihan
            </th>
            {showTransporterColumn && (
              <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
                Transporter
              </th>
            )}
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Plat Nomor Truk Air
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Foto Truk Air
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Foto Sebelum
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Foto Sedang
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Foto Setelah
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold border-r border-red-500/30 whitespace-nowrap">
              Status
            </th>
            <th className="px-2 md:px-3 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold whitespace-nowrap">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {laporanList.length === 0 ? (
            <tr>
              <td colSpan={showTransporterColumn ? "11" : "10"} className="px-4 md:px-6 py-8 md:py-12 text-center">
                <Truck className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium text-sm md:text-base">Tidak ada data laporan</p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">Belum ada laporan pembersihan jalan</p>
              </td>
            </tr>
          ) : (
            laporanList.map((lap, index) => {
              const fotoTrukArr = splitPhotos(lap.foto_truk_air);
              const fotoSebelumArr = splitPhotos(lap.foto_sebelum);
              const fotoSedangArr = splitPhotos(lap.foto_sedang);
              const fotoSetelahArr = splitPhotos(lap.foto_setelah);
              const platNomorArr = lap.plat_nomor_truk_air ? lap.plat_nomor_truk_air.split(',').map(p => p.trim()) : [];

              return (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200 whitespace-nowrap">
                    {formatDateTime(lap.created_at)}
                  </td>
                  
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {lap.nama_petugas || '-'}
                    </div>
                    {lap.no_telp_petugas && (
                      <div className="text-[10px] md:text-xs text-black-600 font-semibold whitespace-nowrap mt-0.5">
                        {lap.no_telp_petugas}
                      </div>
                    )}
                  </td>

                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <div className="flex items-start gap-1 max-w-xs">
                      <span className="text-gray-800 font-medium leading-tight">
                        {lap.lokasi_pembersihan || '-'}
                      </span>
                    </div>
                  </td>

                  {showTransporterColumn && (
                    <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                      <div className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] md:text-xs font-semibold whitespace-nowrap">
                        {lap.nama_transporter || '-'}
                      </div>
                    </td>
                  )}
                  
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    {platNomorArr.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {platNomorArr.map((plat, idx) => (
                          <div key={idx} className="inline-flex items-center justify-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] md:text-xs font-bold whitespace-nowrap">
                            {plat}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <PhotoCell 
                      photos={fotoTrukArr} 
                      label="Foto Truk Air"
                      onImageClick={(src) => setSelectedImage({ src: getPhotoUrl(src), label: 'Foto Truk Air', tanggal: lap.created_at })}
                    />
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <PhotoCell 
                      photos={fotoSebelumArr} 
                      label="Foto Sebelum"
                      onImageClick={(src) => setSelectedImage({ src: getPhotoUrl(src), label: 'Foto Sebelum', tanggal: lap.jam_foto_sebelum })}
                      timestamp={lap.jam_foto_sebelum}
                      location={lap.lokasi_foto_sebelum}
                    />
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <PhotoCell 
                      photos={fotoSedangArr} 
                      label="Foto Sedang"
                      onImageClick={(src) => setSelectedImage({ src: getPhotoUrl(src), label: 'Foto Sedang', tanggal: lap.jam_foto_sedang })}
                      timestamp={lap.jam_foto_sedang}
                      location={lap.lokasi_foto_sedang}
                    />
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <PhotoCell 
                      photos={fotoSetelahArr} 
                      label="Foto Setelah"
                      onImageClick={(src) => setSelectedImage({ src: getPhotoUrl(src), label: 'Foto Setelah', tanggal: lap.jam_foto_setelah })}
                      timestamp={lap.jam_foto_setelah}
                      location={lap.lokasi_foto_setelah}
                    />
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top border-r border-gray-200">
                    <div className="flex justify-center">
                      {lap.status === 'Completed' ? (
                        <span className="inline-flex px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] md:text-xs font-medium items-center gap-1 whitespace-nowrap">
                          <CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] md:text-xs font-medium whitespace-nowrap">
                          Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-xs text-gray-700 align-top">
                    <button
                      onClick={() => handlePrintPreview(lap)}
                      className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-1 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap"
                      title="Lihat Preview Lengkap"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const PhotoCell = ({ photos, label, onImageClick, timestamp, location }) => {
  const [address, setAddress] = useState(''); 
  const [coordinates, setCoordinates] = useState('');
  const [isAddressResolved, setIsAddressResolved] = useState(false);

  useEffect(() => {
    const coordsRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
    
    if (location && coordsRegex.test(location) && !isAddressResolved) {
      const [lat, lon] = location.split(',').map(s => s.trim());
      
      setCoordinates(`${parseFloat(lat).toFixed(6)}, ${parseFloat(lon).toFixed(6)}`);
      
      const fetchAddress = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'MonitoringApp/1.0' } }
          );
          
          if (response.ok) {
            const data = await response.json();
            const addr = data.address;
            
            const detailParts = [
              addr.road || addr.pedestrian || addr.footway || addr.path,
              addr.suburb || addr.village || addr.neighbourhood || addr.hamlet,
              addr.city_district || addr.city || addr.town || addr.municipality,
              addr.state || addr.province,
            ].filter(Boolean);

            const fullAddress = detailParts.join(', ');
            
            if (fullAddress) {
              setAddress(fullAddress);
              setIsAddressResolved(true);
            }
          }
        } catch (error) {
          console.error("Gagal reverse geocoding:", error);
          setAddress(`GPS: ${coordinates}`);
          setIsAddressResolved(true);
        }
      };

      fetchAddress();
    } else if (location && !coordsRegex.test(location)) {
      setAddress(location);
      setIsAddressResolved(true);
    }
  }, [location, isAddressResolved, coordinates]);

  const formatTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getTruncatedAddress = (addr, maxLength = 50) => {
    if (!addr) return '';
    if (addr.length <= maxLength) return addr;
    return addr.substring(0, maxLength) + '...';
  };

  if (!photos || photos.length === 0) {
    return <span className="text-gray-400 text-[10px] md:text-xs">-</span>;
  }

  const truncatedAddress = getTruncatedAddress(address);
  const isAddressLong = address.length > 50;

  return (
    <div className="space-y-1.5 min-w-[120px] md:min-w-[160px]">
      <div className="flex flex-wrap gap-1">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => onImageClick(photo)}
            className="px-1.5 md:px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] md:text-xs hover:bg-blue-200 font-medium transition-colors whitespace-nowrap"
          >
            Foto {idx + 1}
          </button>
        ))}
      </div>
      
      {timestamp && (
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-500">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatTime(timestamp)}</span>
        </div>
      )}
      
      {address && (
        <div className="relative group">
          <div className="flex items-start gap-1 text-[10px] md:text-xs text-gray-600 leading-tight">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-500" />
            <span className="break-words">{truncatedAddress}</span>
          </div>
          
          {isAddressLong && (
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-xs whitespace-normal">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                <span className="break-words">{address}</span>
              </div>
              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-start py-2 border-b border-gray-100">
    <span className="text-xs md:text-sm text-gray-500">{label}</span>
    <span className="text-xs md:text-sm font-medium text-gray-900 text-right">{value}</span>
  </div>
);

const StatCard = ({ title, value, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-lg md:rounded-xl p-3 md:p-5 border border-gray-200`}>
    <p className="text-xs md:text-sm text-gray-600 mb-1">{title}</p>
    <p className={`text-xl md:text-3xl font-bold ${textColor}`}>{value}</p>
  </div>
);

export default DetailTrukAir;