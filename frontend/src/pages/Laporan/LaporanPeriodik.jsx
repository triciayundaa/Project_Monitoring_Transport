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
        if (!data) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Log Keberangkatan Detail');
        
        const boldFont = { name: 'Arial', size: 10, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' };
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Judul (Merger kolom disesuaikan karena penambahan kolom baru)
        sheet.mergeCells('A1:L1');
        sheet.getCell('A1').value = `LAPORAN DETAIL KEBERANGKATAN TRUK (${start} S/D ${end})`;
        sheet.getCell('A1').font = { size: 14, bold: true };
        sheet.getCell('A1').alignment = centerAlignment;

        // Header Tabel (Ditambahkan Vendor dan Incoterm)
        const headerRow = sheet.addRow([
            'No', 'No. PO', 'Vendor', 'Incoterm', 'Material', 'Tgl Masuk PO', 'Tgl Selesai PO', 
            'Waktu Berangkat', 'Nomor Polisi', 'Transporter', 'Shift', 'Personil Lapangan'
        ]);
        
        headerRow.eachCell(cell => {
            cell.font = boldFont;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = thinBorder;
            cell.alignment = centerAlignment;
        });

        // Data Rows
        data.logs.forEach((log, i) => {
            const row = sheet.addRow([
                i + 1,
                log.no_po,
                log.nama_vendor,
                log.incoterm || '-', // Penambahan data incoterm
                log.material,
                log.tanggal_mulai ? new Date(log.tanggal_mulai).toLocaleDateString('id-ID') : '-',
                log.tanggal_selesai ? new Date(log.tanggal_selesai).toLocaleDateString('id-ID') : '-',
                new Date(log.waktu_berangkat).toLocaleString('id-ID'),
                log.plat_nomor,
                log.nama_transporter,
                log.nama_shift,
                log.nama_petugas
            ]);
            row.eachCell(cell => { cell.border = thinBorder; });
        });

        sheet.columns.forEach(column => { column.width = 20; });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Detail_Log_Transportasi_${start}_${end}.xlsx`);
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-red-600 uppercase tracking-widest animate-pulse">Memuat Data Laporan...</p>
        </div>
    );

    if (!data) return <div className="h-screen flex items-center justify-center font-bold uppercase tracking-widest text-gray-400">Data tidak ditemukan</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Detail Log Periodik" />
                
                <main className="flex-grow p-6 overflow-y-auto bg-gray-200">
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Log Keberangkatan Detail</h1>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Periode: {start} s/d {end}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => navigate('/laporan')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-300 transition-all active:scale-95">Kembali</button>
                                <button onClick={handleExportExcel} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2 shadow-md transition-all active:scale-95">
                                    <i className="fas fa-file-excel"></i> Export Excel
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-[10px]">
                                <thead className="bg-gray-800 text-white uppercase">
                                    <tr>
                                        <th className="border border-gray-300 p-2 text-center w-10">No</th>
                                        <th className="border border-gray-300 p-2 w-24">No.PO</th>
                                        <th className="border border-gray-300 p-2">Vendor</th>
                                        <th className="border border-gray-300 p-2 text-center w-16">Incoterm</th>
                                        <th className="border border-gray-300 p-2">Material</th>
                                        <th className="border border-gray-300 p-2 text-center w-32">Waktu Berangkat</th>
                                        <th className="border border-gray-300 p-2 text-center w-24">Nopol</th>
                                        <th className="border border-gray-300 p-2">Transporter</th>
                                        <th className="border border-gray-300 p-2 text-center w-20">Shift</th>
                                        <th className="border border-gray-300 p-2">Personil Lapangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.logs && data.logs.length > 0 ? data.logs.map((log, i) => (
                                        <tr key={i} className="hover:bg-gray-50 font-medium text-gray-700 border-b border-gray-200">
                                            <td className="p-2 border border-gray-300 text-center">{i + 1}</td>
                                            <td className="p-2 border border-gray-300 font-bold">{log.no_po}</td>
                                            <td className="p-2 border border-gray-300 uppercase">{log.nama_vendor}</td>
                                            <td className="p-2 border border-gray-300 text-center font-bold text-blue-600">{log.incoterm || '-'}</td>
                                            <td className="p-2 border border-gray-300 uppercase">{log.material}</td>
                                            <td className="p-2 border border-gray-300 text-center">
                                                {new Date(log.waktu_berangkat).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-2 border border-gray-300 font-bold uppercase text-red-600 text-center">{log.plat_nomor}</td>
                                            <td className="p-2 border border-gray-300 uppercase">{log.nama_transporter}</td>
                                            <td className="p-2 border border-gray-300 text-center">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 font-bold">{log.nama_shift}</span>
                                            </td>
                                            <td className="p-2 border border-gray-300 italic font-semibold">{log.nama_petugas}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="10" className="p-10 text-center text-gray-400 font-bold uppercase italic tracking-widest">TIDAK ADA DATA LOG PADA PERIODE INI</td></tr>
                                    )}
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