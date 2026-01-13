import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, CheckCircle, XCircle, Search, Calendar, Image } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const API = 'http://localhost:3000/api/kegiatan';

const DetailKegiatan = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Shift');
  const [filteredTruk, setFilteredTruk] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const no_po = window.location.pathname.split('/').pop();

  useEffect(() => {
    fetchDetail();
  }, [no_po]);

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

  useEffect(() => {
    if (!data?.truk) return;

    let temp = [...data.truk];

    if (statusFilter !== 'Semua Shift') {
      temp = temp.filter(t => t.nama_shift === statusFilter);
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
  }, [searchQuery, statusFilter, data]);

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

  const handleVerifikasi = async (id, newStatus) => {
    if (!confirm(`Yakin ${newStatus === 'Valid' ? 'memvalidasi' : 'menolak'} data ini?`)) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/keberangkatan/${id}/verifikasi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        alert('Status berhasil diperbarui');
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">Memuat data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-red-500">Data tidak ditemukan</div>
          </div>
        </div>
      </div>
    );
  }

  const { kegiatan, statistik } = data;

  // Get unique shifts untuk filter
  const shifts = [...new Set(data.truk.map(t => t.nama_shift))];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali ke Daftar Kegiatan</span>
          </button>

          {/* Header PO */}
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

          {/* Statistik Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Truk" 
              value={statistik.total_truk}
              bgColor="bg-yellow-50"
              textColor="text-yellow-700"
            />
            <StatCard 
              title="Total yang Belum Terverifikasi" 
              value={statistik.belum_terverifikasi}
              bgColor="bg-orange-50"
              textColor="text-orange-700"
            />
            <StatCard 
              title="Total Truk yang Valid" 
              value={statistik.terverifikasi}
              bgColor="bg-green-50"
              textColor="text-green-700"
            />
            <StatCard 
              title="Total Truk yang Tidak Valid" 
              value={statistik.tidak_valid || 0}
              bgColor="bg-red-50"
              textColor="text-red-700"
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-gray-100 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nomor plat"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300"
            >
              <option>Semua Shift</option>
              {shifts.map(shift => (
                <option key={shift}>{shift}</option>
              ))}
            </select>

            <input
              type="date"
              className="px-4 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-red-300"
            />

            <button className="px-4 py-2 bg-white rounded-lg flex items-center gap-2 hover:bg-gray-50">
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          {/* Table */}
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
                  {filteredTruk.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium">Tidak ada data truk</p>
                        <p className="text-sm text-gray-400 mt-1">Belum ada truk yang terdaftar</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTruk.map((truk, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <Td>{formatDateTime(truk.tanggal)}</Td>
                        <Td>
                          <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {truk.nama_shift}
                          </span>
                        </Td>
                        <Td>{truk.nama_personil}</Td>
                        <Td>
                          <span className="font-medium text-gray-900">{truk.nopol}</span>
                        </Td>
                        <Td>
                          <span className="text-gray-500">{truk.no_seri_pengantar || '-'}</span>
                        </Td>
                        <Td>
                          {truk.foto_truk ? (
                            <button
                              onClick={() => setSelectedImage(truk.foto_truk)}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              Lihat Foto
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </Td>
                        <Td>
                          {truk.foto_surat ? (
                            <button
                              onClick={() => setSelectedImage(truk.foto_surat)}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              Lihat Foto
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </Td>
                        <Td>
                          <span className="text-sm text-gray-600">{truk.keterangan || 'BG Masada 20'}</span>
                        </Td>
                        <Td>
                          {truk.status === 'Valid' ? (
                            <button className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4" />
                              Valid
                            </button>
                          ) : truk.status === 'Tolak' ? (
                            <button className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium flex items-center gap-1.5">
                              <XCircle className="w-4 h-4" />
                              Tolak
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifikasi(truk.id, 'Valid')}
                                className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Valid
                              </button>
                              <button
                                onClick={() => handleVerifikasi(truk.id, 'Tolak')}
                                className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"
                              >
                                <XCircle className="w-4 h-4" />
                                Tolak
                              </button>
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ×
            </button>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== HELPER COMPONENTS ==================== */

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
  }`}>
    {status}
  </span>
);

const StatCard = ({ title, value, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-xl p-5 border border-gray-200`}>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
  </div>
);

const Th = ({ children }) => (
  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
    {children}
  </th>
);

const Td = ({ children }) => (
  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
    {children}
  </td>
);

export default DetailKegiatan;