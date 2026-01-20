import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, CheckCircle, XCircle, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const API = 'http://localhost:3000/api/kegiatan';

const DetailKegiatan = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Shift');
  const [selectedTransporter, setSelectedTransporter] = useState('Semua Transporter');
  const [filteredTruk, setFilteredTruk] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUpdatingComplete, setIsUpdatingComplete] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableKendaraan, setAvailableKendaraan] = useState([]);

  const [modalSize, setModalSize] = useState({ width: 520, height: 320, isMax: false });
  const [modalPos, setModalPos] = useState({ x: (window.innerWidth - 520) / 2, y: 80 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 640);

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
      setData(json);
      setFilteredTruk(json.truk || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [no_po]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [usersRes, kendaraanRes] = await Promise.all([
          fetch('http://localhost:3000/api/users'),
          fetch('http://localhost:3000/api/kendaraan')
        ]);
        const usersData = await usersRes.json();
        const kendaraanData = await kendaraanRes.json();
        setAvailableUsers(usersData);
        setAvailableKendaraan(kendaraanData);
      } catch (err) {
        console.error('Error fetching dropdown data:', err);
      }
    };
    fetchDropdownData();
  }, []);

  const transporterList = data?.transporters || [];
  const hasMultipleTransporters = transporterList.length > 1;

  const computedStatistik = () => {
    if (!data?.truk) return {
      total_truk: 0,
      belum_terverifikasi: 0,
      terverifikasi: 0,
      tidak_valid: 0
    };

    let truksToCount = data.truk;

    if (selectedTransporter !== 'Semua Transporter') {
      truksToCount = data.truk.filter(t => t.nama_transporter === selectedTransporter);
    }

    return {
      total_truk: truksToCount.length,
      belum_terverifikasi: truksToCount.filter(t => !t.status || t.status === 'Waiting').length,
      terverifikasi: truksToCount.filter(t => t.status === 'Valid').length,
      tidak_valid: truksToCount.filter(t => t.status === 'Tolak').length
    };
  };

  const computedStatus = () => {
    if (!data) return 'Waiting';
    
    if (selectedTransporter === 'Semua Transporter') {
      const hasAnyTruck = data.truk && data.truk.length > 0;
      return hasAnyTruck ? 'On Progress' : 'Waiting';
    } else {
      const truksInTransporter = (data.truk || []).filter(t => t.nama_transporter === selectedTransporter);
      return truksInTransporter.length > 0 ? 'On Progress' : 'Waiting';
    }
  };

  const displayedTransporter = () => {
    if (!transporterList || transporterList.length === 0) return '-';
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
        try {
          return new Date(t.created_at).toISOString().slice(0,10) === selectedDate;
        } catch (e) { return false; }
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
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dataURLToBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
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
      alert('Tidak dapat mendownload gambar. Pastikan file tersedia.');
    }
  };

  const handleToggleComplete = async () => {
    if (!data?.kegiatan) return;
    const kegiatan = data.kegiatan;
    const currentlyCompleted = kegiatan.status === 'Completed';
    const statistik = computedStatistik();
    const totalTruk = statistik.total_truk;
    const newStatus = currentlyCompleted ? (totalTruk > 0 ? 'On Progress' : 'Waiting') : 'Completed';

    const confirmMessage = newStatus === 'Completed'
      ? `Tandai Bahwasannya Kegiatan dengan PO ${kegiatan.no_po} Telah Selesai?`
      : `Batalkan penandaan kegiatan selesai untuk PO ${kegiatan.no_po}?`;

    if (!confirm(confirmMessage)) return;

    setIsUpdatingComplete(true);
    try {
      const res = await fetch(`http://localhost:3000/api/kegiatan/${kegiatan.no_po}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('SET STATUS FAILED', res.status, text);
        throw new Error(`Gagal mengubah status (${res.status}) ${text}`);
      }
      await fetchDetail();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal mengubah status kegiatan');
    } finally {
      setIsUpdatingComplete(false);
    }
  };

  const handleEditRow = (truk) => {
    setEditingRow(truk.id);
    setEditFormData({
      nopol: truk.nopol || '',
      nama_personil: truk.nama_personil || '',
      no_seri_pengantar: truk.no_seri_pengantar || '',
      keterangan: truk.keterangan || '',
      status: truk.status || 'Valid'
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (trukId) => {
    if (!confirm('Simpan perubahan data truk ini?')) return;

    try {
      if (!editFormData.nopol || !editFormData.nama_personil) {
        alert('Plat nomor dan nama personil harus diisi');
        return;
      }

      console.log('Sending update request:', {
        id: trukId,
        data: editFormData
      });

      const res = await fetch(`http://localhost:3000/api/keberangkatan/${trukId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      // Cek apakah response adalah JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.error('Received non-JSON response:', textResponse);
        throw new Error('Server mengembalikan response yang tidak valid. Pastikan route API sudah benar.');
      }

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || `Server error: ${res.status}`);
      }

      await fetchDetail();
      setEditingRow(null);
      setEditFormData({});
      alert('Data berhasil diperbarui');
    } catch (err) {
      console.error('Error detail:', err);
      alert(err.message || 'Gagal menyimpan perubahan');
    }
  };

  if (loading) return <LoadingScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;
  if (!data) return <NoDataScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;

  const { kegiatan } = data;
  const shifts = [...new Set(data.truk.map(t => t.nama_shift))];
  const statistik = computedStatistik();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
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
            editingRow={editingRow}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleEditRow={handleEditRow}
            handleCancelEdit={handleCancelEdit}
            handleSaveEdit={handleSaveEdit}
            availableUsers={availableUsers}
            availableKendaraan={availableKendaraan}
          />

          <div className="flex justify-end mt-4">
            <button
              onClick={handleToggleComplete}
              disabled={!statistik.total_truk || kegiatan.status === 'Waiting' || isUpdatingComplete}
              className={`px-4 py-2 rounded-lg disabled:opacity-60 ${
                kegiatan.status === 'Completed'
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {kegiatan.status === 'Completed'
                ? 'Batalkan Kegiatan Selesai'
                : 'Tandai Kegiatan Selesai'}
            </button>
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
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-6">PO {kegiatan.no_po}</h1>
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi PO</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <InfoRow label="No PO" value={kegiatan.no_po} />
        <InfoRow label="Transporter" value={displayedTransporter} />
        <InfoRow label="Material" value={kegiatan.material || '-'} />
        <InfoRow label="Incoterm" value={kegiatan.incoterm || '-'} />
        <InfoRow label="No BL" value={kegiatan.no_bl || '-'} />
        <InfoRow label="Quantity" value={`${kegiatan.quantity} Ton`} />
        <InfoRow label="Vendor" value={kegiatan.vendor} />
        <InfoRow label="Nama Kapal" value={kegiatan.nama_kapal || '-'} />
        <InfoRow label="Status" value={<StatusPOBadge status={computedStatus} />} />
        <InfoRow label="Tanggal Mulai" value={formatDate(kegiatan.tanggal_mulai)} />
        <InfoRow label="Tanggal Selesai" value={formatDate(kegiatan.tanggal_selesai)} />
      </div>
    </div>
  </div>
);

const TransporterDropdown = ({ transporterList, selectedTransporter, setSelectedTransporter }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
    <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Transporter</label>
    <select 
      value={selectedTransporter} 
      onChange={(e) => setSelectedTransporter(e.target.value)}
      className="w-full md:w-64 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 text-sm"
    >
      <option>Semua Transporter</option>
      {transporterList.map(t => (
        <option key={t.id}>{t.nama_transporter}</option>
      ))}
    </select>
  </div>
);

const StatistikCards = ({ statistik }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <StatCard title="Total Truk" value={statistik.total_truk} bgColor="bg-yellow-50" textColor="text-yellow-700" />
    <StatCard title="Total yang Belum Terverifikasi" value={statistik.belum_terverifikasi} bgColor="bg-orange-50" textColor="text-orange-700" />
    <StatCard title="Total Truk yang Valid" value={statistik.terverifikasi} bgColor="bg-green-50" textColor="text-green-700" />
    <StatCard title="Total Truk yang Tidak Valid" value={statistik.tidak_valid || 0} bgColor="bg-red-50" textColor="text-red-700" />
  </div>
);

const FilterBar = ({ shifts, searchQuery, setSearchQuery, statusFilter, setStatusFilter, selectedDate, setSelectedDate }) => (
  <div className="bg-gray-100 rounded-xl p-3 mb-6 w-full flex flex-col md:flex-row gap-3 items-start md:items-center">
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input type="text" placeholder="Cari nomor plat" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="block w-full pl-9 pr-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300 text-sm" />
    </div>
    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-36 lg:w-40 px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300 text-sm">
      <option>Semua Shift</option>
      {shifts.map(shift => <option key={shift}>{shift}</option>)}
    </select>
    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full md:w-36 lg:w-40 px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300 text-sm" />
  </div>
);

const TrukTable = ({ trukList, setSelectedImage, formatDateTime, editingRow, editFormData, setEditFormData, handleEditRow, handleCancelEdit, handleSaveEdit, availableUsers, availableKendaraan }) => (
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
              <td colSpan="11" className="px-6 py-12 text-center">
                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Tidak ada data truk</p>
                <p className="text-sm text-gray-400 mt-1">Belum ada truk yang terdaftar</p>
              </td>
            </tr>
          ) : (
            trukList.map((truk, index) => (
              <tr key={index} className={`border-b ${editingRow === truk.id ? 'border-gray-400' : 'border-gray-200'} hover:bg-gray-50`}>
                <Td><span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">{truk.nama_transporter || '-'}</span></Td>
                <Td>{formatDateTime(truk.created_at)}</Td>
                <Td><span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{truk.nama_shift}</span></Td>
                <Td>
                  {editingRow === truk.id ? (
                    <div className="relative">
                      <input
                        list={`users-${truk.id}`}
                        type="text"
                        value={editFormData.nama_personil}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, nama_personil: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                        placeholder="Ketik atau pilih nama"
                      />
                      <datalist id={`users-${truk.id}`}>
                        {availableUsers.map(user => (
                          <option key={user.email} value={user.nama} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    truk.nama_personil
                  )}
                </Td>
                <Td>
                  {editingRow === truk.id ? (
                    <div className="relative">
                      <input
                        list={`kendaraan-${truk.id}`}
                        type="text"
                        value={editFormData.nopol}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, nopol: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:outline-none"
                        placeholder="Ketik atau pilih nopol"
                      />
                      <datalist id={`kendaraan-${truk.id}`}>
                        {availableKendaraan.map(ken => (
                          <option key={ken.id} value={ken.plat_nomor} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <span className="font-medium text-gray-900">{truk.nopol}</span>
                  )}
                </Td>
                <Td>
                  {editingRow === truk.id ? (
                    <input
                      type="text"
                      value={editFormData.no_seri_pengantar}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, no_seri_pengantar: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-gray-500">{truk.no_seri_pengantar || '-'}</span>
                  )}
                </Td>
                <Td>{truk.foto_truk ? <button onClick={() => setSelectedImage({ src: truk.foto_truk, type: 'foto_truk', nopol: truk.nopol, tanggal: truk.created_at })} className="text-blue-600 hover:text-blue-800 text-sm underline">Lihat Foto</button> : <span className="text-gray-400 text-sm">-</span>}</Td>
                <Td>{truk.foto_surat ? <button onClick={() => setSelectedImage({ src: truk.foto_surat, type: 'foto_surat', no_seri_pengantar: truk.no_seri_pengantar, tanggal: truk.created_at })} className="text-blue-600 hover:text-blue-800 text-sm underline">Lihat Foto</button> : <span className="text-gray-400 text-sm">-</span>}</Td>
                <Td>
                  {editingRow === truk.id ? (
                    <input
                      type="text"
                      value={editFormData.keterangan}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                      placeholder="Tambahkan keterangan"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">{truk.keterangan || '-'}</span>
                  )}
                </Td>
                <Td>
                  {editingRow === truk.id ? (
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    >
                      <option value="Valid">Valid</option>
                      <option value="Tolak">Tolak</option>
                    </select>
                  ) : truk.status === 'Valid' ? (
                    <span className="inline-flex px-3 py-1.5 bg-green-100 text-green-700 rounded text-sm font-medium items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Valid
                    </span>
                  ) : truk.status === 'Tolak' ? (
                    <span className="inline-flex px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Tolak
                    </span>
                  ) : (
                    <span className="inline-flex px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                      Waiting
                    </span>
                  )}
                </Td>
                <Td>
                  {editingRow === truk.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveEdit(truk.id)}
                        className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                        title="Simpan"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600"
                        title="Batal"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditRow(truk)}
                      className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  )}
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
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
  </div>
);

const StatusPOBadge = ({ status }) => (
  <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
    status === 'Completed' ? 'bg-green-100 text-green-700' :
    status === 'On Progress' ? 'bg-blue-100 text-blue-700' :
    'bg-yellow-100 text-yellow-700'
  }`}>{status}</span>
);

const StatCard = ({ title, value, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-xl p-5 border border-gray-200`}>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
  </div>
);

const Th = ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">{children}</th>;
const Td = ({ children }) => <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{children}</td>;

export default DetailKegiatan;