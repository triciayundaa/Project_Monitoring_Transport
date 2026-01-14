import React, { useEffect, useState } from 'react';
import { Eye, Edit, Trash2, Plus, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import TambahKegiatan from './TambahKegiatan';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000/api/kegiatan';

/* =======================
   STATUS BADGE COLOR
======================= */
const statusColors = {
    Waiting: 'bg-yellow-100 text-yellow-700',
    'On Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
};

/* =======================
   REUSABLE INPUT STYLE
======================= */
const filterInput =
    'w-full px-4 py-2.5 rounded-[12px] bg-white text-sm text-gray-700 ' +
    'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200';

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

    /* =======================
        LOAD DATA
    ======================= */
    const loadData = async () => {
        try {
            const res = await fetch(API);
            const json = await res.json();
            setData(json);
            setFilteredData(json);
        } catch (err) {
            console.error('Gagal mengambil data kegiatan', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    /* =======================
        FILTER LOGIC (FINAL)
    ======================= */
    useEffect(() => {
        let filtered = [...data];

        // Filter Status
        if (statusFilter !== 'Semua Status') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }

        // Filter Rentang Tanggal
        if (startDate && endDate) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.tanggal_mulai).setHours(0,0,0,0);
                const start = new Date(startDate).setHours(0,0,0,0);
                const end = new Date(endDate).setHours(23,59,59,999);
                return itemDate >= start && itemDate <= end;
            });
        }

        // Search Multi Kolom (safely handle missing fields)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const fields = [
                    item.no_po,
                    item.vendor,
                    item.transporter,
                    item.nama_kapal,
                    item.material,
                ];
                return fields
                    .map(f => (f || '').toString().toLowerCase())
                    .some(f => f.includes(q));
            });
        }

        setFilteredData(filtered);
    }, [searchQuery, statusFilter, startDate, endDate, data]);

    /* =======================
        DELETE with server-side verification
    ======================= */
    const handleDelete = async (no_po) => {
        try {
            // fetch latest detail to ensure status/truk count haven't changed
            const detailRes = await fetch(`${API}/${no_po}`);
            if (!detailRes.ok) {
                alert('Gagal memeriksa status kegiatan sebelum menghapus');
                return;
            }
            const detailJson = await detailRes.json();
            const currentStatus = detailJson.kegiatan?.status;
            const totalTruk = detailJson.statistik?.total_truk || 0;

            if (currentStatus === 'On Progress' || currentStatus === 'Completed' || Number(totalTruk) > 0) {
                const runningMsg = Number(totalTruk) > 0
                    ? `Kegiatan ini sudah berjalan (ada ${totalTruk} truk) dan tidak dapat dihapus.`
                    : `Kegiatan dengan status ${currentStatus} tidak dapat dihapus.`;
                alert(runningMsg);
                return;
            }

            if (!confirm('Hapus kegiatan ini?')) return;

            const delRes = await fetch(`${API}/${no_po}`, { method: 'DELETE' });
            if (!delRes.ok) {
                const text = await delRes.text();
                alert('Gagal menghapus kegiatan: ' + text);
                return;
            }
            await loadData();
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat menghapus kegiatan');
        }
    };

    const formatDate = (date) =>
        date ? new Date(date).toLocaleDateString('id-ID') : '-';

    return (
         <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* SIDEBAR */}
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col min-w-0">

                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                    {/* BUTTON */}
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

                     {/* FILTER BAR */}
                    <div className="bg-gray-100 rounded-[14px] p-4 mb-5">
                        <div className="flex flex-wrap items-center gap-3">

                            {/* SEARCH */}
                            <div className="flex-1 min-w-[200px] relative">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Cari PO, Vendor, Transporter, Kapal, Material..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${filterInput} pl-11 w-full`}
                                />
                            </div>

                            {/* STATUS */}
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

                            {/* DATE RANGE */}
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


                    {/* TABLE */}
                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-red-600 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left">Tanggal</th>
                                    <th className="px-4 py-3 text-left">No PO</th>
                                    <th className="px-4 py-3 text-left">Vendor</th>
                                    <th className="px-4 py-3 text-left">Transporter</th>
                                    <th className="px-4 py-3 text-left">Nama Kapal</th>
                                    <th className="px-4 py-3 text-left">Material</th>
                                    <th className="px-4 py-3 text-left">Incoterm</th>
                                    <th className="px-4 py-3 text-left">No BL</th>
                                    <th className="px-4 py-3 text-left">Qty</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-center">Truk</th>
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
                                    filteredData.map((item, index) => (
                                        <tr
                                            key={item.no_po}
                                            className={`border-b hover:bg-gray-50 ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            }`}
                                        >
                                            <td className="px-3 py-2 text-xs leading-tight">
                                                <div>{formatDate(item.tanggal_mulai)}</div>
                                                <div className="text-gray-400 truncate">
                                                    s.d {formatDate(item.tanggal_selesai)}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">{item.no_po}</td>
                                            <td className="px-4 py-3">{item.vendor}</td>
                                            <td className="px-4 py-3">{item.transporter}</td>
                                            <td className="px-4 py-3">{item.nama_kapal || '-'}</td>
                                            <td className="px-4 py-3">{item.material}</td>
                                            <td className="px-4 py-3">{item.incoterm || '-'}</td>
                                            <td className="px-4 py-3">{item.no_bl || '-'}</td>
                                            <td className="px-4 py-3">{item.quantity} ton</td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[item.status]}`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-center font-bold text-gray-700">
                                                {/* Tampilkan realisasi_truk. Jika kosong/null, tampilkan 0 */}
                                                {item.realisasi_truk || 0}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                     {/* --- TOMBOL DETAIL (MATA) --- */}
                                                     <button
                                                        className="p-2 rounded hover:bg-gray-200"
                                                        onClick={() => navigate(`/manajemen-kegiatan/detail/${item.no_po}`)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    
                                                    {/* --- TOMBOL EDIT (PENSIL) --- */}
                                                    <button
                                                        onClick={() => {
                                                            setSelected(item);
                                                            setOpenEdit(true);
                                                        }}
                                                        // Disable tombol jika status 'Completed' ATAU 'On Progress'
                                                        disabled={item.status === 'Completed' || item.status === 'On Progress'}
                                                        className={`p-2 rounded ${
                                                            item.status === 'Completed' || item.status === 'On Progress'
                                                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' // Gaya Disabled
                                                                : 'hover:bg-blue-100 text-blue-600' // Gaya Aktif
                                                        }`}
                                                        title={
                                                            item.status === 'Completed' || item.status === 'On Progress'
                                                                ? 'Kegiatan sedang berjalan atau selesai, tidak bisa diedit'
                                                                : 'Edit kegiatan'
                                                        }
                                                    >
                                                        <Edit size={16} />
                                                    </button>

                                                    {/* --- TOMBOL HAPUS (SAMPAH) --- */}
                                                    <button
                                                        onClick={() => {
                                                            if (item.status === 'On Progress' || item.status === 'Completed') {
                                                                const runningMsg = item.total_truk && Number(item.total_truk) > 0
                                                                    ? `Kegiatan ini sudah berjalan (ada ${item.total_truk} truk) dan tidak dapat dihapus.`
                                                                    : 'Kegiatan ini sedang berjalan dan tidak dapat dihapus.';
                                                                alert(runningMsg);
                                                                return;
                                                            }
                                                            handleDelete(item.no_po);
                                                        }}
                                                        className={`p-2 rounded ${item.status === 'On Progress' || item.status === 'Completed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-red-100 text-red-600'}`}
                                                        title={item.status === 'On Progress' || item.status === 'Completed' ? 'Tidak dapat dihapus' : 'Hapus kegiatan'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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