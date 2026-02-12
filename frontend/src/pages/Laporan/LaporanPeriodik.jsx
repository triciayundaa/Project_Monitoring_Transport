import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API_BASE_URL from '../../config/api';

// Helper warna status agar konsisten
const getStatusColor = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'waiting') return 'bg-yellow-100 text-yellow-700';
    if (s === 'on progress') return 'bg-blue-100 text-blue-700';
    if (s === 'completed') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
};

const LaporanPeriodik = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [data, setData] = useState(null);
    const [groupedData, setGroupedData] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    const query = new URLSearchParams(useLocation().search);
    const start = query.get('start');
    const end = query.get('end');

    useEffect(() => {
        const fetchPeriodik = async () => {
            try {
                setLoading(true);
                if (start && end) {
                    const res = await axios.get(`${API_BASE_URL}/api/laporan/periodik?start=${start}&end=${end}`);
                    setData(res.data);
                    
                    // Grouping berdasarkan Material untuk Header Merah
                    const grouped = res.data.logs.reduce((acc, log) => {
                        const material = (log.material || 'Lain-lain').trim().toUpperCase();
                        if (!acc[material]) acc[material] = [];
                        acc[material].push(log);
                        return acc;
                    }, {});
                    setGroupedData(grouped);
                }
            } catch (err) {
                console.error("Gagal memuat laporan:", err);
                alert("Gagal memuat laporan periodik");
            } finally {
                setLoading(false);
            }
        };
        fetchPeriodik();
    }, [start, end]);

    const handleExportExcel = async () => {
        if (!data || Object.keys(groupedData).length === 0) return;
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Laporan PO Per Material');
        
        const boldFont = { name: 'Arial', size: 10, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' };
        const leftAlignment = { vertical: 'middle', horizontal: 'left' };
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        sheet.mergeCells('A1:L1');
        sheet.getCell('A1').value = `LAPORAN DATA KEGIATAN PO PERIODE ${start} S/D ${end}`;
        sheet.getCell('A1').font = { size: 14, bold: true };
        sheet.getCell('A1').alignment = centerAlignment;

        const headerRow = sheet.addRow([
            'No', 'No. PO', 'Vendor', 'Kapal', 'Material', 'Incoterm', 'No. BL', 'Qty BL', 'Tgl Mulai', 'Tgl Selesai', 'Transporter', 'Status', 'Truk'
        ]);
        
        headerRow.eachCell(cell => {
            cell.font = boldFont;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = thinBorder;
            cell.alignment = centerAlignment;
        });

        let globalIdx = 1;
        Object.keys(groupedData).forEach((material) => {
            const groupHeader = sheet.addRow([`MATERIAL: ${material}`]);
            groupHeader.getCell(1).font = { bold: true, color: { argb: 'FFFF0000' } };
            sheet.mergeCells(`A${groupHeader.number}:M${groupHeader.number}`);

            groupedData[material].forEach((item) => {
                if (item.transporters && item.transporters.length > 0) {
                    item.transporters.forEach((trans) => {
                        const row = sheet.addRow([
                            globalIdx++,
                            item.no_po,
                            item.nama_vendor,
                            item.nama_kapal || '-',
                            item.material,
                            item.incoterm,
                            item.no_bl || '-',
                            parseFloat(item.quantity),
                            item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-',
                            item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-',
                            trans.nama,
                            trans.status,
                        ]);
                        row.eachCell(cell => { cell.border = thinBorder; cell.alignment = centerAlignment; });
                    });
                } else {
                    const row = sheet.addRow([globalIdx++, item.no_po, item.nama_vendor, item.nama_kapal || '-', item.material, item.incoterm, item.no_bl || '-', item.quantity, item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-', item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-', 'Belum alokasi', '-', 0]);
                    row.eachCell(cell => { cell.border = thinBorder; cell.alignment = centerAlignment; });
                }
            });
        });

        sheet.columns.forEach(col => col.width = 18);
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Laporan_PO_Lengkap_${start}_${end}.xlsx`);
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-red-600 uppercase tracking-widest animate-pulse">Memuat Data Laporan...</p>
        </div>
    );

    if (!data || Object.keys(groupedData).length === 0) return <div className="h-screen flex items-center justify-center font-bold uppercase tracking-widest text-gray-400">Data tidak ditemukan</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Laporan Periodik PO" />
                
                <main className="flex-grow p-6 overflow-y-auto bg-gray-200">
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-0 mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Laporan Periodik Kegiatan Transportasi Barang Curah Teluk Bayur - PT Semen Padang</h1>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Periode: {start} s/d {end}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => navigate('/laporan')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-300 transition-all">Kembali</button>
                                <button onClick={handleExportExcel} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2 shadow-md transition-all active:scale-95 text-center">
                                    <i className="fas fa-file-excel"></i> Export Excel
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-[10px]">
                                <thead className="bg-gray-800 text-white uppercase text-center font-bold">
                                    <tr>
                                        <th className="border border-gray-300 p-2 text-center">No. PO</th>
                                        <th className="border border-gray-300 p-2 text-center">Vendor</th>
                                        <th className="border border-gray-300 p-2 text-center">Kapal</th>
                                        <th className="border border-gray-300 p-2 text-center">Material</th>
                                        <th className="border border-gray-300 p-2 text-center">Inco</th>
                                        <th className="border border-gray-300 p-2 text-center">No. BL</th>
                                        <th className="border border-gray-300 p-2 text-center">Qty BL</th>
                                        <th className="border border-gray-300 p-2 text-center">Tgl Mulai</th>
                                        <th className="border border-gray-300 p-2 text-center">Tgl Selesai</th>
                                        <th className="border border-gray-300 p-2 text-center">Transporter</th>
                                        <th className="border border-gray-300 p-2 text-center">Status</th>
                                        <th className="border border-gray-300 p-2 text-center">Truk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedData).map((materialName, mIdx) => (
                                        <React.Fragment key={materialName}>
                                            <tr className="bg-red-50">
                                                <td colSpan="12" className="p-2 border border-gray-300 font-black text-red-600 uppercase tracking-widest text-xs text-left">
                                                    MATERIAL: {materialName} ({groupedData[materialName].length} PO)
                                                </td>
                                            </tr>
                                            {groupedData[materialName].map((item) => {
                                                const rowSpan = item.transporters.length || 1;
                                                const totalTrukPO = item.transporters.reduce((sum, t) => sum + (t.jumlah_truk || 0), 0);

                                                return item.transporters.length > 0 ? (
                                                    item.transporters.map((trans, tIdx) => (
                                                        <tr key={`${item.id}-${tIdx}`} className="hover:bg-gray-50 text-center font-medium text-gray-700 border-b border-gray-200 bg-white">
                                                            {tIdx === 0 && (
                                                                <>
                                                                    <td className="p-2 border border-gray-300 font-bold text-red-600" rowSpan={rowSpan}>{item.no_po}</td>
                                                                    <td className="p-2 border border-gray-300 uppercase text-left" rowSpan={rowSpan}>{item.nama_vendor}</td>
                                                                    <td className="p-2 border border-gray-300 text-left" rowSpan={rowSpan}>{item.nama_kapal || '-'}</td>
                                                                    <td className="p-2 border border-gray-300 uppercase font-bold text-blue-800" rowSpan={rowSpan}>{item.material}</td>
                                                                    <td className="p-2 border border-gray-300 font-bold" rowSpan={rowSpan}>{item.incoterm}</td>
                                                                    <td className="p-2 border border-gray-300" rowSpan={rowSpan}>{item.no_bl || '-'}</td>
                                                                    <td className="p-2 border border-gray-300 font-bold" rowSpan={rowSpan}>{parseFloat(item.quantity)}</td>
                                                                    <td className="p-2 border border-gray-300" rowSpan={rowSpan}>{item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-'}</td>
                                                                    <td className="p-2 border border-gray-300" rowSpan={rowSpan}>{item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-'}</td>
                                                                </>
                                                            )}
                                                            <td className="p-2 border border-gray-300 text-left italic font-bold text-gray-800">
                                                                {trans.nama}.
                                                            </td>
                                                            <td className="p-2 border border-gray-300">
                                                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase shadow-sm ${getStatusColor(trans.status)}`}>
                                                                    {trans.status}
                                                                </span>
                                                            </td>
                                                            {tIdx === 0 && (
                                                                <td className="p-2 border border-gray-300 font-black text-blue-700 text-sm" rowSpan={rowSpan}>{totalTrukPO}</td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr key={item.id} className="hover:bg-gray-50 text-center font-medium text-gray-700 border-b border-gray-200 bg-white">
                                                        <td className="p-2 border border-gray-300 font-bold text-red-600">{item.no_po}</td>
                                                        <td className="p-2 border border-gray-300 uppercase text-left">{item.nama_vendor}</td>
                                                        <td className="p-2 border border-gray-300 text-left">{item.nama_kapal || '-'}</td>
                                                        <td className="p-2 border border-gray-300 uppercase font-bold text-blue-800">{item.material}</td>
                                                        <td className="p-2 border border-gray-300 font-bold">{item.incoterm}</td>
                                                        <td className="p-2 border border-gray-300">{item.no_bl || '-'}</td>
                                                        <td className="p-2 border border-gray-300 font-bold">{parseFloat(item.quantity)}</td>
                                                        <td className="p-2 border border-gray-300">{item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-'}</td>
                                                        <td className="p-2 border border-gray-300">{item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-'}</td>
                                                        <td className="p-2 border border-gray-300 text-gray-400 italic" colSpan="2">Belum ada alokasi</td>
                                                        <td className="p-2 border border-gray-300 font-black text-blue-700">0</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LaporanPeriodik;