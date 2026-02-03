import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { Package, Users, Clock, Activity, CheckCircle, Truck, Calendar } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth().toString());
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    
    const [kpiStats, setKpiStats] = useState([
        { label: 'Total Kegiatan', value: 0, color: 'bg-red-50', iconColor: 'text-red-600', icon: Package },
        { label: 'Total Transportir', value: 0, color: 'bg-purple-50', iconColor: 'text-purple-600', icon: Truck },
        { label: 'Total Personil', value: 0, color: 'bg-indigo-50', iconColor: 'text-indigo-600', icon: Users },
        { label: 'Waiting', value: 0, color: 'bg-yellow-50', iconColor: 'text-yellow-600', icon: Clock },
        { label: 'On Progress', value: 0, color: 'bg-blue-50', iconColor: 'text-blue-600', icon: Activity },
        { label: 'Completed', value: 0, color: 'bg-green-50', iconColor: 'text-green-600', icon: CheckCircle },
    ]);

    const [dataPie, setDataPie] = useState([]);
    const [dataHourly, setDataHourly] = useState([]);
    const [dataShift, setDataShift] = useState([]);
    const [dataWeekly, setDataWeekly] = useState([]);
    const [upcoming, setUpcoming] = useState([]);

    const [rawKegiatan, setRawKegiatan] = useState([]);
    const [rawKeberangkatan, setRawKeberangkatan] = useState([]);

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

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

    const filterData = (data, dateField = 'tanggal_mulai') => {
        if (!data || data.length === 0) return [];
        
        return data.filter(item => {
            const itemDate = new Date(item[dateField] || item.created_at);
            
            if (isNaN(itemDate.getTime())) return false;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedYear && itemDate.getFullYear() !== parseInt(selectedYear)) {
                return false;
            }
            
            if (selectedMonth !== '' && itemDate.getMonth() !== parseInt(selectedMonth)) {
                return false;
            }
            
            if (selectedPeriod === 'today') {
                const itemDateOnly = new Date(itemDate);
                itemDateOnly.setHours(0, 0, 0, 0);
                return itemDateOnly.getTime() === today.getTime();
            } else if (selectedPeriod === 'week') {
                const startOfWeek = new Date(today);
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                startOfWeek.setDate(diff);
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                return itemDate >= startOfWeek && itemDate <= endOfWeek;
            } else if (selectedPeriod === 'month') {
                return itemDate.getMonth() === today.getMonth() && 
                       itemDate.getFullYear() === today.getFullYear();
            }
            
            return true;
        });
    };

    const extractAvailableDates = (kegiatan, keberangkatan) => {
        const years = new Set();
        const months = new Set();
        
        [...kegiatan, ...keberangkatan].forEach(item => {
            const date = new Date(item.tanggal_mulai || item.created_at);
            if (!isNaN(date.getTime())) {
                years.add(date.getFullYear());
                months.add(date.getMonth());
            }
        });
        
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        const sortedMonths = Array.from(months).sort((a, b) => a - b);
        
        setAvailableYears(sortedYears);
        setAvailableMonths(sortedMonths);
    };

    // ✅ FUNGSI FETCH KEBERANGKATAN DENGAN MULTIPLE FALLBACK
    const fetchKeberangkatanData = async () => {
        const endpoints = [
            'http://localhost:3000/api/keberangkatan-truk?all=true',
            'http://localhost:3000/api/keberangkatan?all=true',
            'http://localhost:3000/api/truk?all=true',
            'http://localhost:3000/api/keberangkatan-truk',
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const json = await response.json();
                    console.log(`✅ Success with endpoint: ${endpoint}`, json);
                    
                    // Handle different response structures
                    let data = [];
                    if (json.status === 'Success' && json.data && Array.isArray(json.data)) {
                        data = json.data;
                    } else if (Array.isArray(json)) {
                        data = json;
                    } else if (json.data && Array.isArray(json.data)) {
                        data = json.data;
                    }
                    
                    return { success: true, data, endpoint };
                }
            } catch (err) {
                console.log(`❌ Failed with endpoint: ${endpoint}`, err.message);
                continue;
            }
        }
        
        return { success: false, data: [], endpoint: null };
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Fetch kegiatan
                const resKegiatan = await fetch('http://localhost:3000/api/kegiatan');
                if (!resKegiatan.ok) throw new Error('Gagal mengambil data kegiatan');
                const jsonKegiatan = await resKegiatan.json();
                
                // Fetch keberangkatan dengan multiple fallback
                const keberangkatanResult = await fetchKeberangkatanData();
                if (!keberangkatanResult.success) {
                    throw new Error('Gagal mengambil data keberangkatan dari semua endpoint');
                }
                
                console.log(`📊 Using endpoint: ${keberangkatanResult.endpoint}`);
                
                // Fetch users dan transporter
                const [resUsers, resTransporter] = await Promise.all([
                    fetch('http://localhost:3000/api/users'),
                    fetch('http://localhost:3000/api/kegiatan/transporters')
                ]);
                
                if (!resUsers.ok) throw new Error('Gagal mengambil data users');
                if (!resTransporter.ok) throw new Error('Gagal mengambil data transporter');
                
                const jsonUsers = await resUsers.json();
                const jsonTransporter = await resTransporter.json();

                let kegiatanData = [];
                let keberangkatanData = keberangkatanResult.data;
                
                if (Array.isArray(jsonKegiatan)) {
                    kegiatanData = jsonKegiatan;
                } else if (jsonKegiatan.data && Array.isArray(jsonKegiatan.data)) {
                    kegiatanData = jsonKegiatan.data;
                }

                console.log('📊 Final Data:', {
                    kegiatan: kegiatanData.length,
                    keberangkatan: keberangkatanData.length,
                    sampleKeberangkatan: keberangkatanData[0]
                });

                setRawKegiatan(kegiatanData);
                setRawKeberangkatan(keberangkatanData);
                extractAvailableDates(kegiatanData, keberangkatanData);

            } catch (err) {
                console.error('❌ FETCH ERROR:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
        const interval = setInterval(loadInitialData, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (loading) return;

        const processData = async () => {
            try {
                const [resUsers, resTransporter] = await Promise.all([
                    fetch('http://localhost:3000/api/users'),
                    fetch('http://localhost:3000/api/kegiatan/transporters')
                ]);
                
                const jsonUsers = await resUsers.json();
                const jsonTransporter = await resTransporter.json();

                const filteredKegiatan = filterData(rawKegiatan, 'tanggal_mulai');
                const filteredKeberangkatan = filterData(rawKeberangkatan, 'created_at');

                const totalKegiatan = filteredKegiatan.length;
                const totalTransportir = jsonTransporter.length;
                const totalPersonil = Array.isArray(jsonUsers) ? jsonUsers.filter(u => u.role === 'personil').length : 0;

                let waitingCount = 0;
                let progressCount = 0;
                let completedCount = 0;

                filteredKegiatan.forEach(kegiatan => {
                    if (kegiatan.transporters && Array.isArray(kegiatan.transporters)) {
                        kegiatan.transporters.forEach(t => {
                            if (t.status === 'Waiting') waitingCount++;
                            else if (t.status === 'On Progress') progressCount++;
                            else if (t.status === 'Completed') completedCount++;
                        });
                    }
                });

                setKpiStats([
                    { label: 'Total Kegiatan', value: totalKegiatan, color: 'bg-red-50', iconColor: 'text-red-600', icon: Package },
                    { label: 'Total Transportir', value: totalTransportir, color: 'bg-purple-50', iconColor: 'text-purple-600', icon: Truck },
                    { label: 'Total Personil', value: totalPersonil, color: 'bg-indigo-50', iconColor: 'text-indigo-600', icon: Users },
                    { label: 'Waiting', value: waitingCount, color: 'bg-yellow-50', iconColor: 'text-yellow-600', icon: Clock },
                    { label: 'On Progress', value: progressCount, color: 'bg-blue-50', iconColor: 'text-blue-600', icon: Activity },
                    { label: 'Completed', value: completedCount, color: 'bg-green-50', iconColor: 'text-green-600', icon: CheckCircle },
                ]);

                setDataPie([
                    { name: 'Waiting', value: waitingCount, color: '#EAB308' },
                    { name: 'On Progress', value: progressCount, color: '#3B82F6' },
                    { name: 'Completed', value: completedCount, color: '#16A34A' },
                ]);

                // Hourly data
                const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ 
                    hour: `${String(i).padStart(2, '0')}:00`, 
                    count: 0
                }));
                
                filteredKeberangkatan.forEach(k => {
                    if (k.created_at) {
                        const date = new Date(k.created_at);
                        if (!isNaN(date.getTime())) {
                            const h = date.getHours();
                            hourlyMap[h].count++;
                        }
                    }
                });
                
                setDataHourly(hourlyMap);

                // Shift data
                const shiftMap = { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 };
                filteredKeberangkatan.forEach(k => {
                    if (k.nama_shift && shiftMap.hasOwnProperty(k.nama_shift)) {
                        shiftMap[k.nama_shift]++;
                    }
                });
                
                setDataShift([
                    { name: 'Shift 1', value: shiftMap['Shift 1'], color: '#ef4444' },
                    { name: 'Shift 2', value: shiftMap['Shift 2'], color: '#f59e0b' },
                    { name: 'Shift 3', value: shiftMap['Shift 3'], color: '#1e40af' },
                ]);

                // Weekly data
                const todayDate = new Date();
                const weeklyData = [];
                const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

                const d = todayDate.getDay();
                const diffToMonday = todayDate.getDate() - d + (d === 0 ? -6 : 1);
                const startOfWeek = new Date(todayDate);
                startOfWeek.setDate(diffToMonday);
                startOfWeek.setHours(0, 0, 0, 0);

                for (let i = 0; i < 7; i++) {
                    const currentDay = new Date(startOfWeek);
                    currentDay.setDate(startOfWeek.getDate() + i);
                    currentDay.setHours(0, 0, 0, 0);
                    
                    const currentDayEnd = new Date(currentDay);
                    currentDayEnd.setHours(23, 59, 59, 999);
                    
                    const realToday = new Date();
                    realToday.setHours(0, 0, 0, 0);

                    const kegiatanHariIni = rawKegiatan.filter(k => {
                        const startDate = new Date(k.tanggal_mulai);
                        const endDate = k.tanggal_selesai ? new Date(k.tanggal_selesai) : startDate;
                        
                        const isChartDayToday = currentDay.getTime() === realToday.getTime();

                        if (selectedPeriod === 'today' && !isChartDayToday) {
                            return false; 
                        }

                        return startDate <= currentDayEnd && endDate >= currentDay;
                    });

                    const kegiatanDetails = kegiatanHariIni.map(k => {
                        const transporterInfo = {};
                        let totalTrukMasuk = 0;
                        
                        if (k.transporters && Array.isArray(k.transporters)) {
                            k.transporters.forEach(t => {
                                const namaTransporter = t.nama_transporter || t.nama || 'Unknown';
                                
                                if (!transporterInfo[namaTransporter]) {
                                    transporterInfo[namaTransporter] = { masuk: 0 };
                                }
                                
                                // ✅ Cek multiple field possibilities
                                const trukMasuk = rawKeberangkatan.filter(kb => {
                                    const kbPO = (kb.no_po || '').toString().trim();
                                    const kbTransporter = (
                                        kb.nama_vendor ||  // Dari backend controller
                                        kb.nama_transporter || 
                                        kb.transporter ||
                                        ''
                                    ).trim().toLowerCase();
                                    
                                    const targetPO = k.no_po.toString().trim();
                                    const targetTransporter = namaTransporter.trim().toLowerCase();
                                    
                                    const matchPO = kbPO === targetPO;
                                    const matchTransporter = kbTransporter === targetTransporter;
                                    
                                    return matchPO && matchTransporter;
                                }).length;
                                
                                transporterInfo[namaTransporter].masuk += trukMasuk;
                                totalTrukMasuk += trukMasuk;
                            });
                        }
                        
                        return {
                            no_po: k.no_po,
                            vendor: k.vendor,
                            tanggal_mulai: new Date(k.tanggal_mulai).toLocaleDateString('id-ID'),
                            tanggal_selesai: k.tanggal_selesai ? new Date(k.tanggal_selesai).toLocaleDateString('id-ID') : '-',
                            total_transportir: Object.keys(transporterInfo).length,
                            transporterInfo: transporterInfo,
                            total_truk_masuk: totalTrukMasuk
                        };
                    });

                    weeklyData.push({
                        day: dayLabels[currentDay.getDay()],
                        kegiatan: kegiatanHariIni.length,
                        transportir: kegiatanHariIni.reduce((total, k) => {
                            return total + (k.transporters ? k.transporters.length : 0);
                        }, 0),
                        activities: kegiatanDetails
                    });
                }
                setDataWeekly(weeklyData);

                // Kegiatan Mendatang
                const upcomingKegiatan = rawKegiatan
                    .filter(k => {
                        const startDate = new Date(k.tanggal_mulai);
                        return !isNaN(startDate.getTime()) && startDate >= todayDate;
                    })
                    .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
                    .slice(0, 10);

                const upcomingWithTransporters = upcomingKegiatan.map(k => {
                    let transporterNames = '-';
                    
                    if (k.transporters && Array.isArray(k.transporters) && k.transporters.length > 0) {
                        transporterNames = k.transporters
                            .map(t => t.nama_transporter || t.nama)
                            .filter(Boolean)
                            .join(', ');
                    }
                    
                    return {
                        tanggal: k.tanggal_mulai,
                        no_po: k.no_po,
                        vendor: k.vendor,
                        nama_kapal: k.nama_kapal || '-',
                        material: k.material || '-',
                        incoterm: k.incoterm || '-',
                        no_bl: k.no_bl || '-',
                        qty: parseFloat(k.quantity) || 0,
                        transporter: transporterNames || '-'
                    };
                });
                
                setUpcoming(upcomingWithTransporters);

            } catch (err) {
                console.error('❌ PROCESS ERROR:', err);
            }
        };

        processData();
    }, [selectedYear, selectedMonth, selectedPeriod, rawKegiatan, rawKeberangkatan, loading]);

    // Custom Tooltip untuk grafik mingguan
    const CustomWeeklyTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        
        const data = payload[0].payload;
        
        if (!data.activities || data.activities.length === 0) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-gray-200 max-w-md">
                    <div className="font-bold text-gray-900 mb-2 text-base">
                        {data.day}
                    </div>
                    <p className="text-sm text-gray-500">Tidak ada kegiatan</p>
                </div>
            );
        }

        return (
            <div 
                className="bg-white rounded-xl shadow-xl border-2 border-gray-200 max-w-2xl"
                style={{ 
                    maxHeight: '450px',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div className="p-4 border-b-2 bg-white sticky top-0 z-10">
                    <div className="font-bold text-gray-900 text-base mb-1">
                        {data.day}
                    </div>
                    <div className="text-sm text-gray-600">
                        {data.kegiatan} Kegiatan • {data.transportir} Transportir
                    </div>
                </div>
                
                <div 
                    className="overflow-y-auto p-4 pt-2"
                    style={{ 
                        maxHeight: '390px',
                        overflowY: 'scroll',
                        WebkitOverflowScrolling: 'touch'
                    }}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <div className="space-y-4">
                        {data.activities.map((activity, idx) => (
                            <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-900 mb-1">
                                            PO {activity.no_po}
                                        </div>
                                        <div className="text-sm text-gray-700 mb-2">
                                            {activity.vendor}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            {activity.tanggal_mulai} — {activity.tanggal_selesai}
                                        </div>
                                    </div>
                                    <div className="ml-3 text-right">
                                        <div className="text-xs text-gray-500 mb-1">Total Truk</div>
                                        <div className="text-2xl font-black text-red-600">
                                            {activity.total_truk_masuk}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 mb-2 uppercase">
                                        Detail Transportir ({activity.total_transportir})
                                    </div>
                                    <div className="space-y-2">
                                        {Object.entries(activity.transporterInfo).map(([nama, info], tIdx) => (
                                            <div key={tIdx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                    <span className="text-xs font-semibold text-gray-800">
                                                        {nama}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">Truk Masuk</div>
                                                        <div className="text-sm font-bold text-green-600">
                                                            {info.masuk} 
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-800">{payload[0].name}</p>
                    <p className="text-sm font-black text-red-600">{payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-4 mx-auto"></div>
                    <p className="text-gray-600 font-bold">Memuat Dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <p className="text-gray-800 font-bold text-xl mb-2">Terjadi Kesalahan</p>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-500 mb-4">
                        Cek console browser (F12) untuk detail error
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        Muat Ulang
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Calendar className="w-6 h-6 text-red-600" />
                            <h3 className="text-lg font-black text-gray-900">Filter Data</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tahun</label>
                                <select 
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-semibold"
                                >
                                    <option value="">Semua Tahun</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bulan</label>
                                <select 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-semibold"
                                >
                                    <option value="">Semua Bulan</option>
                                    {availableMonths.map(month => (
                                        <option key={month} value={month}>{monthNames[month]}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Periode</label>
                                <select 
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-semibold"
                                >
                                    <option value="">Semua Data</option>
                                    <option value="today">Hari Ini</option>
                                    <option value="week">Minggu Ini</option>
                                    <option value="month">Bulan Ini</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {rawKegiatan.length === 0 && rawKeberangkatan.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-center">
                            <p className="text-yellow-800 font-semibold">
                                ℹ️ Belum ada data kegiatan atau keberangkatan di sistem
                            </p>
                        </div>
                    )}

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                        {kpiStats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <div key={index} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-7 h-7 ${stat.iconColor}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                {stat.label}
                                            </p>
                                            <p className="text-3xl font-black text-gray-900">
                                                {stat.value}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* KEGIATAN MINGGU INI */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                                <h3 className="text-lg font-black text-gray-900">Kegiatan Minggu Ini</h3>
                            </div>
                            <div style={{ height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dataWeekly}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" fontSize={11} fontWeight="600" stroke="#94a3b8" />
                                        <YAxis fontSize={11} fontWeight="600" stroke="#94a3b8" />
                                        <Tooltip 
                                            content={<CustomWeeklyTooltip />} 
                                            cursor={{ fill: '#fef2f2' }}
                                            wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                                        />
                                        <Bar 
                                            dataKey="kegiatan"
                                            fill="#ef4444"
                                            radius={[10, 10, 0, 0]}
                                            barSize={30}
                                            name="Total Kegiatan"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                                <h3 className="text-lg font-black text-gray-900">Status Transportir</h3>
                            </div>
                            <div style={{ height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={dataPie} 
                                            innerRadius={60} 
                                            outerRadius={90} 
                                            dataKey="value" 
                                            stroke="none" 
                                            paddingAngle={5}
                                        >
                                            {dataPie.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }} />
                                        <Legend 
                                            iconType="circle" 
                                            layout="horizontal" 
                                            verticalAlign="bottom"
                                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* DISTRIBUSI JAM KEBERANGKATAN TRUK */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                                <h3 className="text-lg font-black text-gray-900">Distribusi Jam Keberangkatan Truk</h3>
                            </div>
                            <div className="text-xs text-gray-500 font-semibold">
                                Total: {dataHourly.reduce((sum, h) => sum + h.count, 0)} truk
                            </div>
                        </div>
                        <div style={{ height: '280px' }}>
                            {dataHourly.reduce((sum, h) => sum + h.count, 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dataHourly}>
                                        <defs>
                                            <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="hour" 
                                            fontSize={10} 
                                            fontWeight="600" 
                                            stroke="#94a3b8"
                                            interval={2}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis fontSize={11} fontWeight="600" stroke="#94a3b8" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="count" 
                                            name="Jumlah Truk" 
                                            stroke="#ef4444" 
                                            strokeWidth={3} 
                                            fill="url(#colorGrad)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-gray-400">
                                        <p className="text-4xl mb-2">📊</p>
                                        <p className="font-bold">Belum ada data keberangkatan</p>
                                        <p className="text-sm">Data akan muncul setelah ada truk yang berangkat</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRODUKTIVITAS SHIFT */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                            <h3 className="text-lg font-black text-gray-900">Produktivitas Shift</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {dataShift.map((shift, idx) => (
                                <div key={idx} className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-bold text-gray-700">{shift.name}</span>
                                        <span className="text-2xl font-black" style={{ color: shift.color }}>
                                            {shift.value}
                                        </span>
                                    </div>
                                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="absolute h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${(shift.value / Math.max(...dataShift.map(s => s.value), 1)) * 100}%`, 
                                                backgroundColor: shift.color 
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 font-semibold">Truk Berangkat</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* KEGIATAN MENDATANG */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                            <h3 className="text-lg font-black text-gray-900">Kegiatan Mendatang</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcoming.length > 0 ? upcoming.map((activity, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-5 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex-shrink-0 w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <div className="text-xl font-black leading-none">
                                                    {new Date(activity.tanggal).getDate()}
                                                </div>
                                                <div className="text-[10px] font-bold uppercase leading-none mt-1">
                                                    {new Date(activity.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-gray-900 mb-1 truncate">{activity.no_po}</p>
                                            <p className="text-xs text-gray-500 font-semibold">
                                                {new Date(activity.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Vendor:</span>
                                            <span className="text-xs text-gray-900 font-semibold flex-1">{activity.vendor}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Kapal:</span>
                                            <span className="text-xs text-gray-900 font-semibold flex-1">{activity.nama_kapal}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Material:</span>
                                            <span className="text-xs text-gray-900 font-semibold flex-1">{activity.material}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Transporter:</span>
                                            <span className="text-xs text-gray-900 font-semibold flex-1">{activity.transporter}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-16 text-gray-400">
                                    <p className="text-5xl mb-4">📅</p>
                                    <p className="font-bold text-lg">Tidak ada kegiatan mendatang</p>
                                    <p className="text-sm">Belum ada kegiatan yang dijadwalkan</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;