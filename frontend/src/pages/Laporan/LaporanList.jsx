import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const LaporanList = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [filter, setFilter] = useState('Semua Laporan');
    const navigate = useNavigate();

    // Data dummy (nantinya field date & time ini akan datang dari database/API)
    const daftarLaporan = [
        { id: 1, title: 'Laporan PO 77XXXXXX', date: '12 Jan 2026', time: '14:30' },
        { id: 2, title: 'Laporan Daftar Transportr', date: '13 Jan 2026', time: '09:15' },
        { id: 3, title: 'Laporan Pengangkutan Mingguan', date: '14 Jan 2026', time: '11:00' },
        { id: 4, title: 'Laporan Inventaris Gudang', date: '14 Jan 2026', time: '16:45' },
    ];

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Laporan" />
                
                <main className="flex-grow p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        
                        <div className="flex justify-between items-start mb-12">
                            <button className="bg-red-600 hover:bg-red-700 text-white px-10 py-3 rounded-xl font-bold shadow-lg transition-all text-sm uppercase tracking-wider transform hover:scale-105 active:scale-95">
                                <i className="fas fa-plus-circle mr-2"></i>
                                Generate laporan
                            </button>

                            <div className="relative inline-block w-64">
                                <select 
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="w-full bg-white border border-gray-200 p-3 rounded-xl shadow-sm outline-none font-bold text-gray-700 appearance-none cursor-pointer focus:border-red-500 transition-colors"
                                >
                                    <option>Semua Laporan</option>
                                    <option>Laporan Mingguan</option>
                                    <option>Laporan Bulanan</option>
                                    <option>Arsip Laporan</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4 mb-6">
                                <h2 className="text-3xl font-black text-red-600 tracking-tighter uppercase">Daftar Laporan</h2>
                                <div className="h-[2px] flex-grow bg-red-100 mt-2"></div>
                            </div>
                            
                            {daftarLaporan.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="group bg-white border-2 border-red-500 rounded-[2rem] p-6 flex justify-between items-center shadow-sm hover:shadow-xl hover:bg-red-50/40 transition-all duration-300"
                                >
                                    <div className="flex items-center space-x-6">
                                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 text-2xl group-hover:bg-red-600 group-hover:text-white shadow-inner transition-all duration-300">
                                            <i className="fas fa-file-invoice"></i>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-red-600 font-black text-xl tracking-tight uppercase mb-1">
                                                {item.title}
                                            </span>
                                            {/* Metadata: Tanggal dan Jam */}
                                            <div className="flex items-center space-x-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                <span className="flex items-center">
                                                    <i className="far fa-calendar-alt mr-2 text-red-400"></i> {item.date}
                                                </span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span className="flex items-center">
                                                    <i className="far fa-clock mr-2 text-red-400"></i> {item.time} WIB
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/laporan/detail/${item.id}`)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase shadow-md hover:shadow-green-200 transition-all transform hover:-translate-x-3 active:scale-95"
                                    >
                                        <i className="fas fa-eye mr-2"></i>
                                        Lihat Detail
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LaporanList;