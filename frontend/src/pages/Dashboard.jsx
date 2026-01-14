import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const Dashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [kegiatanList, setKegiatanList] = useState([]);
    const [stats, setStats] = useState([
        { label: 'Total Kegiatan', value: 0, color: 'bg-red-50', icon: 'fas fa-chart-line', iconColor: 'text-red-500' },
        { label: 'Waiting', value: 0, color: 'bg-yellow-50', icon: 'fas fa-stopwatch', iconColor: 'text-yellow-600' },
        { label: 'On Progress', value: 0, color: 'bg-blue-50', icon: 'fas fa-history', iconColor: 'text-blue-700' },
        { label: 'Completed', value: 0, color: 'bg-green-50', icon: 'fas fa-check-circle', iconColor: 'text-green-600' },
    ]);

    const [dataPie, setDataPie] = useState([
        { name: 'Waiting', value: 0, color: '#EAB308' },
        { name: 'On Progress', value: 0, color: '#3B82F6' },
        { name: 'Completed', value: 0, color: '#16A34A' },
    ]);

    const [dataBar, setDataBar] = useState([
        { day: 'Senin', value: 0 }, { day: 'Selasa', value: 0 },
        { day: 'Rabu', value: 0 }, { day: 'Kamis', value: 0 },
        { day: 'Jumat', value: 0 }, { day: 'Sabtu', value: 0 }, { day: 'Minggu', value: 0 },
    ]);

    const [upcoming, setUpcoming] = useState([]);
    const [period, setPeriod] = useState('Hari Ini');

    // Custom Tooltip dengan scroll yang berfungsi dengan baik
    const CustomBarTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        
        // Jika data sedikit (<=3), tampilkan semua tanpa scroll
        if (data.activities && data.activities.length <= 3) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-200 max-w-md">
                    <div className="font-bold text-gray-900 mb-3 text-base border-b pb-2">
                        {label} — {data.value} kegiatan
                    </div>
                    <div className="space-y-3">
                        {data.activities.map((a, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="font-bold text-sm text-gray-900 mb-1">PO {a.no_po}</div>
                                <div className="text-sm text-gray-700 mb-1">{a.vendor}</div>
                                <div className="text-xs text-gray-600 mb-1">
                                    Transporter: {a.transporter}
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    {a.tanggal_mulai} — {a.tanggal_selesai}
                                </div>
                                <div className="text-xs font-bold text-red-600">
                                    Total Truk: {a.total_truk}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        
        // Jika data banyak (>3), gunakan scroll
        return (
            <div 
                className="bg-white rounded-lg shadow-xl border-2 border-gray-200 max-w-md"
                style={{ 
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header Sticky */}
                <div className="font-bold text-gray-900 p-4 border-b-2 bg-white sticky top-0 z-10 text-base">
                    {label} — {data.value} kegiatan
                </div>
                
                {/* Scrollable Content */}
                <div 
                    className="overflow-y-auto p-4 pt-2"
                    style={{ 
                        maxHeight: '340px',
                        overflowY: 'scroll',
                        WebkitOverflowScrolling: 'touch' // Smooth scrolling di mobile
                    }}
                    onWheel={(e) => {
                        e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {data.activities && data.activities.length > 0 ? (
                        <div className="space-y-3">
                            {data.activities.map((a, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                    <div className="font-bold text-sm text-gray-900 mb-1">PO {a.no_po}</div>
                                    <div className="text-sm text-gray-700 mb-1">{a.vendor}</div>
                                    <div className="text-xs text-gray-600 mb-1">
                                        Transporter: {a.transporter}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                        {a.tanggal_mulai} — {a.tanggal_selesai}
                                    </div>
                                    <div className="text-xs font-bold text-red-600">
                                        Total Truk: {a.total_truk}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                            Tidak ada kegiatan pada hari ini.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/kegiatan');
                const json = await res.json();
                setKegiatanList(json);

                const today = new Date();
                today.setHours(0,0,0,0);

                let start, end;
                if (period === 'Hari Ini') {
                    start = new Date(today);
                    end = new Date(today);
                    end.setHours(23,59,59,999);
                } else {
                    const day = today.getDay();
                    const diffToMonday = (day + 6) % 7;
                    const monday = new Date(today);
                    monday.setDate(today.getDate() - diffToMonday);
                    monday.setHours(0,0,0,0);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    sunday.setHours(23,59,59,999);
                    start = monday;
                    end = sunday;
                }

                const overlaps = (k) => {
                    const s = k.tanggal_mulai ? new Date(k.tanggal_mulai) : null;
                    const e = k.tanggal_selesai ? new Date(k.tanggal_selesai) : null;
                    if (s && e) return s <= end && e >= start;
                    if (s && !e) return s <= end && s >= start;
                    if (!s && e) return e >= start && e <= end;
                    return false;
                };

                const filteredByPeriod = json.filter(overlaps);

                const total = filteredByPeriod.length;
                const completed = filteredByPeriod.filter(k => k.status === 'Completed').length;
                const onProgress = filteredByPeriod.filter(k => k.status === 'On Progress').length;
                const waiting = filteredByPeriod.filter(k => k.status === 'Waiting').length || Math.max(0, total - completed - onProgress);

                setStats([
                    { label: 'Total Kegiatan', value: total, color: 'bg-red-50', icon: 'fas fa-chart-line', iconColor: 'text-red-500' },
                    { label: 'Waiting', value: waiting, color: 'bg-yellow-50', icon: 'fas fa-stopwatch', iconColor: 'text-yellow-600' },
                    { label: 'On Progress', value: onProgress, color: 'bg-blue-50', icon: 'fas fa-history', iconColor: 'text-blue-700' },
                    { label: 'Completed', value: completed, color: 'bg-green-50', icon: 'fas fa-check-circle', iconColor: 'text-green-600' },
                ]);

                setDataPie([
                    { name: 'Waiting', value: waiting, color: '#EAB308' },
                    { name: 'On Progress', value: onProgress, color: '#3B82F6' },
                    { name: 'Completed', value: completed, color: '#16A34A' },
                ]);

                const weekStart = new Date();
                const day = weekStart.getDay();
                const diffToMonday = (day + 6) % 7;
                weekStart.setDate(weekStart.getDate() - diffToMonday);
                weekStart.setHours(0,0,0,0);

                const days = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    days.push(d);
                }

                const barData = days.map((d, idx) => {
                    const activitiesForDay = json.filter(k => {
                        const start = k.tanggal_mulai ? new Date(k.tanggal_mulai) : null;
                        const end = k.tanggal_selesai ? new Date(k.tanggal_selesai) : null;
                        if (!start && !end) return false;
                        const dayStart = new Date(d);
                        dayStart.setHours(0,0,0,0);
                        const dayEnd = new Date(d);
                        dayEnd.setHours(23,59,59,999);
                        const s = start ? new Date(start) : null;
                        const e = end ? new Date(end) : null;
                        if (s && e) return s <= dayEnd && e >= dayStart;
                        if (s && !e) return s <= dayEnd;
                        if (!s && e) return e >= dayStart;
                        return false;
                    }).map(k => ({
                        no_po: k.no_po,
                        vendor: k.vendor,
                        transporter: k.transporter,
                        tanggal_mulai: k.tanggal_mulai ? new Date(k.tanggal_mulai).toLocaleDateString('id-ID') : '-',
                        tanggal_selesai: k.tanggal_selesai ? new Date(k.tanggal_selesai).toLocaleDateString('id-ID') : '-',
                        total_truk: k.total_truk || 0
                    }));

                    const labels = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
                    return { day: labels[idx], value: activitiesForDay.length, activities: activitiesForDay };
                });

                setDataBar(barData);

                const now = new Date();
                const next7 = new Date();
                next7.setDate(now.getDate() + 7);
                const upcoming = json.filter(k => {
                    const s = k.tanggal_mulai ? new Date(k.tanggal_mulai) : null;
                    return s && s >= now && s <= next7;
                }).map(k => ({ 
                    no_po: k.no_po, 
                    vendor: k.vendor, 
                    transporter: k.transporter, 
                    tanggal_mulai: k.tanggal_mulai, 
                    tanggal_selesai: k.tanggal_selesai, 
                    total_truk: k.total_truk || 0 
                }));
                setUpcoming(upcoming);
            } catch (err) {
                console.error('Failed loading kegiatan for dashboard', err);
            }
        };

        load();
    }, [period]);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
                    {/* Period Filter */}
                    <div className="flex justify-end mb-6">
                        <select 
                            value={period} 
                            onChange={e => setPeriod(e.target.value)} 
                            className="bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option>Hari Ini</option>
                            <option>Minggu Ini</option>
                        </select>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border border-gray-100 hover:shadow-md transition-shadow">
                                <div className={`${stat.color} p-4 rounded-xl`}>
                                    <i className={`${stat.icon} text-2xl ${stat.iconColor}`}></i>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Pie Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-red-600 rounded-full mr-3"></span>
                                Distribusi Status Kegiatan
                            </h3>
                            <div style={{ height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={dataPie} 
                                            innerRadius={60} 
                                            outerRadius={100} 
                                            paddingAngle={5} 
                                            dataKey="value" 
                                            stroke="none"
                                        >
                                            {dataPie.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-red-600 rounded-full mr-3"></span>
                                Total Kegiatan Minggu Ini
                            </h3>
                            <div style={{ height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataBar}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="day" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 12, fill: '#6b7280'}} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 12, fill: '#6b7280'}} 
                                        />
                                        <Tooltip 
                                            content={<CustomBarTooltip/>} 
                                            cursor={{fill: '#f9fafb'}} 
                                            wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                                        />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                            {dataBar.map((entry, i) => {
                                                const today = new Date();
                                                const todayLabel = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][today.getDay()];
                                                const isToday = entry.day === todayLabel;
                                                return <Cell key={`cell-${i}`} fill={isToday ? '#991b1b' : '#DC2626'} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Activities */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <span className="w-1 h-6 bg-red-600 rounded-full mr-3"></span>
                            Kegiatan Mendatang (7 Hari Ke Depan)
                        </h3>
                        {upcoming.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8">
                                Tidak ada kegiatan yang akan dimulai dalam 7 hari ke depan.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcoming.map((u, i) => (
                                    <div key={i} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gray-50">
                                        <div className="font-bold text-gray-800 mb-2">PO {u.no_po}</div>
                                        <div className="text-sm text-gray-600 mb-1">{u.vendor}</div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            Transporter: {u.transporter}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            {new Date(u.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(u.tanggal_selesai).toLocaleDateString('id-ID')}
                                        </div>
                                        <div className="text-sm font-semibold text-red-600">
                                            Total Truk: {u.total_truk}
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

export default Dashboard;