import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, 
    ComposedChart, Line
} from 'recharts';

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // Data State
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

    // --- NEW ANALYTICS STATES ---
    const [dataHourly, setDataHourly] = useState([]);
    const [dataVendor, setDataVendor] = useState([]);
    const [dataShift, setDataShift] = useState([]);
    const [dataProgress, setDataProgress] = useState([]);

    const [upcoming, setUpcoming] = useState([]);
    const [period, setPeriod] = useState('Hari Ini');

    // --- 1. SECURITY CHECK ---
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                const userRole = String(userData.role || '').toLowerCase().trim();
                if (userRole !== 'admin') {
                    navigate('/keberangkatan-truk', { replace: true });
                }
            } catch (error) {
                navigate('/login', { replace: true });
            }
        } else {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // --- 2. DATA FETCHING & ADVANCED ANALYSIS ---
    useEffect(() => {
        const load = async () => {
            try {
                // Fetch Data Utama
                const [resK, resB] = await Promise.all([
                    fetch('http://localhost:3000/api/kegiatan'),
                    fetch('http://localhost:3000/api/keberangkatan')
                ]);
                
                const jsonKegiatan = await resK.json();
                const jsonKeberangkatan = await resB.json();
                
                setKegiatanList(jsonKegiatan);

                // --- LOGIKA ANALISIS 1: TREN PER JAM (OPERASIONAL) ---
                const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
                jsonKeberangkatan.forEach(k => {
                    const h = new Date(k.created_at).getHours();
                    hourlyMap[h].count++;
                });
                setDataHourly(hourlyMap.filter((_, i) => i >= 7 && i <= 21)); // Tampilkan jam sibuk 07-21

                // --- LOGIKA ANALISIS 2: PERFORMA VENDOR (LOGISTIK) ---
                const vendorMap = {};
                jsonKegiatan.forEach(k => {
                    vendorMap[k.transporter] = (vendorMap[k.transporter] || 0) + 1;
                });
                setDataVendor(Object.keys(vendorMap).map(name => ({ name, value: vendorMap[name] }))
                    .sort((a,b) => b.value - a.value).slice(0, 5));

                // --- LOGIKA ANALISIS 3: DISTRIBUSI SHIFT ---
                const shiftMap = { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 };
                jsonKeberangkatan.forEach(k => {
                    if(k.nama_shift) shiftMap[k.nama_shift]++;
                });
                setDataShift([
                    { name: 'Shift 1', value: shiftMap['Shift 1'], color: '#ef4444' },
                    { name: 'Shift 2', value: shiftMap['Shift 2'], color: '#f59e0b' },
                    { name: 'Shift 3', value: shiftMap['Shift 3'], color: '#1e40af' },
                ]);

                // --- LOGIKA ANALISIS 4: REALISASI TARGET (TONASE) ---
                const progressData = jsonKegiatan.filter(k => k.status === 'On Progress').slice(0, 4).map(k => {
                    const totalTruk = jsonKeberangkatan.filter(b => b.kegiatan_id === k.id && b.status === 'Valid').length;
                    const realisasi = totalTruk * 25; // Asumsi rata-rata muatan truk 25 ton
                    return {
                        no_po: `PO ${k.no_po.slice(-4)}`,
                        target: parseFloat(k.quantity),
                        realisasi: realisasi
                    };
                });
                setDataProgress(progressData);

                // --- LOGIKA LAMA (PERIOD FILTERING) ---
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
                    start = monday;
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    sunday.setHours(23,59,59,999);
                    end = sunday;
                }

                const filtered = jsonKegiatan.filter(k => {
                    const s = k.tanggal_mulai ? new Date(k.tanggal_mulai) : null;
                    const e = k.tanggal_selesai ? new Date(k.tanggal_selesai) : null;
                    return (s && e) ? (s <= end && e >= start) : false;
                });

                const total = filtered.length;
                const completed = filtered.filter(k => k.status === 'Completed').length;
                const onProgress = filtered.filter(k => k.status === 'On Progress').length;
                const waiting = Math.max(0, total - completed - onProgress);

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

                // Weekly Bar Logic
                const labels = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
                setDataBar(labels.map((day, idx) => {
                    const d = new Date(start);
                    d.setDate(start.getDate() + idx);
                    return { day, value: jsonKegiatan.filter(k => new Date(k.tanggal_mulai).toDateString() === d.toDateString()).length };
                }));

                // Upcoming logic
                const next7 = new Date();
                next7.setDate(today.getDate() + 7);
                setUpcoming(jsonKegiatan.filter(k => {
                    const s = new Date(k.tanggal_mulai);
                    return s >= today && s <= next7;
                }));

            } catch (err) {
                console.error('Dashboard Error:', err);
            }
        };
        load();
    }, [period]);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Monitoring Dashboard</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">PT Semen Padang - Logistik Transportasi</p>
                        </div>
                        <select 
                            value={period} 
                            onChange={e => setPeriod(e.target.value)} 
                            className="bg-white border-2 border-gray-100 rounded-2xl px-6 py-3 shadow-sm text-sm font-black uppercase outline-none focus:border-red-600 transition-all"
                        >
                            <option>Hari Ini</option>
                            <option>Minggu Ini</option>
                        </select>
                    </div>

                    {/* SECTION 1: KARTU STATISTIK UTAMA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center space-x-5 hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className={`${stat.color} p-5 rounded-2xl`}>
                                    <i className={`${stat.icon} text-2xl ${stat.iconColor}`}></i>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className="text-3xl font-black text-gray-800">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SECTION 2: ANALISIS OPERASIONAL (PEAK HOURS & SHIFT) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 mb-6 uppercase tracking-widest flex items-center">
                                <i className="fas fa-clock text-red-600 mr-3"></i> Analisis Waktu Keberangkatan (Peak Hours)
                            </h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dataHourly}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="count" name="Jumlah Truk" stroke="#ef4444" strokeWidth={4} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 mb-6 uppercase tracking-widest">Produktivitas Shift</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={dataShift} innerRadius={70} outerRadius={90} dataKey="value" stroke="none" paddingAngle={8}>
                                            {dataShift.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: REALISASI TARGET & VENDOR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                        {/* Realisasi Target Tonase */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 mb-6 uppercase tracking-widest flex items-center">
                                <i className="fas fa-weight-hanging text-blue-600 mr-3"></i> Progres Target Tonase (PO Berjalan)
                            </h3>
                            <div style={{ height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dataProgress} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" fontSize={10} fontWeight="bold" hide />
                                        <YAxis dataKey="no_po" type="category" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="target" name="Target (Ton)" fill="#e2e8f0" radius={[0, 10, 10, 0]} barSize={15} />
                                        <Bar dataKey="realisasi" name="Realisasi (Ton)" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={15} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-4 italic font-bold uppercase">*Estimasi realisasi dihitung dari Jumlah Truk x 25 Ton</p>
                        </div>

                        {/* Top Transporter */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 mb-6 uppercase tracking-widest">5 Transporter Teraktif</h3>
                            <div style={{ height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataVendor} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" fontSize={9} fontWeight="black" width={100} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="value" name="Total Kegiatan" fill="#1e40af" radius={[0, 20, 20, 0]} barSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: UPCOMING & WEEKLY STATUS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 mb-6 uppercase tracking-widest">Kegiatan Mingguan</h3>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataBar}>
                                        <XAxis dataKey="day" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="value" fill="#ef4444" radius={[10, 10, 10, 10]} barSize={15} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-red-600 mb-6 uppercase tracking-widest flex items-center">
                                <span className="w-2 h-6 bg-red-600 rounded-full mr-3"></span> Jadwal 7 Hari Mendatang
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcoming.length === 0 ? (
                                    <div className="col-span-2 text-center py-10 text-gray-300 font-bold uppercase text-xs">Tidak ada jadwal</div>
                                ) : (
                                    upcoming.slice(0, 4).map((u, i) => (
                                        <div key={i} className="p-5 border-2 border-red-50 rounded-[1.5rem] hover:bg-red-50 transition-all group">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-red-600 font-black text-sm uppercase">PO {u.no_po}</span>
                                                <i className="fas fa-arrow-right text-red-200 group-hover:text-red-500 transition-colors"></i>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-800 uppercase truncate">{u.vendor}</p>
                                            <div className="mt-3 flex items-center text-[9px] font-black text-gray-400 uppercase">
                                                <i className="far fa-calendar-alt mr-2 text-red-400"></i>
                                                {new Date(u.tanggal_mulai).toLocaleDateString('id-ID')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;