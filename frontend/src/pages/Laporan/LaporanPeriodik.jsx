import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const LaporanPeriodik = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
                    const res = await axios.get(`http://localhost:3000/api/laporan/periodik?start=${start}&end=${end}`);
                    setData(res.data);
                    
                    // --- PERBAIKAN LOGIKA GROUPING (NORMALISASI KEY) ---
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

    // --- PERBAIKAN FUNGSI EXPORT EXCEL ---
    const handleExportExcel = async () => {
        if (!data || Object.keys(groupedData).length === 0) return;
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Laporan PO Per Material');
        
        const boldFont = { name: 'Arial', size: 10, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' };
        const leftAlignment = { vertical: 'middle', horizontal: 'left' };
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        sheet.mergeCells('A1:K1');
        sheet.getCell('A1').value = `LAPORAN DATA KEGIATAN PO PERIODE ${start} S/D ${end}`;
        sheet.getCell('A1').font = { size: 14, bold: true };
        sheet.getCell('A1').alignment = centerAlignment;

        const headerRow = sheet.addRow([
            'No', 'No. PO', 'Vendor', 'Transporter', 'Nama Kapal', 'Material', 'Incoterm', 'No. BL', 'Quantity', 'Tgl Mulai', 'Tgl Selesai'
        ]);
        
        headerRow.eachCell(cell => {
            cell.font = boldFont;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = thinBorder;
            cell.alignment = centerAlignment;
        });

        // Iterasi berdasarkan GroupedData agar urutan di Excel sama dengan di Tabel UI
        let globalIdx = 1;
        Object.keys(groupedData).forEach((material) => {
            // Tambahkan baris pemisah kelompok material di Excel (opsional, agar rapi)
            const groupHeader = sheet.addRow([`MATERIAL: ${material}`]);
            groupHeader.getCell(1).font = { bold: true, color: { argb: 'FFFF0000' } };
            sheet.mergeCells(`A${groupHeader.number}:K${groupHeader.number}`);

            groupedData[material].forEach((log) => {
                const row = sheet.addRow([
                    globalIdx++,
                    log.no_po,
                    log.nama_vendor,
                    log.daftar_transporter || '-',
                    log.nama_kapal || '-',
                    log.material,
                    log.incoterm,
                    log.no_bl || '-',
                    log.quantity,
                    log.tanggal_mulai ? new Date(log.tanggal_mulai).toLocaleDateString('id-ID') : '-',
                    log.tanggal_selesai ? new Date(log.tanggal_selesai).toLocaleDateString('id-ID') : '-'
                ]);

                row.eachCell((cell, colNumber) => { 
                    cell.border = thinBorder; 
                    // Kolom Vendor, Transporter, Kapal rata kiri
                    if ([3, 4, 5].includes(colNumber)) cell.alignment = leftAlignment;
                    else cell.alignment = centerAlignment;
                });
            });
        });

        // Atur lebar kolom
        sheet.columns = [
            { width: 5 }, { width: 15 }, { width: 25 }, { width: 35 }, { width: 15 }, 
            { width: 15 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Laporan_PO_Material_${start}_${end}.xlsx`);
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
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Daftar Kegiatan Per Material</h1>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Periode: {start} s/d {end}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => navigate('/laporan')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-300 transition-all">Kembali</button>
                                <button onClick={handleExportExcel} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2 shadow-md transition-all active:scale-95">
                                    <i className="fas fa-file-excel"></i> Export Excel
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-[10px]">
                                <thead className="bg-gray-800 text-white uppercase text-center font-bold">
                                    <tr>
                                        <th className="border border-gray-300 p-2 w-10">No</th>
                                        <th className="border border-gray-300 p-2">No. PO</th>
                                        <th className="border border-gray-300 p-2">Vendor</th>
                                        <th className="border border-gray-300 p-2">Transporter</th>
                                        <th className="border border-gray-300 p-2">Kapal</th>
                                        <th className="border border-gray-300 p-2">Material</th>
                                        <th className="border border-gray-300 p-2 text-center">Inco</th>
                                        <th className="border border-gray-300 p-2">No. BL</th>
                                        <th className="border border-gray-300 p-2 text-center">Qty</th>
                                        <th className="border border-gray-300 p-2 text-center">Tgl Mulai</th>
                                        <th className="border border-gray-300 p-2 text-center">Tgl Selesai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedData).map((material, mIdx) => (
                                        <React.Fragment key={mIdx}>
                                            <tr className="bg-red-50">
                                                <td colSpan="11" className="p-2 border border-gray-300 font-black text-red-600 uppercase tracking-widest text-xs text-left">
                                                    MATERIAL: {material} ({groupedData[material].length} PO)
                                                </td>
                                            </tr>
                                            {groupedData[material].map((log, i) => (
                                                <tr key={log.id} className="hover:bg-gray-50 text-center font-medium text-gray-700 border-b border-gray-200">
                                                    <td className="p-2 border border-gray-300">{i + 1}</td>
                                                    <td className="p-2 border border-gray-300 font-bold text-red-600">{log.no_po}</td>
                                                    <td className="p-2 border border-gray-300 uppercase text-[9px] text-left">{log.nama_vendor}</td>
                                                    <td className="p-2 border border-gray-300 text-left italic text-gray-600 text-[9px]">
                                                        {log.daftar_transporter || '-'}
                                                    </td>
                                                    <td className="p-2 border border-gray-300 text-[9px] text-left">{log.nama_kapal || '-'}</td>
                                                    <td className="p-2 border border-gray-300 uppercase font-bold text-blue-800">{log.material}</td>
                                                    <td className="p-2 border border-gray-300 font-bold">{log.incoterm}</td>
                                                    <td className="p-2 border border-gray-300">{log.no_bl || '-'}</td>
                                                    <td className="p-2 border border-gray-300 font-bold">{log.quantity}</td>
                                                    <td className="p-2 border border-gray-300">
                                                        {log.tanggal_mulai ? new Date(log.tanggal_mulai).toLocaleDateString('id-ID') : '-'}
                                                    </td>
                                                    <td className="p-2 border border-gray-300">
                                                        {log.tanggal_selesai ? new Date(log.tanggal_selesai).toLocaleDateString('id-ID') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
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