import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Topbar = ({ onToggleSidebar, title }) => { 
    const location = useLocation();
    const [role, setRole] = useState('Guest');

    // --- LOGIKA JUDUL (Hybrid: Prioritas Props, Fallback ke URL) ---
    const getDisplayTitle = () => {
        if (title) return title; // Jika props 'title' dikirim, pakai itu.

        // Fallback: Tentukan dari URL
        const path = location.pathname;
        if (path === '/dashboard') return 'Dashboard';
        if (path.startsWith('/manajemen-kegiatan')) return 'Manajemen Kegiatan';
        if (path.startsWith('/manajemen-kendaraan') || path.startsWith('/kendaraan')) return 'Manajemen Kendaraan';
        if (path.startsWith('/laporan')) return 'Laporan';
        if (path.startsWith('/manajemen-pengguna') || path.startsWith('/users')) return 'Manajemen Pengguna';
        if (path.startsWith('/manajemen-jadwal') || path.startsWith('/jadwal')) return 'Manajemen Jadwal';
        if (path.startsWith('/keberangkatan-truk')) return 'Keberangkatan Truk';
        
        return 'Dashboard';
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (userData.role) {
                    setRole(userData.role);
                }
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    }, []);

    return (
        <div className="bg-white h-16 flex items-center justify-between border-b border-gray-200 shadow-sm px-4 md:px-6 relative z-20">
            
            {/* BAGIAN KIRI: Tombol Toggle Sidebar */}
            <div className="flex items-center z-10">
                <button 
                    onClick={onToggleSidebar} 
                    className="text-red-600 p-2 rounded-md hover:bg-red-50 focus:outline-none transition-colors"
                    title="Toggle Sidebar"
                >
                    <i className="fas fa-bars text-xl md:text-2xl"></i>
                </button>
            </div>

            {/* BAGIAN TENGAH: Judul Halaman (Presisi di Tengah) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h1 className="text-lg md:text-2xl font-extrabold text-red-600 tracking-wider uppercase pointer-events-auto truncate max-w-[60%] text-center">
                    {getDisplayTitle()}
                </h1>
            </div>

            {/* BAGIAN KANAN: Menampilkan Role & Status Online */}
            <div className="flex items-center z-10">
                <div className="flex flex-col items-end">
                    {/* Role hanya muncul di layar besar agar tidak sempit di HP */}
                    <span className="hidden md:block text-sm md:text-base font-bold text-gray-500 tracking-widest uppercase">
                        {role}
                    </span>
                    <span className="flex items-center text-[10px] text-green-500 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                        <span className="hidden sm:inline">Online</span>
                        <span className="sm:hidden">On</span>
                    </span>
                </div>
            </div>
            
        </div>
    );
};

export default Topbar;