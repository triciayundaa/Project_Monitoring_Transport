import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const VehicleList = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [transporters, setTransporters] = useState([]);
    const [filteredTransporters, setFilteredTransporters] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/vehicles/transporters');
            setTransporters(response.data);
            setFilteredTransporters(response.data);
        } catch (error) {
            console.error("Detail Error:", error.response?.data);
            alert("Server Error: " + (error.response?.data?.message || "Koneksi bermasalah"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const results = transporters.filter(item =>
            item.transporter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.no_po?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTransporters(results);
    }, [searchTerm, transporters]);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
                <Topbar 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    title="Manajemen Kendaraan" 
                />

                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        
                        {/* Header & Search Bar Section */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-red-600 uppercase tracking-tighter">
                                    Daftar Transporter
                                </h2>
                                <p className="text-sm text-gray-500 font-medium tracking-tight">Kelola kendaraan berdasarkan vendor pengiriman aktif</p>
                            </div>
                            
                            {/* Hanya tampilkan search jika ada data utama */}
                            {transporters.length > 0 && (
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="Cari Transporter atau No. PO..." 
                                        className="w-full lg:w-96 pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-bold"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <i className="fas fa-search absolute left-4 top-4 text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                                </div>
                            )}
                        </div>

                        {/* Kondisi 1: Sedang Memuat Data */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mb-4"></div>
                                <p className="text-gray-500 font-bold italic animate-pulse">Menyingkronkan data...</p>
                            </div>
                        ) : transporters.length === 0 ? (
                            /* Kondisi 2: Database Benar-benar Kosong (Belum ada Input) */
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-inner flex flex-col items-center">
                                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <i className="fas fa-database text-red-300 text-4xl"></i>
                                </div>
                                <p className="text-gray-600 font-black text-2xl mb-2 uppercase tracking-tighter">Data Kosong</p>
                                <p className="text-gray-400 text-base max-w-sm mx-auto font-medium">
                                    Belum ada data kegiatan yang diinputkan. Silakan tambahkan data melalui menu 
                                    <span className="text-red-600 font-bold px-1 italic">Manajemen Kegiatan</span> terlebih dahulu.
                                </p>
                            </div>
                        ) : filteredTransporters.length > 0 ? (
                            /* Kondisi 3: Data Ada dan Berhasil Ditemukan */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTransporters.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-t-8 border-t-red-600 group"
                                    >
                                        <div className="mb-6">
                                            <h3 className="text-xl font-black text-gray-800 leading-tight mb-4 min-h-[3rem] line-clamp-2 uppercase tracking-tight">
                                                {item.transporter || "Transporter Tidak Diketahui"}
                                            </h3>
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <span className="bg-gray-100 px-3 py-1 rounded-full mr-2 text-gray-600 shadow-sm">PO</span>
                                                    {item.no_po}
                                                </div>
                                                <div className="flex items-center text-sm font-black text-gray-700 bg-red-50 p-4 rounded-2xl w-full border border-red-100 group-hover:bg-red-600 group-hover:border-red-600 transition-colors duration-300">
                                                    <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-red-200 group-hover:bg-white group-hover:shadow-none transition-colors">
                                                        <i className="fas fa-truck-moving text-white text-xs group-hover:text-red-600 transition-colors"></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-red-400 group-hover:text-red-100 uppercase leading-none mb-1 transition-colors">Total Kendaraan</p>
                                                        <p className="text-xl text-red-600 group-hover:text-white leading-none transition-colors">
                                                            {item.totalVehicles || 0} <span className="text-xs font-bold uppercase tracking-tighter">Unit</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => navigate(`/vehicle-management/${item.no_po}`)}
                                            className="w-full bg-gray-900 hover:bg-red-600 text-white py-4 rounded-2xl text-xs font-black transition-all shadow-xl hover:shadow-red-200 uppercase tracking-widest flex items-center justify-center"
                                        >
                                            Kelola Kendaraan
                                            <i className="fas fa-arrow-right ml-3 group-hover:translate-x-2 transition-transform"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Kondisi 4: Data Ada, tapi Hasil Pencarian Nihil */
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-inner">
                                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <i className="fas fa-search text-gray-300 text-4xl"></i>
                                </div>
                                <p className="text-gray-600 font-black text-2xl mb-2 uppercase tracking-tighter">Pencarian Tidak Ditemukan</p>
                                <p className="text-gray-400 text-base max-w-xs mx-auto font-medium tracking-tight">
                                    Kami tidak dapat menemukan transporter atau No. PO "<span className="text-red-500 font-bold">{searchTerm}</span>".
                                </p>
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="mt-6 px-8 py-2 bg-red-50 text-red-600 rounded-full font-bold text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                                >
                                    Bersihkan Filter
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VehicleList;