import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoSemen from '../assets/logo-semen-padang.png';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { name: 'Beranda', icon: 'fas fa-tachometer-alt', path: '/dashboard' },
        { name: 'Manajemen Kegiatan', icon: 'fas fa-th-large', path: '/kegiatan' },
        { name: 'Manajemen Kendaraan', icon: 'fas fa-truck', path: '/kendaraan' },
        { name: 'Laporan', icon: 'fas fa-file-alt', path: '/laporan' },
        { name: 'Manajemen Pengguna', icon: 'fas fa-users', path: '/users' },
        { name: 'Manajemen Jadwal', icon: 'fas fa-calendar-alt', path: '/jadwal' },
    ];

    // ✅ FUNGSI UNTUK CEK APAKAH MENU AKTIF
    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === path;
        }
        // Untuk menu lain, cek apakah pathname dimulai dengan path tersebut
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
        onClose();
    };

    return (
        <div
            className={`bg-white border-r border-gray-200 h-full transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden z-30 ${
                isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'
            }`}
        >
            <div className="w-64 h-full flex flex-col">
                
                {/* HEADER */}
                <div className="p-6">
                    <div className="flex items-center space-x-2">
                        <img src={logoSemen} alt="Logo" className="h-10" />
                        <span className="font-bold text-red-700 text-xs uppercase">
                            PT Semen Padang
                        </span>
                    </div>

                    <div className="mt-8 flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full border-2 border-red-600 flex items-center justify-center shadow-inner">
                            <i className="fas fa-user-plus text-red-600 text-3xl"></i>
                        </div>
                        <p className="mt-2 font-bold text-gray-800">Admin</p>
                        <p className="text-xs text-gray-500">admin1234@gmail.com</p>
                    </div>
                </div>

                {/* MENU */}
                <nav className="mt-4 flex-grow px-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                navigate(item.path);
                                onClose();
                            }}
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                isActive(item.path)
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                    : 'text-red-600 hover:bg-red-50 font-medium'
                            }`}
                        >
                            <i className={`${item.icon} w-5 text-center`}></i>
                            <span className="text-sm whitespace-nowrap">
                                {item.name}
                            </span>
                        </div>
                    ))}
                </nav>

                {/* LOGOUT */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center space-x-3 text-red-600 font-bold p-3 hover:bg-red-50 w-full rounded-lg transition-all"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        <span>LogOut</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;