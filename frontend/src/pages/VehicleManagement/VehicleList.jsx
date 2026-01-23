import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const VehicleList = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [transporters, setTransporters] = useState([]);
    const [groupedData, setGroupedData] = useState({}); // State untuk data terkelompok
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setLoading(true);
            // Memanggil endpoint yang sudah diperbarui logic count-nya di backend
            const response = await axios.get('http://localhost:3000/api/vehicles/transporters');
            console.log('📦 Data dari API Transporters:', response.data); 
            setTransporters(response.data);
            
            // LOGIKA GROUPING: Mengelompokkan Transporter berdasarkan No PO
            const grouped = response.data.reduce((acc, item) => {
                const key = item.no_po;
                if (!acc[key]) {
                    acc[key] = {
                        no_po: item.no_po,
                        material: item.material || 'N/A',
                        transporters: []
                    };
                }
                acc[key].transporters.push(item);
                return acc;
            }, {});
            
            setGroupedData(grouped);
        } catch (error) {
            console.error("❌ Error:", error.response?.data);
            alert("Server Error: " + (error.response?.data?.message || "Koneksi bermasalah"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // LOGIKA FILTER: Mencari di dalam objek groupedData
    const filteredPoKeys = Object.keys(groupedData).filter(poKey => {
        const po = groupedData[poKey];
        const searchLower = searchTerm.toLowerCase();
        
        return po.no_po.toLowerCase().includes(searchLower) || 
               po.transporters.some(t => t.nama_transporter?.toLowerCase().includes(searchLower));
    });

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
                <Topbar 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    title="Manajemen Kendaraan" 
                />

                <main className="flex-grow p-6 overflow-y-auto bg-gray-200">
                    <div className="max-w-7xl mx-auto">
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-red-600 uppercase tracking-tighter">
                                    Manajemen Unit
                                </h2>
                                <p className="text-sm text-gray-500 font-medium tracking-tight">Kelola armada yang dialokasikan khusus per Nomor PO</p>
                            </div>
                            
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="Cari No. PO atau Transporter..." 
                                    className="w-full lg:w-96 pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-bold"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <i className="fas fa-search absolute left-4 top-4 text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mb-4"></div>
                                <p className="text-gray-500 font-bold italic animate-pulse">Menyingkronkan data...</p>
                            </div>
                        ) : filteredPoKeys.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-inner flex flex-col items-center">
                                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <i className="fas fa-database text-red-300 text-4xl"></i>
                                </div>
                                <p className="text-gray-600 font-black text-2xl mb-2 uppercase tracking-tighter">Data Tidak Ditemukan</p>
                                <p className="text-gray-400 text-base max-w-sm mx-auto font-medium text-center">
                                    Belum ada data kegiatan atau hasil pencarian tidak ditemukan.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {filteredPoKeys.map((poKey) => (
                                    <div key={poKey} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                        {/* HEADER PO SECTION */}
                                        <div className="bg-gray-900 p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">ALOKASI AKTIF</div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                                    NO. PO: {poKey}
                                                </h3>
                                            </div>
                                            <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                                <i className="fas fa-layer-group mr-2"></i>
                                                {groupedData[poKey].transporters.length} Transporter Ditugaskan
                                            </div>
                                        </div>

                                        {/* LIST TRANSPORTER SECTION */}
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {groupedData[poKey].transporters.map((item, index) => (
                                                <div 
                                                    key={index} 
                                                    className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:border-red-500 hover:bg-white transition-all duration-300 group"
                                                >
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Nama Transporter</p>
                                                    <h4 className="text-lg font-black text-gray-800 leading-tight mb-4 min-h-[3rem] line-clamp-2 uppercase">
                                                        {item.nama_transporter || "Transporter Tidak Diketahui"}
                                                    </h4>
                                                    
                                                    <div className="flex items-center text-sm font-black text-gray-700 bg-white p-4 rounded-2xl w-full border border-gray-100 mb-6 shadow-sm">
                                                        <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center mr-4">
                                                            <i className="fas fa-truck-moving text-white text-xs"></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 uppercase leading-none mb-1">Unit di PO Ini</p>
                                                            <p className="text-xl text-red-600 leading-none">
                                                                {item.total_kendaraan_vendor || 0} <span className="text-xs font-bold uppercase tracking-tighter">Unit</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => navigate(`/vehicle-management/${item.no_po}/${item.transporter_id}`)}
                                                        className="w-full bg-gray-900 hover:bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95"
                                                    >
                                                        Kelola Kendaraan
                                                        <i className="fas fa-arrow-right ml-3 group-hover:translate-x-2 transition-transform"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VehicleList;