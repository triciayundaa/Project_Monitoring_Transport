import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

// 1. IMPORT LOGO DARI ASSETS
import logoSemenPadang from '../../assets/logo-semen-padang.png';

const LaporanDetail = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { id } = useParams(); // 'id' berisi nomor PO
    const navigate = useNavigate();

    // State untuk menyimpan data laporan
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Data Detail Laporan dari Backend
    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`http://localhost:3000/api/laporan/detail/${id}`);
                setData(res.data);
            } catch (err) {
                console.error("Gagal memuat detail laporan:", err);
                alert("Data laporan tidak ditemukan");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    // Logika Pengelompokkan Kendaraan per Transporter (Untuk Tampilan Web & PDF)
    const groupedVehicles = data?.vehicles.reduce((acc, vehicle) => {
        const key = vehicle.nama_transporter;
        if (!acc[key]) acc[key] = [];
        acc[key].push(vehicle);
        return acc;
    }, {});

    // 2. Logika Export Excel
    const handleExportExcel = async () => {
        if (!data) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Rekap PO ${data.header.no_po}`);
        
        const boldFont = { name: 'Arial', size: 10, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' };
        const thinBorder = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // --- A. HEADER JUDUL ---
        sheet.mergeCells('A1:F1');
        const title = sheet.getCell('A1');
        title.value = 'REKAPITULASI PENGANGKUTAN & DAFTAR UNIT';
        title.font = { name: 'Arial', size: 14, bold: true };
        title.alignment = centerAlignment;

        sheet.mergeCells('A2:F2');
        const subTitle = sheet.getCell('A2');
        subTitle.value = 'LOGISTIK TRANSPORTASI - PT SEMEN PADANG';
        subTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF666666' } };
        subTitle.alignment = centerAlignment;

        sheet.addRow([]);

        // --- B. INFORMASI METADATA PO ---
        sheet.addRow(['NOMOR PO', data.header.no_po, '', 'MATERIAL', data.header.material]);
        sheet.addRow(['KAPAL', data.header.nama_kapal, '', 'TARGET', `${parseFloat(data.header.quantity).toLocaleString()} TON`]);
        sheet.addRow(['INCOTERM', data.header.incoterm, '', 'NO. BL', data.header.no_bl]);
        sheet.addRow([]);


        // --- D. TABEL I: LOG REALISASI KEBERANGKATAN ---
        sheet.addRow(['I. LOG REALISASI KEBERANGKATAN (PER RITASE)']).font = { ...boldFont, italic: true, color: { argb: 'FFFF0000' } };
        const headLog = sheet.addRow(['No', 'Waktu / Jam', 'Nomor Polisi', 'Transporter', 'Shift', 'Personil Lapangan']);
        headLog.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } }; // Warna Gelap
            cell.font = { ...boldFont, color: { argb: 'FFFFFFFF' } }; // Tulisan Putih
            cell.border = thinBorder;
            cell.alignment = centerAlignment;
        });

        if (data.realisasiDetail && data.realisasiDetail.length > 0) {
            data.realisasiDetail.forEach((log, i) => {
                const waktu = new Date(log.waktu_berangkat).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
                const row = sheet.addRow([i + 1, waktu, log.plat_nomor, log.nama_transporter, log.nama_shift, log.nama_petugas]);
                row.eachCell(cell => {
                    cell.border = thinBorder;
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                });
            });
        } else {
            const emptyRow = sheet.addRow(['Tidak ada aktivitas keberangkatan']);
            sheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        }
        sheet.addRow([]);

        // --- E. TABEL II: DAFTAR UNIT TERDAFTAR (PER TRANSPORTER) ---
        sheet.addRow(['II. DAFTAR UNIT KENDARAAN TERDAFTAR']).font = { ...boldFont, italic: true, color: { argb: 'FFFF0000' } };

        Object.keys(groupedVehicles).forEach(transporterName => {
            sheet.addRow([`Transporter: ${transporterName.toUpperCase()}`]).font = boldFont;
            const headSub = sheet.addRow(['No', 'Nomor Polisi (Nopol)', 'Status']);
            headSub.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                cell.font = { ...boldFont, color: { argb: 'FFFFFFFF' } };
                cell.border = thinBorder;
            });

            groupedVehicles[transporterName].forEach((v, i) => {
                const row = sheet.addRow([i + 1, v.plat_nomor, v.status_kendaraan]);
                row.eachCell(cell => cell.border = thinBorder);
            });
            sheet.addRow([]); 
        });

        // --- KONFIGURASI LEBAR KOLOM ---
        sheet.getColumn(1).width = 5;  // No
        sheet.getColumn(2).width = 20; // Waktu
        sheet.getColumn(3).width = 15; // Nopol
        sheet.getColumn(4).width = 30; // Transporter
        sheet.getColumn(5).width = 10; // Shift
        sheet.getColumn(6).width = 25; // Petugas

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Laporan_PO_${data.header.no_po}.xlsx`);
    };

    // 3. Fungsi Print PDF
    const handlePrintPDF = () => {
        window.print();
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-red-600 animate-pulse">Menyiapkan Preview Laporan...</div>;
    if (!data) return <div className="flex h-screen items-center justify-center font-bold">Laporan tidak tersedia.</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden print-parent">
            <style>
                {`
                @media print {
                    .no-print, nav, aside, .Sidebar, .Topbar, button, .action-bar, .Topbar-container { 
                        display: none !important; 
                    }
                    .print-parent, body, html {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    main { 
                        display: block !important;
                        background: white !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        overflow: visible !important; 
                    }
                    .preview-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        display: block !important;
                    }
                    .laporan-paper { 
                        width: 100% !important;
                        min-height: auto !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important;
                        padding: 15mm !important;
                    }
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                }
                `}
            </style>

            <div className="no-print">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </div>
            
            <div className="flex-1 flex flex-col min-w-0">
                <div className="no-print">
                    <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Laporan" />
                </div>
                
                <main className="flex-grow p-0 overflow-y-auto bg-gray-200">
                    <div className="bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-10 no-print action-bar">
                        <button 
                            onClick={() => navigate('/laporan')} 
                            className="text-black font-black text-2xl hover:text-red-600 transition-colors uppercase ml-4"
                        >
                            Back
                        </button>
                        <div className="flex gap-3 mr-4">
                            <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all text-sm uppercase flex items-center gap-2">
                                <i className="fas fa-file-excel"></i> Export Excel
                            </button>
                            <button onClick={handlePrintPDF} className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all text-sm uppercase flex items-center gap-2">
                                <i className="fas fa-file-pdf"></i> Print PDF
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center p-0 md:p-10 preview-container">
                        <div className="bg-white w-full md:w-[210mm] min-h-[297mm] shadow-2xl p-8 md:p-16 flex flex-col text-black laporan-paper">
                            
                            {/* 2. PERBAIKAN HEADER / KOP SURAT */}
                            <div className="flex items-center border-b-4 border-black pb-4 mb-8">
                                <img src={logoSemenPadang} alt="Logo Semen Padang" className="w-24 h-auto mr-6" />
                                <div className="flex-1 text-left">
                                    <h1 className="text-2xl font-black uppercase tracking-tighter leading-tight">Rekapitulasi Pengangkutan & Daftar Unit</h1>
                                    <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Logistik Transportasi - PT Semen Padang</p>
                                </div>
                            </div>

                            <div className="mb-10 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 font-bold uppercase text-left">
                                    <p>Nomor PO : <span className="font-medium text-gray-700">{data.header.no_po}</span></p>
                                    <p>Material : <span className="font-medium text-gray-700">{data.header.material}</span></p>
                                    <p>Nama Kapal : <span className="font-medium text-gray-700">{data.header.nama_kapal}</span></p>
                                    <p>Target Qty : <span className="font-medium text-gray-700">{parseFloat(data.header.quantity).toLocaleString()} TON</span></p>
                                    <p>Incoterm : <span className="font-medium text-gray-700">{data.header.incoterm}</span></p>
                                    <p>Nomor BL : <span className="font-medium text-gray-700">{data.header.no_bl}</span></p>
                                </div>
                            </div>

  <div className="mb-10">
    <h3 className="text-sm font-black text-red-600 uppercase italic mb-3 flex items-center">
        <span className="w-8 h-[2px] bg-red-600 mr-2"></span>Realisasi Keberangkatan (per Ritase)
    </h3>
    <table className="w-full border-collapse border-2 border-black text-[9px] text-left">
        <thead className="bg-gray-800 text-white uppercase font-black">
            <tr>
                <th className="border border-black p-2 w-10 text-center">No</th>
                <th className="border border-black p-2">Waktu / Jam</th>
                <th className="border border-black p-2">Nomor Polisi</th>
                <th className="border border-black p-2">Transporter</th>
                <th className="border border-black p-2 text-center">Shift</th> {/* Kolom Baru */}
                <th className="border border-black p-2">Personil Lapangan</th>
            </tr>
        </thead>
        <tbody>
            {data.realisasiDetail && data.realisasiDetail.length > 0 ? (
                data.realisasiDetail.map((log, i) => (
                    <tr key={i} className="font-bold border-b border-gray-300">
                        <td className="border border-black p-2 text-center text-gray-500">{i + 1}</td>
                        <td className="border border-black p-2">
                            {new Date(log.waktu_berangkat).toLocaleString('id-ID', { 
                                dateStyle: 'short', timeStyle: 'short' 
                            })}
                        </td>
                        <td className="border border-black p-2 tracking-widest uppercase text-blue-700">{log.plat_nomor}</td>
                        <td className="border border-black p-2 uppercase">{log.nama_transporter}</td>
                        <td className="border border-black p-2 text-center">
                            <span className="bg-gray-200 px-2 py-1 rounded text-black border border-gray-400">
                                {log.nama_shift}
                            </span>
                        </td>
                        <td className="border border-black p-2 italic">
                            {log.nama_petugas}
                        </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="6" className="border border-black p-4 text-center italic text-gray-400">
                        Belum ada aktivitas keberangkatan untuk PO ini.
                    </td>
                </tr>
            )}
        </tbody>
    </table>
</div>

                            <div>
                                <h3 className="text-sm font-black text-red-600 uppercase italic mb-3 flex items-center">
                                    <span className="w-8 h-[2px] bg-red-600 mr-2"></span>Daftar Unit Kendaraan Terdaftar
                                </h3>
                                
                                {Object.keys(groupedVehicles).length > 0 ? (
                                    Object.keys(groupedVehicles).map((transporterName, index) => (
                                        <div key={index} className="mb-6">
                                            <div className="bg-gray-800 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest inline-block mb-1">
                                                Transporter: {transporterName}
                                            </div>
                                            <table className="w-full border-collapse border-2 border-black text-[10px] text-left">
                                                <thead className="bg-red-50 uppercase font-black text-red-600">
                                                    <tr>
                                                        <th className="border border-black p-2 w-10 text-center">No</th>
                                                        <th className="border border-black p-2">Nomor Polisi (Nopol)</th>
                                                        <th className="border border-black p-2 text-center w-24">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {groupedVehicles[transporterName].map((v, i) => (
                                                        <tr key={i}>
                                                            <td className="border border-black p-2 text-center font-bold text-gray-400">{i + 1}</td>
                                                            <td className="border border-black p-2 font-black text-sm tracking-widest uppercase">{v.plat_nomor}</td>
                                                            <td className="border border-black p-2 text-center uppercase font-black text-[9px] text-green-600">{v.status_kendaraan}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))
                                ) : (
                                    <div className="border-2 border-black p-4 text-center italic text-gray-400 text-xs">Tidak ada data unit terdaftar untuk PO ini.</div>
                                )}
                            </div>

                            <div className="mt-auto flex justify-end pt-20">
                                <div className="text-center w-64">
                                    <p className="text-xs font-bold uppercase mb-20">Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LaporanDetail;