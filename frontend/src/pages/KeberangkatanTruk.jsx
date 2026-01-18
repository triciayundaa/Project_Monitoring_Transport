import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const KeberangkatanTruk = () => {
    const [user, setUser] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [truckDepartures, setTruckDepartures] = useState([]);
    
    // STATE BARU: Untuk Label Shift di Header
    const [currentShiftLabel, setCurrentShiftLabel] = useState('Memuat...'); 
    
    const navigate = useNavigate();

    // Modal states
    const [showModalPO, setShowModalPO] = useState(false);
    const [showModalForm, setShowModalForm] = useState(false);
    const [showModalError, setShowModalError] = useState(false);
    const [showModalDetail, setShowModalDetail] = useState(false);
    const [showModalSuccess, setShowModalSuccess] = useState(false);
    const [showModalWarning, setShowModalWarning] = useState(false); // Modal Warning Baru
    const [warningMessage, setWarningMessage] = useState(''); // Pesan Warning Baru
    
    const [selectedDetail, setSelectedDetail] = useState(null);
    
    // Form states
    const [noPO, setNoPO] = useState('');
    const [poData, setPoData] = useState(null);
    const [formData, setFormData] = useState({
        no_polisi: '',
        no_seri_pengantar: '',
        foto_truk: null,
        foto_surat: null
    });
    const [loading, setLoading] = useState(false);

    // 1. Cek Login User
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // 2. Load Data Truk saat tanggal berubah
    useEffect(() => {
        if (user && selectedDate) {
            loadKeberangkatanData();
        }
    }, [selectedDate, user]);

    // 3. Cek Status Shift User Real-time untuk Header
    useEffect(() => {
        const checkUserShiftStatus = async () => {
            if (!user?.email || !selectedDate) return;

            try {
                const res = await axios.get(`http://localhost:3000/api/keberangkatan/status-shift`, {
                    params: { email: user.email, tanggal: selectedDate }
                });

                if (res.data.status === 'Success') {
                    setCurrentShiftLabel(res.data.data.shift);
                } else {
                    setCurrentShiftLabel('Tidak Ada Jadwal');
                }
            } catch (err) {
                console.error('Gagal cek shift:', err);
                setCurrentShiftLabel('Error Cek Jadwal');
            }
        };

        checkUserShiftStatus();
    }, [user, selectedDate]);

    // --- FUNGSI LOGOUT BARU ---
    const handleLogout = () => {
        if (window.confirm('Apakah Anda yakin ingin keluar?')) {
            localStorage.removeItem('user'); // Hapus data user
            // localStorage.removeItem('token'); // Hapus token jika ada
            navigate('/login'); // Redirect ke halaman login
        }
    };
    // -------------------------

    const loadKeberangkatanData = async () => {
        if (!user || !user.email) return;

        try {
            const response = await axios.get(`http://localhost:3000/api/keberangkatan/list`, {
                params: {
                    tanggal: selectedDate,
                    email_user: user.email
                }
            });

            if (response.data.status === 'Success') {
                setTruckDepartures(response.data.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleInputDataBaru = () => {
        // --- 1. VALIDASI TANGGAL BERLALU (KODINGAN BARU) ---
        // Kita buat tanggal hari ini menjadi format YYYY-MM-DD string agar bisa dibandingkan
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        // Bandingkan string tanggal (misal: "2023-10-01" < "2023-10-02")
        if (selectedDate < todayString) {
            setWarningMessage('Anda tidak dapat menginput data pada tanggal yang sudah berlalu.');
            setShowModalWarning(true);
            return;
        }
        // ----------------------------------------------------

        // --- VALIDASI SHIFT & JAM (FRONTEND) ---
        if (currentShiftLabel === 'Libur') {
            setWarningMessage('Anda tidak dapat menginput data karena jadwal Anda hari ini LIBUR.');
            setShowModalWarning(true);
            return;
        }

        if (currentShiftLabel === 'Tidak Ada Jadwal' || currentShiftLabel === 'Error Cek Jadwal') {
            setWarningMessage('Jadwal Anda hari ini belum diatur oleh Admin. Silakan hubungi Admin.');
            setShowModalWarning(true);
            return;
        }

        const now = new Date();
        const currentHour = now.getHours();
        let isTimeValid = false;

        if (currentShiftLabel === 'Shift 1') {
            if (currentHour >= 7 && currentHour < 15) isTimeValid = true;
        } else if (currentShiftLabel === 'Shift 2') {
            if (currentHour >= 15 && currentHour < 23) isTimeValid = true;
        } else if (currentShiftLabel === 'Shift 3') {
            if (currentHour >= 23 || currentHour < 7) isTimeValid = true;
        }

        if (!isTimeValid) {
            setWarningMessage(`Sekarang jam ${currentHour}:00 WIB. Anda (${currentShiftLabel}) belum diizinkan input data saat ini.`);
            setShowModalWarning(true);
            return;
        }
        // ---------------------------------------

        setNoPO('');
        setPoData(null);
        setFormData({
            no_polisi: '',
            no_seri_pengantar: '',
            foto_truk: null,
            foto_surat: null
        });
        setShowModalPO(true);
    };

    const handleCekPO = async () => {
        const noPOTrimmed = noPO.trim();
        if (!noPOTrimmed) {
            alert('Masukkan nomor PO terlebih dahulu');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3000/api/keberangkatan/cek-po', {
                no_po: noPOTrimmed
            });

            if (response.data.status === 'Success') {
                const dataPO = response.data.data;

                // --- KODINGAN BARU: CEK STATUS COMPLETED ---
                // Pastikan backend Anda mengirimkan field 'status' di response data
                if (dataPO.status === 'Completed') {
                    setWarningMessage(`Nomor PO ${dataPO.no_po} sudah berstatus COMPLETED (Selesai). Anda tidak dapat menginput data baru.`);
                    setShowModalWarning(true); // Menggunakan modal warning yang sudah kita buat sebelumnya
                    return; // Hentikan proses, jangan buka form input
                }
                // -------------------------------------------

                setPoData(dataPO);
                setShowModalPO(false);
                setShowModalForm(true);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                setShowModalPO(false);
                setShowModalError(true);
            } else {
                alert(error.response?.data?.message || 'Terjadi kesalahan saat mengecek PO');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCapturePhoto = async (field) => {
        try {
            // --- SETTING KAMERA BELAKANG ---
            // Kita gunakan 'facingMode: "environment"' agar default ke kamera belakang.
            // Jika di Laptop/PC tidak ada kamera belakang, dia akan otomatis pakai webcam biasa.
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: { ideal: "environment" } 
                }
            });
            // -------------------------------

            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true; // Penting untuk iOS agar tidak fullscreen otomatis
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover'; // Agar tampilan penuh rapi

            // Buat Modal Kamera Fullscreen sederhana
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black z-[100] flex flex-col';
            
            modal.innerHTML = `
                <div class="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                    <div id="camera-preview" class="w-full h-full flex items-center justify-center"></div>
                    
                    <div class="absolute inset-0 border-2 border-white/30 pointer-events-none"></div>
                </div>

                <div class="bg-black p-6 flex justify-between items-center gap-4">
                    <button id="cancel-btn" type="button" class="text-white font-semibold py-3 px-6 rounded-full border border-white/50 hover:bg-white/10 transition-colors">
                        Batal
                    </button>
                    
                    <button id="capture-btn" type="button" class="w-16 h-16 bg-white rounded-full border-4 border-gray-300 active:scale-95 transition-transform shadow-lg"></button>
                    
                    <div class="w-[88px]"></div> </div>
            `;
            document.body.appendChild(modal);

            const previewDiv = modal.querySelector('#camera-preview');
            previewDiv.appendChild(video);

            const canvas = document.createElement('canvas');
            
            // Tunggu video siap untuk mendapatkan resolusi asli
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            });

            // Action Ambil Foto
            modal.querySelector('#capture-btn').addEventListener('click', () => {
                const ctx = canvas.getContext('2d');
                // Gambar video ke canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Konversi ke base64 (format gambar)
                const imageData = canvas.toDataURL('image/jpeg', 0.8); // Kualitas 0.8 (80%) agar tidak terlalu berat
                
                // Matikan kamera
                stream.getTracks().forEach(track => track.stop());
                
                // Simpan ke State Form
                setFormData(prev => ({ ...prev, [field]: imageData }));
                
                // Tutup Modal
                document.body.removeChild(modal);
            });

            // Action Batal
            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(modal);
            });

        } catch (error) {
            console.error(error);
            alert('Gagal membuka kamera. Pastikan izin kamera diberikan. Error: ' + error.message);
        }
    };

    const handleSimpan = async () => {
        if (!formData.no_polisi.trim()) { alert('Masukkan nomor polisi'); return; }
        if (!formData.no_seri_pengantar.trim()) { alert('Masukkan nomor seri pengantar'); return; }
        if (!formData.foto_truk) { alert('Ambil foto truk terlebih dahulu'); return; }
        if (!formData.foto_surat) { alert('Ambil foto surat pengantar terlebih dahulu'); return; }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3000/api/keberangkatan/simpan', {
                kegiatan_id: poData.id,
                no_polisi: formData.no_polisi.trim(),
                email_user: user.email,
                tanggal: selectedDate, 
                no_seri_pengantar: formData.no_seri_pengantar.trim(),
                foto_truk: formData.foto_truk,
                foto_surat: formData.foto_surat
            });

            if (response.data.status === 'Success') {
                setShowModalForm(false);
                setFormData({ no_polisi: '', no_seri_pengantar: '', foto_truk: null, foto_surat: null });
                setShowModalSuccess(true);
                loadKeberangkatanData();
            }
        } catch (error) {
            console.error('Error simpan:', error);
            const msg = error.response?.data?.message || 'Gagal menyimpan data';
            setWarningMessage(msg);
            setShowModalWarning(true);
        } finally {
            setLoading(false);
        }
    };

    const handleLihatDetail = (truck) => {
        setSelectedDetail(truck);
        setShowModalDetail(true);
    };

    const handleHapus = async (id) => {
        if (!window.confirm('Hapus data ini?')) return;
        try {
            const response = await axios.delete(`http://localhost:3000/api/keberangkatan/hapus/${id}`);
            if (response.data.status === 'Success') {
                setTruckDepartures(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            alert('Gagal hapus data');
        }
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' });
    };

    const formatTimeForDisplay = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
    };

    const getBadgeColor = (shift) => {
        if (shift === 'Libur') return 'bg-gray-800 text-white';
        if (shift === 'Tidak Ada Jadwal') return 'bg-yellow-500 text-white';
        if (shift === 'Error Cek Jadwal') return 'bg-red-500 text-white';
        return 'bg-white text-red-600 border border-red-600'; 
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-red-600 text-white px-4 py-3 md:px-6 md:py-4 shadow-lg">
                <div className="flex items-center justify-end space-x-4">
                    <div className="flex items-center space-x-2">

                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-xs">{user?.nama ? user.nama.charAt(0) : '?'}</span>
                        </div>
                        {user && <span className="font-medium hidden sm:inline">{user.nama}</span>}
                    </div>
                    
                    {/* Shift Label */}
                    <div className={`text-sm font-bold px-3 py-1 rounded shadow-sm ${getBadgeColor(currentShiftLabel)}`}>
                        {currentShiftLabel}
                    </div>

                    {/* TOMBOL LOGOUT (ICON) */}
                    <button 
                        onClick={handleLogout}
                        className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shadow-sm focus:outline-none"
                        title="Keluar / Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="px-4 py-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-red-600 text-center mb-8">Keberangkatan Truk</h1>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                    <div className="flex items-center space-x-2">
                        <label className="font-semibold">Tanggal:</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded px-3 py-2"/>
                    </div>
                    <button onClick={handleInputDataBaru} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow">
                        Input Data Baru
                    </button>
                </div>

                <div className="space-y-4">
                    {truckDepartures.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Tidak ada data keberangkatan truk</div>
                    ) : (
                        truckDepartures.map((truck) => (
                            <div key={truck.id} className="border-2 border-red-500 rounded-lg p-4 bg-white shadow hover:shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-red-600">{truck.nama_vendor}</h2>
                                    <span className="text-gray-600">{formatDateForDisplay(truck.tanggal)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div><p className="text-sm text-gray-500">Nomor Polisi</p><p className="font-semibold">{truck.plat_nomor}</p></div>
                                    <div><p className="text-sm text-gray-500">Jam berangkat</p><p className="font-semibold">{formatTimeForDisplay(truck.created_at)}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleLihatDetail(truck)} className="flex-1 bg-green-500 text-white py-2 rounded">Lihat Detail</button>
                                    <button onClick={() => handleHapus(truck.id)} className="flex-1 bg-red-500 text-white py-2 rounded">Hapus</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal Input PO */}
            {showModalPO && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full border-2 border-red-500">
                        <h2 className="text-xl font-bold text-red-600 mb-4">Masukkan Nomor PO</h2>
                        <input type="text" value={noPO} onChange={(e)=>setNoPO(e.target.value)} className="w-full border p-2 rounded mb-4" placeholder="Nomor PO" />
                        <div className="flex justify-end gap-2">
                            <button onClick={()=>setShowModalPO(false)} className="bg-red-500 text-white px-4 py-2 rounded">Batal</button>
                            <button onClick={handleCekPO} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded">{loading?'Mencari...':'Lanjut'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Form Input */}
            {showModalForm && poData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-2xl w-full my-8">
                        <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-6">Input Data Keberangkatan Truk</h2>
                        
                        <div className="space-y-4">
                            <div><label className="block text-sm font-semibold text-red-600 mb-2">Personil</label><input type="text" value={user?.nama || ''} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                            <div><label className="block text-sm font-semibold text-red-600 mb-2">Shift</label><input type="text" value={currentShiftLabel} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                            <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor Polisi</label><input type="text" value={formData.no_polisi} onChange={(e) => setFormData(prev => ({ ...prev, no_polisi: e.target.value }))} placeholder="Masukkan nomor polisi" className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none" /></div>
                            <div><label className="block text-sm font-semibold text-red-600 mb-2">Tanggal</label><input type="text" value={formatDateForDisplay(selectedDate)} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                            <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor Seri Pengantar</label><input type="text" value={formData.no_seri_pengantar} onChange={(e) => setFormData(prev => ({ ...prev, no_seri_pengantar: e.target.value }))} placeholder="Masukkan nomor seri pengantar" className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none" /></div>

                            {/* Foto Truk */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Truk</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => handleCapturePhoto('foto_truk')} className="flex-1 px-4 py-2.5 border-2 border-red-500 rounded-lg text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                        <span>{formData.foto_truk ? 'Foto sudah diambil' : 'Silahkan Ambil Foto Truk'}</span>
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                {formData.foto_truk && (
                                    <div className="mt-2">
                                        <img src={formData.foto_truk} alt="Foto Truk" className="w-full h-48 object-cover rounded-lg" />
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, foto_truk: null }))} className="mt-2 text-sm text-red-600 hover:text-red-700">Hapus Foto</button>
                                    </div>
                                )}
                            </div>

                            {/* Foto Surat Pengantar */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Surat Pengantar</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => handleCapturePhoto('foto_surat')} className="flex-1 px-4 py-2.5 border-2 border-red-500 rounded-lg text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                        <span>{formData.foto_surat ? 'Foto sudah diambil' : 'Silahkan Ambil Foto Surat Pengantar'}</span>
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                {formData.foto_surat && (
                                    <div className="mt-2">
                                        <img src={formData.foto_surat} alt="Foto Surat Pengantar" className="w-full h-48 object-cover rounded-lg" />
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, foto_surat: null }))} className="mt-2 text-sm text-red-600 hover:text-red-700">Hapus Foto</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowModalForm(false); setPoData(null); }} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Kembali</button>
                            <button onClick={handleSimpan} disabled={loading} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Error PO */}
            {showModalError && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-md w-full text-center">
                        <div className="mb-4">
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-red-600">Nomor PO Tidak Ditemukan</h2>
                        </div>
                        <button onClick={() => { setShowModalError(false); setNoPO(''); }} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors">Oke</button>
                    </div>
                </div>
            )}

            {/* Modal Detail */}
            {showModalDetail && selectedDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 overflow-y-auto">
                    <div className="min-h-full flex items-start justify-center py-8">
                        <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-2xl w-full my-auto">
                            <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-6">Detail Keberangkatan Truk</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Transportir</label><input type="text" value={selectedDetail.transporter || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor PO</label><input type="text" value={selectedDetail.no_po || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Material</label><input type="text" value={selectedDetail.material || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor Kapal</label><input type="text" value={selectedDetail.nama_kapal || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Personil</label><input type="text" value={selectedDetail.nama_personil || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Shift</label><input type="text" value={selectedDetail.nama_shift || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor Polisi</label><input type="text" value={selectedDetail.plat_nomor || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Tanggal</label><input type="text" value={formatDateForDisplay(selectedDetail.tanggal)} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Nomor Seri Pengantar</label><input type="text" value={selectedDetail.no_seri_pengantar || 'N/A'} disabled className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600" /></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Foto Truk</label><div className="border-2 border-red-500 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-gray-50">{selectedDetail.foto_truk ? <img src={selectedDetail.foto_truk} alt="Foto Truk" className="max-w-full max-h-64 object-contain rounded-lg" /> : <span className="text-red-600 font-semibold">Image</span>}</div></div>
                                <div><label className="block text-sm font-semibold text-red-600 mb-2">Foto Surat Pengantar</label><div className="border-2 border-red-500 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-gray-50">{selectedDetail.foto_surat ? <img src={selectedDetail.foto_surat} alt="Foto Surat Pengantar" className="max-w-full max-h-64 object-contain rounded-lg" /> : <span className="text-red-600 font-semibold">Image</span>}</div></div>
                            </div>
                            <div className="flex justify-start mt-6"><button onClick={() => { setShowModalDetail(false); setSelectedDetail(null); }} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Kembali</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Success */}
            {showModalSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-md w-full text-center">
                        <div className="mb-4">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-red-600">Data Berhasil Disimpan</h2>
                        </div>
                        <button onClick={() => setShowModalSuccess(false)} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors">Oke</button>
                    </div>
                </div>
            )}

            {/* Modal Warning */}
            {showModalWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-md w-full text-center shadow-2xl animate-bounce-in">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h2>
                        <p className="text-gray-700 mb-6">{warningMessage}</p>
                        <button onClick={() => setShowModalWarning(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full w-full transition-colors">Saya Mengerti</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeberangkatanTruk;