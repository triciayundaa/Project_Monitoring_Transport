import React, { useEffect, useState } from 'react';

// Tambahkan { title } sebagai props
const Topbar = ({ onToggleSidebar, title = "Dashboard" }) => { 
    const [role, setRole] = useState('Guest');

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
        <div className="bg-white h-16 flex items-center justify-between border-b border-gray-200 shadow-sm px-4 md:px-6 relative">
            
            <div className="flex items-center z-10">
                <button 
                    onClick={onToggleSidebar} 
                    className="text-red-600 p-2 rounded-md hover:bg-red-50 focus:outline-none transition-colors"
                    title="Toggle Sidebar"
                >
                    <i className="fas fa-bars text-xl md:text-2xl"></i>
                </button>
            </div>

            {/* Bagian Tengah: Judul sekarang menggunakan variabel {title} */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h1 className="text-xl md:text-2xl font-extrabold text-red-600 tracking-wider uppercase pointer-events-auto">
                    {title}
                </h1>
            </div>

            <div className="flex items-center z-10">
                <div className="flex flex-col items-end">
                    <span className="text-sm md:text-base font-bold text-gray-500 tracking-widest uppercase">
                        {role}
                    </span>
                    <span className="flex items-center text-[10px] text-green-500 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                        Online
                    </span>
                </div>
            </div>
            
        </div>
    );
};

export default Topbar;