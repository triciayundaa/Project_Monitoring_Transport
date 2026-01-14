import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Topbar = ({ onToggleSidebar }) => {
    const location = useLocation();
    const [role, setRole] = useState('Guest');

    
    const getTitle = () => {
        const path = location.pathname;
        
        if (path === '/dashboard') return 'Dashboard';
        if (path.startsWith('/kegiatan')) return 'Manajemen Kegiatan';
        if (path.startsWith('/kendaraan')) return 'Manajemen Kendaraan';
        if (path.startsWith('/laporan')) return 'Laporan';
        if (path.startsWith('/pengguna') || path.startsWith('/users')) return 'Manajemen Pengguna';
        if (path.startsWith('/jadwal')) return 'Manajemen Jadwal';
        
        return 'Dashboard';
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (userData.role) setRole(userData.role);
            } catch (err) {
                console.error(err);
            }
        }
    }, []);

    return (
        <div className="bg-white h-12 md:h-16 flex items-center justify-between border-b shadow px-3 md:px-4">

            {/* Left: Hamburger */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleSidebar}
                    className="text-red-600 p-2 hover:bg-red-50 rounded"
                    aria-label="Toggle sidebar"
                >
                    <i className="fas fa-bars text-lg md:text-xl"></i>
                </button>
            </div>

            {/* Center: Title */}
            <div className="flex-1 flex justify-center">
                <h1 className="text-lg md:text-2xl font-extrabold text-red-600 uppercase truncate max-w-[60vw] text-center">
                    {getTitle()}
                </h1>
            </div>

            {/* Right: Role / status (compact on small screens) */}
            <div className="text-right flex flex-col items-end md:items-end">
                <div className="text-xs md:text-sm font-bold text-gray-500 uppercase hidden md:block">{role}</div>
                <div className="text-[10px] md:text-[11px] text-green-500 flex items-center justify-end gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="hidden sm:inline">Online</span>
                </div>
            </div>

        </div>
    );
};

export default Topbar;