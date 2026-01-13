import React, { useEffect, useState } from 'react';

const Topbar = ({ onToggleSidebar, title = 'Dashboard' }) => {
    const [role, setRole] = useState('Guest');

    useEffect(() => {
        // Ambil data user dari localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                // Pastikan properti 'role' sesuai dengan yang dikirim backend (users[0].role)
                if (userData.role) {
                    setRole(userData.role);
                }
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    }, []);

    return (
        <div className="bg-white h-16 flex items-center justify-between border-b border-gray-200 shadow-sm px-4 md:px-6 relative">
            
            {/* BAGIAN KIRI: Tombol Hamburger */}
            <div className="flex items-center z-10">
                <button 
                    onClick={onToggleSidebar} 
                    className="text-red-600 p-2 rounded-md hover:bg-red-50 focus:outline-none transition-colors"
                    title="Toggle Sidebar"
                >
                    <i className="fas fa-bars text-xl md:text-2xl"></i>
                </button>
            </div>

            {/* BAGIAN TENGAH: Judul halaman (Presisi di Tengah) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h1 className="text-xl md:text-2xl font-extrabold text-red-600 tracking-wider uppercase pointer-events-auto">
                    {title}
                </h1>
            </div>

            {/* BAGIAN KANAN: Kosongkan atau hanya tampilkan untuk admin */}
            <div className="flex items-center z-10">
                {/* Dashboard ini khusus untuk admin, jadi bagian kanan dikosongkan */}
            </div>
            
        </div>
    );
};

export default Topbar;