import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const getPhotoUrl = (photoData) => {
    if (!photoData) return null;
    if (photoData.startsWith('data:image')) return photoData; 
    return `http://localhost:3000${photoData}`; 
};

// UPDATE: Format jam ada detiknya
const formatJam = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('id-ID', {
        hour: '2-digit', 
        minute:'2-digit', 
        second: '2-digit'
    }) + ' WIB';
};

const getLocalTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const PembersihanMaterial = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [dataList, setDataList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getLocalTodayDate());
    
    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showModalConfirmLogout, setShowModalConfirmLogout] = useState(false);
    const [showModalWarning, setShowModalWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [showModalSuccess, setShowModalSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [step, setStep] = useState(1); 
    const [loading, setLoading] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false); 
    const [previewImage, setPreviewImage] = useState(null);

    const [masterData, setMasterData] = useState([]); 
    const [uniquePOs, setUniquePOs] = useState([]); 
    const [filteredTransporters, setFilteredTransporters] = useState([]); 
    const [lockedPhotos, setLockedPhotos] = useState({ before: false, during: false, after: false });

    const [formData, setFormData] = useState({
        id: null, 
        kegiatan_transporter_id: '', 
        po_number: '',      
        transporter_name: '', 
        plat_nomor_list: [''], 
        foto_sebelum_list: [], foto_sedang_list: [], foto_setelah_list: [],
        lokasi_sebelum: '', lokasi_sedang: '', lokasi_setelah: '' 
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role !== 'patroler') { 
                setWarningMessage("Akses Ditolak! Halaman ini khusus Patroler.");
                setShowModalWarning(true);
                navigate('/login'); 
                return; 
            }
            setUser(parsedUser);
        } else { navigate('/login'); }
        fetchMasterData();
    }, [navigate]);

    useEffect(() => { if (user) fetchData(); }, [user, selectedDate]);

    const fetchMasterData = async () => { 
        try { 
            const res = await axios.get('http://localhost:3000/api/water-truck/active-po'); 
            setMasterData(res.data);
            const unique = [...new Set(res.data.map(item => item.no_po))];
            setUniquePOs(unique);
        } catch (err) { console.error("Gagal load PO", err); } 
    };

    const fetchData = async () => {
        if (!user) return;
        try {
            const res = await axios.get('http://localhost:3000/api/water-truck', { 
                params: { email_patroler: user.email, tanggal: selectedDate } 
            });
            setDataList(res.data.data);
        } catch (err) { console.error("Gagal load data", err); }
    };

    const handleLogout = () => { setShowModalConfirmLogout(true); };
    const confirmLogout = () => { localStorage.removeItem('user'); setShowModalConfirmLogout(false); navigate('/login'); };

    const resetForm = () => {
        setFormData({ 
            id: null, kegiatan_transporter_id: '', po_number: '', transporter_name: '',
            plat_nomor_list: [''], 
            foto_sebelum_list: [], foto_sedang_list: [], foto_setelah_list: [],
            lokasi_sebelum: '', lokasi_sedang: '', lokasi_setelah: ''
        });
        setFilteredTransporters([]);
        setLockedPhotos({ before: false, during: false, after: false }); 
        setIsViewMode(false); setStep(1);
    };

    const handleLihatDetail = (item) => {
        setIsViewMode(true); 
        populateData(item);
        setStep(1); 
        setShowModal(true);
    };

    const handleUploadBukti = (item) => {
        if (selectedDate !== getLocalTodayDate()) { 
            setWarningMessage("Data tanggal lain tidak dapat diedit."); 
            setShowModalWarning(true);
            return; 
        }
        setIsViewMode(false); 
        populateData(item);
        setStep(2); 
        setShowModal(true);
    };

    const handleInputBaru = () => {
        if (selectedDate !== getLocalTodayDate()) { 
            setWarningMessage("Input data hanya diperbolehkan untuk hari ini.");
            setShowModalWarning(true);
            return; 
        }
        resetForm();
        setShowModal(true);
    };

    const populateData = (item) => {
        const splitPhotos = (str) => str ? str.split(',') : [];
        let platList = item.plat_nomor_truk_air ? item.plat_nomor_truk_air.split(',').map(s => s.trim()) : [''];

        setFormData({
            id: item.id,
            kegiatan_transporter_id: item.kegiatan_transporter_id,
            po_number: item.no_po,
            transporter_name: item.nama_vendor,
            plat_nomor_list: platList,
            foto_sebelum_list: splitPhotos(item.foto_sebelum),
            foto_sedang_list: splitPhotos(item.foto_sedang),
            foto_setelah_list: splitPhotos(item.foto_setelah),
            lokasi_sebelum: item.lokasi_foto_sebelum || '',
            lokasi_sedang: item.lokasi_foto_sedang || '',
            lokasi_setelah: item.lokasi_foto_setelah || ''
        });

        const transForPO = masterData.filter(d => d.no_po === item.no_po);
        setFilteredTransporters(transForPO);

        setLockedPhotos({
            before: item.foto_sebelum?.length > 0,
            during: item.foto_sedang?.length > 0,
            after: item.foto_setelah?.length > 0
        });
    };

    const handlePOInput = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, po_number: val, transporter_name: '', kegiatan_transporter_id: '' }));
        const related = masterData.filter(item => item.no_po === val);
        setFilteredTransporters(related);
    };

    const handleTransporterInput = (e) => {
        const val = e.target.value; 
        const matchedData = filteredTransporters.find(item => item.nama_transporter === val);
        setFormData(prev => ({ ...prev, transporter_name: val, kegiatan_transporter_id: matchedData ? matchedData.id : '' }));
    };

    const handlePlatChange = (i, v) => { const n = [...formData.plat_nomor_list]; n[i] = v.toUpperCase(); setFormData({ ...formData, plat_nomor_list: n }); };
    const addPlatField = () => setFormData({ ...formData, plat_nomor_list: [...formData.plat_nomor_list, ''] });
    const removePlatField = (i) => { const n = [...formData.plat_nomor_list]; n.splice(i, 1); setFormData({ ...formData, plat_nomor_list: n }); };
    
    // --- SIMPAN FOTO + TEKS LOKASI ---
    const addPhoto = (field, base64, locationText) => { 
        let locField = '';
        if (field === 'foto_sebelum_list') locField = 'lokasi_sebelum';
        if (field === 'foto_sedang_list') locField = 'lokasi_sedang';
        if (field === 'foto_setelah_list') locField = 'lokasi_setelah';

        setFormData(prev => ({ 
            ...prev, 
            [field]: [...prev[field], base64],
            [locField]: locationText 
        })); 
    };
    
    const removePhoto = (field, index) => { setFormData(prev => { const newList = [...prev[field]]; newList.splice(index, 1); return { ...prev, [field]: newList }; }); };

    // --- KAMERA CEPAT (Non-Blocking Location + Detail Watermark) ---
    const handleCamera = async (fieldListName) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black z-[100] flex flex-col';
            modal.innerHTML = `
                <div class="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                    <video autoplay playsinline class="w-full h-full object-cover"></video>
                    
                    <div id="loc-status" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-mono flex items-center gap-2 max-w-[90%] truncate">
                        <span class="animate-pulse">🛰️</span> <span id="loc-text">Mencari GPS...</span>
                    </div>
                </div>
                <div class="bg-black p-6 flex justify-between items-center gap-4">
                    <button id="cancel-btn" class="text-white font-semibold py-3 px-6 rounded-full border border-white/50">Batal</button>
                    <button id="capture-btn" class="w-20 h-20 bg-white rounded-full border-4 border-gray-300"></button>
                    <div class="w-[88px]"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const video = modal.querySelector('video');
            video.srcObject = stream;
            const locTextEl = modal.querySelector('#loc-text');
            
            // Variabel penyimpan lokasi TERAKHIR (Real-time update)
            let lastLocation = "Menunggu GPS...";
            let watchId = null;

            // --- MULAI LACAK LOKASI (BACKGROUND) ---
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        
                        // Fetch Alamat Detail
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`);
                            const data = await response.json();
                            if (data && data.address) {
                                const a = data.address;
                                // LOGIKA ALAMAT DETAIL
                                const parts = [];
                                if (a.road) parts.push(a.road); // Nama Jalan
                                if (a.house_number) parts.push(`No.${a.house_number}`);
                                if (a.village) parts.push(a.village); // Kelurahan
                                if (a.city_district) parts.push(a.city_district); // Kecamatan
                                if (a.city) parts.push(a.city); // Kota

                                // Gabungkan menjadi 1 string
                                const addressStr = parts.length > 0 ? parts.join(', ') : (data.display_name.split(',')[0]);
                                
                                // Simpan: Alamat + Koordinat
                                lastLocation = `${addressStr} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
                                
                                // Update UI Indikator (Biar user tau sudah dapat)
                                locTextEl.innerHTML = `📍 ${addressStr.substring(0, 25)}...`;
                            }
                        } catch (err) {
                            // Jika internet error, pakai koordinat saja
                            lastLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                            locTextEl.innerHTML = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                        }
                    },
                    (err) => {
                        console.warn("GPS Error:", err);
                        locTextEl.innerHTML = "⚠️ Sinyal GPS Lemah";
                        lastLocation = "Lokasi Tidak Terdeteksi";
                    },
                    { enableHighAccuracy: false, maximumAge: 0 } // False = Lebih Cepat
                );
            } else {
                locTextEl.innerHTML = "Browser tidak dukung GPS";
            }

            const cleanup = () => { 
                if (watchId) navigator.geolocation.clearWatch(watchId); // Stop GPS
                stream.getTracks().forEach(t => t.stop()); 
                document.body.removeChild(modal); 
            };

            // --- SAAT TOMBOL JEPRET DIKLIK (LANGSUNG AMBIL) ---
            modal.querySelector('#capture-btn').addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                const now = new Date();
                const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                // FORMAT JAM + DETIK
                const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
                
                // --- WATERMARK (ALAMAT DIBAKAR DI FOTO) ---
                const boxHeight = 120; // Lebih tinggi agar muat alamat
                const yStart = canvas.height - boxHeight;

                // Kotak Hitam Transparan
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
                ctx.fillRect(0, yStart, canvas.width, boxHeight);
                
                // Setup Teks
                ctx.fillStyle = "white";
                ctx.textAlign = "left"; // Rata Kiri
                
                // Baris 1: Jam (Ada Detik) | Tanggal
                ctx.font = "bold 32px Arial";
                ctx.fillText(`${timeStr} | ${dateStr}`, 20, yStart + 45);

                // Baris 2: Alamat Detail (Font Lebih Kecil)
                ctx.font = "22px Arial";
                // Potong jika terlalu panjang agar tidak keluar layar
                let displayLoc = lastLocation;
                if(displayLoc.length > 60) displayLoc = displayLoc.substring(0, 60) + "...";
                
                ctx.fillText(`📍 ${displayLoc}`, 20, yStart + 90);

                // SIMPAN FOTO & TEKS LOKASI
                addPhoto(fieldListName, canvas.toDataURL('image/jpeg', 0.8), lastLocation);
                cleanup();
            });

            modal.querySelector('#cancel-btn').addEventListener('click', cleanup);
        } catch (err) { 
            setWarningMessage("Gagal buka kamera: " + err.message);
            setShowModalWarning(true);
        }
    };

    const handleSubmit = async () => {
        if (isViewMode) return; 
        if (!formData.id && formData.foto_sebelum_list.length === 0) { setWarningMessage("Wajib foto sebelum!"); setShowModalWarning(true); return; }
        const platString = formData.plat_nomor_list.filter(p => p.trim() !== '').join(', ');
        
        if (!formData.id) {
            if (!formData.po_number || !formData.transporter_name || !formData.kegiatan_transporter_id) { setWarningMessage("Data PO/Transporter tidak valid!"); setShowModalWarning(true); return; }
            if (!platString) { setWarningMessage("Isi Nopol Truk Air!"); setShowModalWarning(true); return; }
        }

        setLoading(true);
        try {
            const payload = {
                id: formData.id, email_patroler: user.email,
                foto_sebelum_list: formData.foto_sebelum_list, 
                foto_sedang_list: formData.foto_sedang_list, 
                foto_setelah_list: formData.foto_setelah_list,
                lokasi_sebelum: formData.lokasi_sebelum,
                lokasi_sedang: formData.lokasi_sedang,
                lokasi_setelah: formData.lokasi_setelah
            };
            if (!formData.id) {
                payload.kegiatan_id = formData.kegiatan_transporter_id; 
                payload.plat_nomor_truk_air = platString;
            }
            const res = await axios.post('http://localhost:3000/api/water-truck', payload);
            setSuccessMessage(res.data.message);
            setShowModalSuccess(true);
            setShowModal(false); 
            resetForm(); 
            fetchData();
        } catch (err) { 
            setWarningMessage("Error: " + (err.response?.data?.message || err.message)); 
            setShowModalWarning(true);
        } finally { setLoading(false); }
    };

    const PhotoSection = ({ title, fieldListName, isLocked, locationText }) => (
        <div className={`p-4 rounded-lg border-2 ${isLocked || isViewMode ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex justify-between items-center mb-3">
                <label className="block text-red-600 font-bold text-sm">{title} ({formData[fieldListName].length})</label>
                {!isLocked && !isViewMode && <button onClick={() => handleCamera(fieldListName)} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-red-600 shadow-sm transition-colors">+ Foto</button>}
            </div>
            {formData[fieldListName].length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {formData[fieldListName].map((photo, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={getPhotoUrl(photo)} className="w-full h-full object-cover rounded-lg border border-gray-300 cursor-pointer shadow-sm" onClick={() => setPreviewImage(getPhotoUrl(photo))} alt="Bukti" />
                            {!isLocked && !isViewMode && (
                                <button onClick={() => removePhoto(fieldListName, index)} className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-7 h-7 flex items-center justify-center shadow-md z-10 border border-gray-200 hover:bg-red-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">Belum ada foto</div>}
            
            {locationText && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                    <span>📍</span><span className="truncate">{locationText}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="sticky top-0 z-40 bg-red-600 text-white px-4 py-3 md:px-6 md:py-4 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-600 font-bold text-xs">{user?.nama ? user.nama.charAt(0) : '?'}</div>
                    {user && <span className="font-medium hidden sm:inline">{user.nama}</span>}
                </div>
                <button onClick={handleLogout} className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg></button>
            </header>

            <main className="px-4 py-6 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-red-600 text-center mb-8">Patroli Kebersihan</h1>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="font-semibold text-gray-700 whitespace-nowrap">Tanggal:</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none w-full sm:w-auto"/>
                    </div>
                    {selectedDate === getLocalTodayDate() && (
                        <button onClick={handleInputBaru} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors w-full sm:w-auto">Input Data Baru</button>
                    )}
                </div>

                <div className="space-y-4">
                    {dataList.length === 0 ? <div className="text-center py-16 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">Tidak ada data patroli pada tanggal ini</div> : 
                        dataList.map((item) => {
                            const isCompleted = item.status === 'Completed'; 
                            let displayedPlates = item.plat_nomor_truk_air ? item.plat_nomor_truk_air.split(',').map(s => s.trim()) : [];

                            return (
                            <div key={item.id} className="border-2 border-red-500 bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-red-600">{item.nama_vendor}</h2>
                                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {new Date(item.waktu_mulai).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}>{isCompleted ? 'Selesai' : 'Draft'}</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm text-gray-700">
                                    <div className="flex justify-between border-b pb-1"><span>Nomor PO:</span> <span className="font-semibold">{item.no_po}</span></div>
                                    <div className="flex justify-between border-b pb-1"><span>Transportir:</span> <span className="font-semibold">{item.nama_vendor}</span></div>
                                    <div className="md:col-span-2 mt-2">
                                        <p className="font-semibold mb-1 text-gray-500">Nopol Truk Air ({displayedPlates.length}):</p>
                                        <div className="flex flex-wrap gap-2">
                                            {displayedPlates.map((plat, idx) => (
                                                <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs font-mono border border-gray-300">{plat}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs mb-5">
                                    <div className={`p-2 rounded text-center border ${item.foto_sebelum ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                        <div className="font-bold mb-1">Sblm</div>
                                        <div>{item.foto_sebelum ? formatJam(item.jam_foto_sebelum) : '-'}</div>
                                        {item.lokasi_foto_sebelum && <div className="text-[9px] mt-1 truncate">📍 {item.lokasi_foto_sebelum}</div>}
                                    </div>
                                    <div className={`p-2 rounded text-center border ${item.foto_sedang ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                        <div className="font-bold mb-1">Sdg</div>
                                        <div>{item.foto_sedang ? formatJam(item.jam_foto_sedang) : '-'}</div>
                                        {item.lokasi_foto_sedang && <div className="text-[9px] mt-1 truncate">📍 {item.lokasi_foto_sedang}</div>}
                                    </div>
                                    <div className={`p-2 rounded text-center border ${item.foto_setelah ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                        <div className="font-bold mb-1">Stlh</div>
                                        <div>{item.foto_setelah ? formatJam(item.jam_foto_setelah) : '-'}</div>
                                        {item.lokasi_foto_setelah && <div className="text-[9px] mt-1 truncate">📍 {item.lokasi_foto_setelah}</div>}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => handleLihatDetail(item)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-sm">Detail Data</button>
                                    {selectedDate === getLocalTodayDate() && !isCompleted && (
                                        <button onClick={() => handleUploadBukti(item)} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-sm flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Upload Bukti
                                        </button>
                                    )}
                                </div>
                            </div>
                        )})
                    }
                </div>
            </main>

            {/* MODAL WARNING */}
            {showModalWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-sm w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Peringatan</h2>
                        <p className="text-gray-700 mb-6">{warningMessage}</p>
                        <button onClick={() => setShowModalWarning(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full w-full transition-colors">Saya Mengerti</button>
                    </div>
                </div>
            )}

            {/* MODAL SUCCESS */}
            {showModalSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-lg border-2 border-green-500 p-6 max-w-sm w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-green-600 mb-2">Berhasil!</h2>
                        <p className="text-gray-700 mb-6">{successMessage || "Data berhasil disimpan."}</p>
                        <button onClick={() => setShowModalSuccess(false)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full w-full transition-colors">Oke</button>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRM LOGOUT */}
            {showModalConfirmLogout && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Konfirmasi Keluar</h2>
                        <p className="text-gray-700 mb-6">Apakah Anda yakin ingin keluar?</p>
                        <div className="flex gap-3 justify-center"><button onClick={() => setShowModalConfirmLogout(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full">Batal</button><button onClick={confirmLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full">Keluar</button></div>
                    </div>
                </div>
            )}

            {/* MODAL FORM INPUT */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-2xl border-2 border-red-500 animate-slide-up sm:animate-bounce-in max-h-[90vh] flex flex-col">
                        <div className={`px-6 py-4 text-white flex justify-between items-center ${isViewMode ? 'bg-green-600' : 'bg-red-600'}`}>
                            <h2 className="font-bold text-lg">{isViewMode ? 'Detail Data' : (formData.id ? 'Lanjutkan Laporan' : 'Input Laporan Baru')}</h2>
                            {!isViewMode && <div className="text-xs bg-black/20 px-3 py-1 rounded-full font-mono">Step {step}/2</div>}
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {step === 1 ? (
                                <div className="space-y-5">
                                    <div className={`space-y-5 ${formData.id ? 'opacity-80 pointer-events-none' : ''}`}>
                                        <div>
                                            <label className="block font-bold text-sm mb-2 text-red-600">Nomor PO</label>
                                            <input list="po-options" type="text" className="w-full border-2 border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all" placeholder="Ketik/Pilih No PO..." value={formData.po_number} onChange={handlePOInput} disabled={isViewMode || formData.id}/>
                                            <datalist id="po-options">{uniquePOs.map((po, idx) => (<option key={idx} value={po} />))}</datalist>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-sm mb-2 text-red-600">Transporter</label>
                                            <input list="transporter-options" type="text" className={`w-full border-2 border-gray-300 p-2.5 rounded-lg ${!formData.po_number ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'} focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none`} value={formData.transporter_name} onChange={handleTransporterInput} disabled={isViewMode || formData.id || !formData.po_number} />
                                            <datalist id="transporter-options">{filteredTransporters.map((item) => (<option key={item.id} value={item.nama_transporter} />))}</datalist>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-sm mb-2 text-red-600">Nopol Truk Air</label>
                                            {formData.plat_nomor_list.map((plat, index) => (
                                                <div key={index} className="flex gap-2 mb-2">
                                                    <input type="text" value={plat} onChange={(e) => handlePlatChange(index, e.target.value)} className="flex-1 border-2 border-gray-300 p-2.5 rounded-lg uppercase focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none" disabled={isViewMode || formData.id} placeholder="Contoh: BA 1234 XX"/>
                                                    {!isViewMode && !formData.id && (
                                                        <button onClick={() => removePlatField(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg border border-red-200">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {!isViewMode && !formData.id && <button onClick={addPlatField} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:text-blue-800 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Tambah Truk</button>}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t mt-4">
                                        <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold transition-colors">Tutup</button>
                                        <button onClick={() => { 
                                            if(!formData.kegiatan_transporter_id && !isViewMode) { setWarningMessage("Harap pilih Kombinasi PO dan Transporter yang valid!"); setShowModalWarning(true); } 
                                            else { setStep(2); }
                                        }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors">{isViewMode ? 'Lihat Foto' : 'Lanjut'}</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <PhotoSection title="Foto Sebelum" fieldListName="foto_sebelum_list" isLocked={lockedPhotos.before} locationText={formData.lokasi_sebelum} />
                                    <PhotoSection title="Foto Sedang" fieldListName="foto_sedang_list" isLocked={lockedPhotos.during} locationText={formData.lokasi_sedang} />
                                    <PhotoSection title="Foto Setelah" fieldListName="foto_setelah_list" isLocked={lockedPhotos.after} locationText={formData.lokasi_setelah} />
                                    <div className="flex gap-3 pt-4 border-t mt-4">
                                        <button onClick={() => setStep(1)} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold transition-colors">Kembali</button>
                                        {!isViewMode ? 
                                            <button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button> 
                                            : <button onClick={() => setShowModal(false)} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors">Tutup</button>
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW GAMBAR FULLSCREEN */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Full" className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"/>
                    <button className="absolute top-4 right-4 bg-white text-black w-10 h-10 rounded-full font-bold shadow-lg hover:bg-gray-200">X</button>
                </div>
            )}
        </div>
    );
};

export default PembersihanMaterial;