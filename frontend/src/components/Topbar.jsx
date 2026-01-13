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
        <div className="bg-white h-16 flex items-center justify-between border-b shadow px-4 relative">

            {/* Hamburger */}
            <button
                onClick={onToggleSidebar}
                className="text-red-600 p-2 hover:bg-red-50 rounded"
            >
                <i className="fas fa-bars text-xl"></i>
            </button>

            {/* Title */}
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                <h1 className="text-2xl font-extrabold text-red-600 uppercase">
                    {getTitle()}
                </h1>
            </div>

            {/* Role */}
            <div className="text-right">
                <div className="text-sm font-bold text-gray-500 uppercase">{role}</div>
                <div className="text-[10px] text-green-500 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Online
                </div>
            </div>

        </div>
    );
};

export default Topbar;