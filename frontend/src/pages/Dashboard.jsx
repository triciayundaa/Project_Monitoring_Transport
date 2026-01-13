import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const Dashboard = () => {
    const navigate = useNavigate();
    // Set default true agar saat pertama buka di desktop langsung muncul
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Double check: Pastikan hanya admin yang bisa akses dashboard ini
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                const userRole = String(userData.role || '').toLowerCase().trim();
                
                if (userRole !== 'admin') {
                    console.log('⚠️ Non-admin user detected in Dashboard - Redirecting to /keberangkatan-truk');
                    navigate('/keberangkatan-truk', { replace: true });
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                navigate('/login', { replace: true });
            }
        } else {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const stats = [
        { label: 'Total Kegiatan', value: 60, color: 'bg-red-50', icon: 'fas fa-chart-line', iconColor: 'text-red-500' },
        { label: 'Waiting', value: 20, color: 'bg-red-50', icon: 'fas fa-stopwatch', iconColor: 'text-red-600' },
        { label: 'On Progress', value: 30, color: 'bg-red-50', icon: 'fas fa-history', iconColor: 'text-red-700' },
        { label: 'Completed', value: 10, color: 'bg-red-50', icon: 'fas fa-check-circle', iconColor: 'text-red-800' },
    ];

    const dataPie = [
        { name: 'Waiting', value: 20, color: '#DC2626' },
        { name: 'On Progress', value: 30, color: '#F97316' },
        { name: 'Completed', value: 10, color: '#16A34A' },
    ];

    const dataBar = [
        { day: 'Senin', value: 45 }, { day: 'Selasa', value: 35 },
        { day: 'Rabu', value: 20 }, { day: 'Kamis', value: 20 },
        { day: 'Jumat', value: 5 }, { day: 'Sabtu', value: 0 }, { day: 'Minggu', value: 0 },
    ];

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            
            {/* SIDEBAR: Tidak lagi menggunakan fixed yang melayang di desktop */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* AREA UTAMA: flex-1 akan mengambil sisa ruang yang ditinggalkan sidebar */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
                
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                    <div className="flex justify-end mb-6">
                        <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-red-500">
                            <option>Hari Ini</option>
                            <option>Minggu Ini</option>
                        </select>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm flex items-center space-x-4 border border-gray-100 hover:shadow-md transition-all duration-300">
                                <div className={`${stat.color} p-3 rounded-xl`}>
                                    <i className={`${stat.icon} text-xl ${stat.iconColor}`}></i>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                            <h3 className="text-gray-800 font-bold mb-6 flex items-center">
                                <span className="w-1.5 h-6 bg-red-600 rounded-full mr-3"></span>
                                Distribusi Status Kegiatan
                            </h3>
                            <div className="flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={dataPie} innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                                            {dataPie.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip cornerRadius={10} />
                                        <Legend iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                            <h3 className="text-gray-800 font-bold mb-6 flex items-center">
                                <span className="w-1.5 h-6 bg-red-600 rounded-full mr-3"></span>
                                Total Kegiatan Minggu Ini
                            </h3>
                            <div className="flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataBar}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                        <Tooltip cursor={{fill: '#F9FAFB'}} />
                                        <Bar dataKey="value" fill="#DC2626" radius={[10, 10, 0, 0]} barSize={35} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;