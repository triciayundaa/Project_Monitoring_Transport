import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Truck, CheckCircle, XCircle, Search, Calendar } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const API = 'http://localhost:3000/api/kegiatan';

const DetailKegiatan = () => {
  // =================== STATE ===================
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Shift');
  const [filteredTruk, setFilteredTruk] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [editedStatuses, setEditedStatuses] = useState({});
  const [isUpdatingComplete, setIsUpdatingComplete] = useState(false);

  // Modal / popup dragging & resizing (default smaller)
  const [modalSize, setModalSize] = useState({ width: 520, height: 320, isMax: false });
  const [modalPos, setModalPos] = useState({ x: (window.innerWidth - 520) / 2, y: 80 });
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
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

  // Horizontal edge resize (dragging right edge) — small horizontal handle
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

  // Corner resize (bottom-right)
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

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  const toggleMaximize = () => {
    setModalSize(prev => ({ ...prev, isMax: !prev.isMax }));
    if (!modalSize.isMax) {
      setModalPos({ x: 20, y: 20 });
    }
  };

  const no_po = window.location.pathname.split('/').pop();

  // =================== FETCH DATA ===================
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

  // Sidebar open state is controlled like other pages (no automatic close on resize)

  // =================== FILTER & SEARCH ===================
  useEffect(() => {
    if (!data?.truk) return;

    let temp = [...data.truk];

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
  }, [searchQuery, statusFilter, data, selectedDate]);

  // =================== FORMAT TANGGAL ===================
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

  // Download helper: supports data URLs and remote URLs
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

  // (status updates are buffered during edit mode and sent on save)

  // Batch save edits when toggling off edit mode
  const handleToggleEdit = async () => {
    // if currently editing -> save changes
    if (isEditing) {
      const updates = filteredTruk.filter(t => editedStatuses[t.id] && editedStatuses[t.id] !== t.status);
      if (updates.length === 0) {
        setIsEditing(false);
        setEditedStatuses({});
        return;
      }

      if (!confirm('Simpan perubahan status untuk truk yang diubah?')) return;

      setIsSavingEdits(true);
      try {
        await Promise.all(
          updates.map(t =>
            fetch(`http://localhost:3000/api/keberangkatan/${t.id}/verifikasi`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: editedStatuses[t.id] })
            })
          )
        );
        await fetchDetail();
        setEditedStatuses({});
        setIsEditing(false);
      } catch (err) {
        console.error(err);
        alert('Gagal menyimpan perubahan');
      } finally {
        setIsSavingEdits(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  // Toggle kegiatan completed / cancel completed
  const handleToggleComplete = async () => {
    if (!kegiatan) return;
    const currentlyCompleted = kegiatan.status === 'Completed';
    // determine new status when cancelling: if there are truk then On Progress else Waiting
    const newStatus = currentlyCompleted ? (statistik?.total_truk > 0 ? 'On Progress' : 'Waiting') : 'Completed';

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
      // ensure edit mode is closed when marking completed
      setIsEditing(false);
      await fetchDetail();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal mengubah status kegiatan');
    } finally {
      setIsUpdatingComplete(false);
    }
  };

  // =================== LOADING / NO DATA ===================
  if (loading) return <LoadingScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;
  if (!data) return <NoDataScreen isSidebarOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />;

  const { kegiatan, statistik } = data;
  const shifts = [...new Set(data.truk.map(t => t.nama_shift))];

  // =================== RENDER ===================
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* Back Button */}
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali ke Daftar Kegiatan</span>
          </button>

          {/* Header PO */}
          <HeaderPO kegiatan={kegiatan} formatDate={formatDate} />

          {/* Statistik Cards */}
          <StatistikCards statistik={statistik} />

          {/* Filter Bar */}
          <FilterBar 
            shifts={shifts} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            statusFilter={statusFilter} 
            setStatusFilter={setStatusFilter} 
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            handleToggleEdit={handleToggleEdit}
            isEditing={isEditing}
            isSavingEdits={isSavingEdits}
            kegiatanStatus={kegiatan?.status}
          />

          {/* Action Buttons removed — Edit moved into FilterBar */}

          {/* Table */}
          <TrukTable 
            trukList={filteredTruk} 
            isEditing={isEditing} 
            editedStatuses={editedStatuses}
            setEditedStatuses={setEditedStatuses}
            setSelectedImage={setSelectedImage} 
            formatDateTime={formatDateTime} 
          />

          {/* Toggle complete button (right aligned) */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleToggleComplete}
              disabled={isUpdatingComplete}
              className={`px-4 py-2 rounded-lg disabled:opacity-60 ${kegiatan.status === 'Completed' ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {kegiatan.status === 'Completed' ? 'Batalkan Kegiatan Selesai' : 'Tandai Kegiatan Selesai'}
            </button>
          </div>

        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="absolute" style={{ left: isSmallScreen ? 8 : modalPos.x, top: isSmallScreen ? 8 : modalPos.y, width: isSmallScreen ? `calc(100vw - 16px)` : (modalSize.isMax ? `calc(100vw - 40px)` : modalSize.width), height: isSmallScreen ? `calc(100vh - 16px)` : (modalSize.isMax ? `calc(100vh - 40px)` : (isMinimized ? 40 : modalSize.height)) }}>
            <div className="bg-white rounded-lg overflow-hidden shadow-lg pointer-events-auto relative" onClick={e => e.stopPropagation()}>
              {/* Header (draggable) */}
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

              {/* Content area (hidden when minimized) */}
              {!isMinimized && (
                <div className="bg-white p-4 flex items-center justify-center h-full">
                  <div style={{ width: '100%', height: '100%' }} className="flex items-center justify-center bg-gray-100">
                    <img src={selectedImage.src} alt="Preview" className="object-contain w-full h-full rounded-md" />
                  </div>
                </div>
              )}

              {/* Right edge small horizontal handle for resizing width */}
              <div onMouseDown={startResizeEdge} className="absolute top-1/3 right-0 -translate-x-1/2 w-3 h-8 cursor-ew-resize" title="Resize width">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-6 h-1 bg-gray-300 rounded"></div>
                </div>
              </div>

              {/* Bottom-right corner resize */}
              <div onMouseDown={startResizeCorner} className="absolute bottom-2 right-2 w-4 h-4 cursor-se-resize bg-gray-200 rounded-sm" title="Resize"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


/* ==================== COMPONENTS ==================== */
const LoadingScreen = ({ isSidebarOpen, onToggle }) => (
  <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
    <Sidebar isOpen={isSidebarOpen} onClose={onToggle} />
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar onToggle={onToggle} />
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
      <Topbar onToggle={onToggle} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">Data tidak ditemukan</div>
      </div>
    </div>
  </div>
);

const HeaderPO = ({ kegiatan, formatDate }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-6">PO {kegiatan.no_po}</h1>
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi PO</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <InfoRow label="No PO" value={kegiatan.no_po} />
        <InfoRow label="Transporter" value={kegiatan.transporter} />
        <InfoRow label="Material" value={kegiatan.material || '-'} />
        <InfoRow label="Incoterm" value={kegiatan.incoterm || '-'} />
        <InfoRow label="No BL" value={kegiatan.no_bl || '-'} />
        <InfoRow label="Quantity" value={`${kegiatan.quantity} Ton`} />
        <InfoRow label="Vendor" value={kegiatan.vendor} />
        <InfoRow label="Nama Kapal" value={kegiatan.nama_kapal || '-'} />
        <InfoRow label="Status" value={<StatusPOBadge status={kegiatan.status} />} />
        <InfoRow label="Tanggal Mulai" value={formatDate(kegiatan.tanggal_mulai)} />
        <InfoRow label="Tanggal Selesai" value={formatDate(kegiatan.tanggal_selesai)} />
      </div>
    </div>
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

const FilterBar = ({ shifts, searchQuery, setSearchQuery, statusFilter, setStatusFilter, selectedDate, setSelectedDate, handleToggleEdit, isEditing, isSavingEdits, kegiatanStatus }) => (
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
    <div className="w-full md:w-auto md:ml-auto flex justify-end">
      <button
        onClick={() => { if (!kegiatanStatus || kegiatanStatus !== 'Completed') handleToggleEdit(); }}
        disabled={isSavingEdits || (kegiatanStatus === 'Completed')}
        className={`px-3 py-2 rounded-lg transition text-sm self-end md:self-auto ${kegiatanStatus === 'Completed' ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        title={kegiatanStatus === 'Completed' ? 'Kegiatan telah selesai — tidak bisa edit' : ''}
      >
        {isEditing ? (isSavingEdits ? 'Menyimpan...' : 'Selesai Edit') : 'Edit Status'}
      </button>
    </div>
  </div>
);

const TrukTable = ({ trukList, isEditing, editedStatuses, setEditedStatuses, setSelectedImage, formatDateTime }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-red-600 text-white">
            <Th>Tanggal & Jam</Th>
            <Th>Shift</Th>
            <Th>Nama Personil</Th>
            <Th>Plat Nomor</Th>
            <Th>No Seri Pengantar</Th>
            <Th>Foto Truk</Th>
            <Th>Foto Surat</Th>
            <Th>Keterangan</Th>
            <Th>Aksi Verifikasi</Th>
          </tr>
        </thead>
        <tbody>
          {trukList.length === 0 ? (
            <tr>
              <td colSpan="9" className="px-6 py-12 text-center">
                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Tidak ada data truk</p>
                <p className="text-sm text-gray-400 mt-1">Belum ada truk yang terdaftar</p>
              </td>
            </tr>
          ) : (
            trukList.map((truk, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <Td>{formatDateTime(truk.created_at)}</Td>
                <Td><span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{truk.nama_shift}</span></Td>
                <Td>{truk.nama_personil}</Td>
                <Td><span className="font-medium text-gray-900">{truk.nopol}</span></Td>
                <Td><span className="text-gray-500">{truk.no_seri_pengantar || '-'}</span></Td>
                <Td>{truk.foto_truk ? <button onClick={() => setSelectedImage({ src: truk.foto_truk, type: 'foto_truk', nopol: truk.nopol, tanggal: truk.created_at })} className="text-blue-600 hover:text-blue-800 text-sm underline">Lihat Foto</button> : <span className="text-gray-400 text-sm">-</span>}</Td>
                <Td>{truk.foto_surat ? <button onClick={() => setSelectedImage({ src: truk.foto_surat, type: 'foto_surat', no_seri_pengantar: truk.no_seri_pengantar, tanggal: truk.created_at })} className="text-blue-600 hover:text-blue-800 text-sm underline">Lihat Foto</button> : <span className="text-gray-400 text-sm">-</span>}</Td>
                <Td><span className="text-sm text-gray-600">{truk.keterangan || '-'}</span></Td>
                <Td>
                  {isEditing ? (
                    <select
                      value={editedStatuses[truk.id] ?? truk.status}
                      onChange={(e) => setEditedStatuses(prev => ({ ...prev, [truk.id]: e.target.value }))}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="Valid">Valid</option>
                      <option value="Tolak">Tolak</option>
                    </select>
                  ) : truk.status === 'Valid' ? (
                    <button className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Valid</button>
                  ) : truk.status === 'Tolak' ? (
                    <button className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Tolak</button>
                  ) : null}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

/* ==================== HELPER ==================== */
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