import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- HELPER UNTUK URL FOTO (SAMA DENGAN PERSONIL) ---
const getPhotoUrl = (photoData) => {
    if (!photoData) return null;
    if (photoData.startsWith('data:image')) return photoData; // Base64 (Baru)
    return `http://localhost:3000${photoData}`; // Path DB (Lama)
};

const formatJam = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) + ' WIB';
};

// Helper Tanggal Hari Ini (YYYY-MM-DD)
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
    
    // Default Tanggal = HARI INI
    const [selectedDate, setSelectedDate] = useState(getLocalTodayDate());
    
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1); 
    const [loading, setLoading] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false); // TRUE = DETAIL, FALSE = EDIT
    const [previewImage, setPreviewImage] = useState(null); // Zoom Foto

    // Data Master & Dropdown
    const [masterData, setMasterData] = useState([]); 
    const [uniquePOs, setUniquePOs] = useState([]); 
    const [filteredTransporters, setFilteredTransporters] = useState([]); 
    const [lockedPhotos, setLockedPhotos] = useState({ before: false, during: false, after: false });

    // State Logout Modal
    const [showModalConfirmLogout, setShowModalConfirmLogout] = useState(false);

    const [formData, setFormData] = useState({
        id: null, 
        kegiatan_transporter_id: '', 
        po_number: '',      
        transporter_name: '', 
        lokasi_patrol: 'Teluk Bayur - Titik A',
        plat_nomor_list: [''], 
        foto_sebelum_list: [], 
        foto_sedang_list: [], 
        foto_setelah_list: []
    });

    // 1. Cek Login
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role !== 'patroler') { alert("Akses Ditolak"); navigate('/login'); return; }
            setUser(parsedUser);
        } else { navigate('/login'); }
        fetchMasterData();
    }, [navigate]);

    // 2. Fetch Data saat Tanggal / User berubah
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
            lokasi_patrol: 'Teluk Bayur - Titik A', plat_nomor_list: [''], 
            foto_sebelum_list: [], foto_sedang_list: [], foto_setelah_list: [] 
        });
        setFilteredTransporters([]);
        setLockedPhotos({ before: false, during: false, after: false }); 
        setIsViewMode(false); setStep(1);
    };

    // --- KLIK TOMBOL DETAIL (READ ONLY) ---
    const handleLihatDetail = (item) => {
        setIsViewMode(true); 
        populateData(item);
        setStep(1); 
        setShowModal(true);
    };

    // --- KLIK TOMBOL UPLOAD (EDIT) ---
    const handleUploadBukti = (item) => {
        // Cek Tanggal Dulu: Jika tanggal lewat, tidak bisa edit
        if (selectedDate < getLocalTodayDate()) {
            alert("Data tanggal lampau tidak dapat diedit.");
            return;
        }
        setIsViewMode(false); 
        populateData(item);
        setStep(2); 
        setShowModal(true);
    };

    const handleInputBaru = () => {
        if (selectedDate < getLocalTodayDate()) {
            alert("Tidak dapat menginput data untuk tanggal yang sudah lewat.");
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
            lokasi_patrol: item.lokasi_patrol,
            foto_sebelum_list: splitPhotos(item.foto_sebelum),
            foto_sedang_list: splitPhotos(item.foto_sedang),
            foto_setelah_list: splitPhotos(item.foto_setelah),
        });

        const transForPO = masterData.filter(d => d.no_po === item.no_po);
        setFilteredTransporters(transForPO);

        setLockedPhotos({
            before: item.foto_sebelum?.length > 0,
            during: item.foto_sedang?.length > 0,
            after: item.foto_setelah?.length > 0
        });
    };

    // --- HANDLERS FORM ---
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
    
    // --- KAMERA ---
    const addPhoto = (field, base64) => { setFormData(prev => ({ ...prev, [field]: [...prev[field], base64] })); };
    const removePhoto = (field, index) => { setFormData(prev => { const newList = [...prev[field]]; newList.splice(index, 1); return { ...prev, [field]: newList }; }); };

    const handleCamera = async (fieldListName) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black z-[100] flex flex-col';
            modal.innerHTML = `<div class="relative flex-1 bg-black overflow-hidden flex items-center justify-center"><video autoplay playsinline class="w-full h-full object-cover"></video></div><div class="bg-black p-6 flex justify-between items-center gap-4"><button id="cancel-btn" class="text-white font-semibold py-3 px-6 rounded-full border border-white/50">Batal</button><button id="capture-btn" class="w-16 h-16 bg-white rounded-full border-4 border-gray-300"></button><div class="w-[88px]"></div></div>`;
            document.body.appendChild(modal);
            
            const video = modal.querySelector('video');
            video.srcObject = stream;

            const canvas = document.createElement('canvas');
            
            modal.querySelector('#capture-btn').addEventListener('click', () => {
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                // Timestamp
                const now = new Date();
                const ts = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
                ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(10, canvas.height-50, 300, 40);
                ctx.font = "bold 24px Arial"; ctx.fillStyle = "white"; ctx.fillText(ts, 20, canvas.height-22);
                
                addPhoto(fieldListName, canvas.toDataURL('image/jpeg', 0.7));
                stream.getTracks().forEach(t => t.stop()); document.body.removeChild(modal);
            });

            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                stream.getTracks().forEach(t => t.stop()); document.body.removeChild(modal);
            });
        } catch (err) { alert("Gagal buka kamera: " + err.message); }
    };

    const handleSubmit = async () => {
        if (isViewMode) return; 
        if (!formData.id && formData.foto_sebelum_list.length === 0) { alert("Wajib foto sebelum!"); return; }
        const platString = formData.plat_nomor_list.filter(p => p.trim() !== '').join(', ');
        
        if (!formData.id) {
            if (!formData.po_number || !formData.transporter_name || !formData.kegiatan_transporter_id) { alert("Data PO/Transporter tidak valid!"); return; }
            if (!platString) { alert("Isi plat nomor!"); return; }
        }

        setLoading(true);
        try {
            const payload = {
                id: formData.id, email_patroler: user.email,
                foto_sebelum_list: formData.foto_sebelum_list, foto_sedang_list: formData.foto_sedang_list, foto_setelah_list: formData.foto_setelah_list
            };
            if (!formData.id) {
                payload.kegiatan_id = formData.kegiatan_transporter_id; 
                payload.plat_nomor_truk_air = platString;
                payload.lokasi_patrol = formData.lokasi_patrol;
            }
            const res = await axios.post('http://localhost:3000/api/water-truck', payload);
            alert(res.data.message); setShowModal(false); resetForm(); fetchData();
        } catch (err) { alert("Error: " + (err.response?.data?.message || err.message)); } finally { setLoading(false); }
    };

    const PhotoSection = ({ title, fieldListName, isLocked }) => (
        <div className={`bg-gray-50 p-3 rounded-lg border ${isLocked || isViewMode ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-red-700 font-bold text-sm">{title} ({formData[fieldListName].length})</label>
                {!isLocked && !isViewMode && <button onClick={() => handleCamera(fieldListName)} className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-200">+ Foto</button>}
            </div>
            {formData[fieldListName].length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {formData[fieldListName].map((photo, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={getPhotoUrl(photo)} className="w-full h-full object-cover rounded-md border border-gray-300 cursor-pointer" onClick={() => setPreviewImage(getPhotoUrl(photo))} alt="Bukti" />
                            {!isLocked && !isViewMode && <button onClick={() => removePhoto(fieldListName, index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm z-10">X</button>}
                        </div>
                    ))}
                </div>
            ) : <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed rounded">Belum ada foto</div>}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header Merah (Style Personil) */}
            <header className="sticky top-0 z-40 bg-red-600 text-white px-4 py-3 md:px-6 md:py-4 shadow-lg">
                <div className="flex items-center justify-end space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-xs">{user?.nama ? user.nama.charAt(0) : '?'}</span>
                        </div>
                        {user && <span className="font-medium hidden sm:inline">{user.nama}</span>}
                    </div>
                    <button onClick={handleLogout} className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                    </button>
                </div>
            </header>

            <main className="px-4 py-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-red-600 text-center mb-8">Patroli Kebersihan</h1>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                    <div className="flex items-center space-x-2">
                        <label className="font-semibold text-gray-700">Tanggal:</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded px-3 py-2 text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none"/>
                    </div>
                    {/* TOMBOL INPUT HANYA MUNCUL JIKA TANGGAL >= HARI INI */}
                    {selectedDate >= getLocalTodayDate() && (
                        <button onClick={handleInputBaru} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition-colors">
                            Input Data Baru
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {dataList.length === 0 ? <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">Tidak ada data patroli pada tanggal ini</div> : 
                        dataList.map((item) => {
                            const isCompleted = item.status === 'Completed'; 
                            let displayedPlates = item.plat_nomor_truk_air ? item.plat_nomor_truk_air.split(',').map(s => s.trim()) : [];

                            return (
                            <div key={item.id} className={`border-l-4 ${isCompleted ? 'border-green-500' : 'border-yellow-500'} bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div><h2 className="text-xl font-bold text-red-600">{item.nama_vendor}</h2><div className="text-sm text-gray-500 mt-1">{new Date(item.waktu_mulai).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB</div></div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}>{isCompleted ? 'Selesai' : 'Draft'}</span>
                                        <div className="text-xs font-medium text-gray-500 mt-1">{new Date(item.waktu_mulai).toLocaleDateString('id-ID')}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                                    <div><p className="text-gray-500">NO PO</p><p className="font-semibold">{item.no_po}</p></div>
                                    <div><p className="text-gray-500">Lokasi</p><p className="font-semibold">{item.lokasi_patrol}</p></div>
                                    <div className="md:col-span-2"><p className="text-gray-500">Transportir</p><p className="font-semibold text-gray-800">{item.nama_vendor}</p></div>
                                    <div className="md:col-span-2"><p className="text-gray-500">Nomor Polisi ({displayedPlates.length} truk)</p><ul className="list-disc list-inside ml-1 font-mono text-gray-700">{displayedPlates.map((plat, idx) => (<li key={idx}>{plat}</li>))}</ul></div>
                                </div>
                                <div className="flex gap-2 text-xs mb-4">
                                    <div className={`flex-1 p-2 rounded text-center border ${item.foto_sebelum ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50'}`}><div className="font-bold">Sblm: {item.foto_sebelum ? item.foto_sebelum.split(',').length : 0}</div><div className="text-[10px] mt-1">{formatJam(item.jam_foto_sebelum)}</div></div>
                                    <div className={`flex-1 p-2 rounded text-center border ${item.foto_sedang ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50'}`}><div className="font-bold">Sdg: {item.foto_sedang ? item.foto_sedang.split(',').length : 0}</div><div className="text-[10px] mt-1">{formatJam(item.jam_foto_sedang)}</div></div>
                                    <div className={`flex-1 p-2 rounded text-center border ${item.foto_setelah ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50'}`}><div className="font-bold">Stlh: {item.foto_setelah ? item.foto_setelah.split(',').length : 0}</div><div className="text-[10px] mt-1">{formatJam(item.jam_foto_setelah)}</div></div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button onClick={() => handleLihatDetail(item)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold transition-colors shadow-sm">Lihat Detail</button>
                                    
                                    {/* TOMBOL EDIT HANYA MUNCUL JIKA TANGGAL HARI INI & BELUM COMPLETED */}
                                    {selectedDate >= getLocalTodayDate() && !isCompleted && (
                                        <button onClick={() => handleUploadBukti(item)} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded font-semibold transition-colors shadow-sm">Lanjutkan / Upload</button>
                                    )}
                                </div>
                            </div>
                        )})
                    }
                </div>
            </main>

            {/* MODAL CONFIRM LOGOUT */}
            {showModalConfirmLogout && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 max-w-md w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Konfirmasi Keluar</h2>
                        <p className="text-gray-700 mb-6">Apakah Anda yakin ingin keluar?</p>
                        <div className="flex gap-3 justify-center"><button onClick={() => setShowModalConfirmLogout(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full">Batal</button><button onClick={confirmLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full">Keluar</button></div>
                    </div>
                </div>
            )}

            {/* MODAL UTAMA */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up sm:animate-bounce-in max-h-[90vh] flex flex-col border-2 border-red-500">
                        <div className={`p-4 text-white flex justify-between items-center sticky top-0 z-10 ${isViewMode ? 'bg-green-600' : 'bg-red-600'}`}>
                            <h2 className="font-bold text-lg">{isViewMode ? 'Detail Data' : (formData.id ? 'Lanjutkan' : 'Input Baru')}</h2>
                            {!isViewMode && <div className="text-xs bg-black/20 px-2 py-1 rounded-full">Step {step}/2</div>}
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {step === 1 ? (
                                <div className="space-y-4">
                                    <div className={`space-y-4 ${formData.id ? 'opacity-80 pointer-events-none' : ''}`}>
                                        <div><label className="block font-bold text-sm mb-1 text-red-600">Cari PO</label><input list="po-options" type="text" className="w-full border-2 border-red-500 p-2 rounded bg-white" placeholder="Ketik/Pilih No PO..." value={formData.po_number} onChange={handlePOInput} disabled={isViewMode || formData.id}/><datalist id="po-options">{uniquePOs.map((po, idx) => (<option key={idx} value={po} />))}</datalist></div>
                                        <div><label className="block font-bold text-sm mb-1 text-red-600">Pilih Transporter</label><input list="transporter-options" type="text" className={`w-full border-2 border-red-500 p-2 rounded ${!formData.po_number ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} placeholder={!formData.po_number ? "Pilih PO dulu..." : "Ketik/Pilih Transporter..."} value={formData.transporter_name} onChange={handleTransporterInput} disabled={isViewMode || formData.id || !formData.po_number}/><datalist id="transporter-options">{filteredTransporters.map((item) => (<option key={item.id} value={item.nama_transporter} />))}</datalist></div>
                                        <div><label className="block font-bold text-sm mb-1 text-red-600">Lokasi</label><select value={formData.lokasi_patrol} onChange={(e) => setFormData({...formData, lokasi_patrol: e.target.value})} className="w-full border-2 border-red-500 p-2 rounded" disabled={isViewMode || formData.id}><option>Teluk Bayur - Titik A</option><option>Titik A - Titik B</option><option>Titik B - Titik C</option><option>Titik C - SP</option></select></div>
                                        <div><label className="block font-bold text-sm mb-1 text-red-600">Plat No</label>{formData.plat_nomor_list.map((plat, index) => (<div key={index} className="flex gap-2 mb-2"><input type="text" value={plat} onChange={(e) => handlePlatChange(index, e.target.value)} className="flex-1 border-2 border-red-500 p-2 rounded uppercase" disabled={isViewMode || formData.id}/>{!isViewMode && !formData.id && <button onClick={() => removePlatField(index)} className="text-red-500 font-bold">X</button>}</div>))}{!isViewMode && !formData.id && <button onClick={addPlatField} className="text-blue-600 text-sm font-bold">+ Tambah</button>}</div>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button onClick={() => setShowModal(false)} className="flex-1 bg-red-500 text-white py-2 rounded font-bold">Tutup</button>
                                        <button onClick={() => { if(!formData.kegiatan_transporter_id && !isViewMode) { alert("Harap pilih Kombinasi PO dan Transporter yang valid!"); } else { setStep(2); }}} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">{isViewMode ? 'Lihat Foto' : 'Lanjut'}</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <PhotoSection title="Foto Sebelum" fieldListName="foto_sebelum_list" isLocked={lockedPhotos.before} />
                                    <PhotoSection title="Foto Sedang" fieldListName="foto_sedang_list" isLocked={lockedPhotos.during} />
                                    <PhotoSection title="Foto Setelah" fieldListName="foto_setelah_list" isLocked={lockedPhotos.after} />
                                    <div className="flex gap-2 pt-4">
                                        <button onClick={() => setStep(1)} className="flex-1 bg-gray-500 text-white py-2 rounded font-bold">Kembali</button>
                                        {!isViewMode ? <button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-green-600 text-white py-2 rounded font-bold">{loading ? '...' : 'Simpan'}</button> : <button onClick={() => setShowModal(false)} className="flex-[2] bg-blue-600 text-white py-2 rounded font-bold">Tutup</button>}
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
                    <img src={previewImage} alt="Full" className="max-w-full max-h-screen object-contain rounded-lg"/>
                    <button className="absolute top-4 right-4 bg-white text-black w-10 h-10 rounded-full font-bold">X</button>
                </div>
            )}
        </div>
    );
};

export default PembersihanMaterial;