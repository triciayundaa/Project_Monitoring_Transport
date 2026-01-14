import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const LaporanDetail = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Laporan" />
                
                <main className="flex-grow p-0 overflow-y-auto bg-gray-200">
                    {/* Header Action Bar */}
                    <div className="bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                        <button 
    onClick={() => navigate('/laporan')} 
    className="text-black font-black text-2xl hover:text-red-600 transition-colors uppercase ml-4"
>
    Back
</button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all text-sm uppercase mr-4">
                            Print PDF
                        </button>
                    </div>

                    {/* PDF Preview Area */}
                    <div className="flex justify-center p-10">
                        <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-20 flex flex-col items-center">
                            <h1 className="text-3xl font-black text-black uppercase tracking-tighter mb-10">
                                Laporan PO XXXXXXX
                            </h1>
                            
                            {/* Area Kosong Laporan sesuai desain */}
                            <div className="w-full h-full border border-dashed border-gray-100 italic text-gray-300 flex justify-center mt-20">
                                Konten laporan akan muncul di sini...
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LaporanDetail;