import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoSemen from '../assets/logo-semen-padang.png';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [userProfile, setUserProfile] = useState({
        nama: 'Admin',
        email: 'admin@mail.com'
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUserProfile({
                    nama: parsedUser.nama || 'Admin',
                    email: parsedUser.email || 'admin@mail.com'
                });
            } catch (error) {
                console.error("Gagal memproses data user dari storage:", error);
            }
        }
    }, []);

    const menuItems = [
        { name: 'Beranda', icon: 'fas fa-tachometer-alt', path: '/dashboard' },
        { name: 'Manajemen Kegiatan', icon: 'fas fa-th-large', path: '/manajemen-kegiatan' },
        { name: 'Manajemen Kendaraan', icon: 'fas fa-truck', path: '/manajemen-kendaraan' }, 
        { name: 'Manajemen Truk Air', icon: 'fas fa-water', path: '/daftar-truk-air' },
        { name: 'Laporan', icon: 'fas fa-file-alt', path: '/laporan' },
        { name: 'Manajemen Pengguna', icon: 'fas fa-users', path: '/manajemen-pengguna' },
        { name: 'Manajemen Jadwal', icon: 'fas fa-calendar-alt', path: '/manajemen-jadwal' },
    ];

    const checkActive = (path) => {
        if (path === '/dashboard') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('sidebarOpen');
        navigate('/login');
        onClose();
    };

    const handleMenuClick = (path) => {
        navigate(path);
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    return (
        <>
            {/* Overlay untuk mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            
            {/* Sidebar */}
            <div
                className={`
                    bg-white border-r border-gray-200 h-full
                    transition-transform duration-300 ease-in-out
                    
                    fixed lg:sticky top-0 left-0 z-50
                    
                    w-64
                    
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    
                    lg:translate-x-0
                `}
            >
                <div className="w-64 h-full flex flex-col">
                    
                    {/* HEADER & PROFIL */}
                    <div className="p-6">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                                <img src={logoSemen} alt="Logo" className="h-10" />
                                <span className="font-bold text-red-700 text-xs uppercase whitespace-nowrap">
                                    PT SEMEN PADANG
                                </span>
                            </div>
                            
                            <button
                                onClick={onClose}
                                className="lg:hidden w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <div className="mt-8 flex flex-col items-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full border-2 border-red-600 flex items-center justify-center shadow-inner">
                                <i className="fas fa-user text-red-600 text-3xl"></i>
                            </div>
                            <p className="mt-2 font-bold text-gray-800 uppercase tracking-tight text-center px-2 truncate w-full">
                                {userProfile.nama}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium text-center px-2 truncate w-full">
                                {userProfile.email}
                            </p>
                        </div>
                    </div>

                    {/* MENU NAVIGATION */}
                    <nav className="mt-4 flex-grow px-4 space-y-2 overflow-y-auto">
                        {menuItems.map((item, index) => {
                            const isActive = checkActive(item.path);

                            return (
                                <div
                                    key={index}
                                    onClick={() => handleMenuClick(item.path)}
                                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                                        : 'text-red-600 hover:bg-red-50 font-medium'
                                    }`}
                                >
                                    <i className={`${item.icon} w-5 text-center`}></i>
                                    <span className="text-sm whitespace-nowrap">{item.name}</span>
                                </div>
                            );
                        })}
                    </nav>

                    {/* LOGOUT */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center space-x-3 text-red-600 font-bold p-3 hover:bg-red-50 w-full rounded-lg transition-all"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span className="whitespace-nowrap uppercase text-sm tracking-wider">LogOut</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;