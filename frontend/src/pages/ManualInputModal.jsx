import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Plus, Camera, Trash2 } from 'lucide-react';
import API_BASE_URL from '../config/api';

// --- Komponen InputGroup (Reusable) ---
const InputGroup = ({ label, name, type = "text", value, onChange, required, disabled, placeholder, children, max, ...props }) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children ? children : (
            <input 
                type={type} 
                name={name}
                value={value} 
                onChange={onChange} 
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                max={max}
                {...props} 
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm 
                ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}
            />
        )}
    </div>
);

const ManualInputModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    kegiatanData, 
    transporterList,
    // Props untuk Edit Mode
    editMode = false,
    editData = null
}) => {
    // --- HELPERS ---
    const getTodayDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    const getPhotoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('data:') || path.startsWith('http')) return path;
        return `${API_BASE_URL}${path}`;
    };

    // --- STATE ---
    const [formData, setFormData] = useState({
        transporter_id: '',
        plat_nomor: '',
        nama_personil: '',
        no_seri_pengantar: '',
        shift_id: '',
        tanggal: getTodayDate(),
        jam: getCurrentTime(),
        foto_truk: null,
        foto_surat: null,
        keterangan: 'Input Manual oleh Admin',
        status: 'Valid'
    });

    const [availableKendaraan, setAvailableKendaraan] = useState([]);
    const [availableShifts, setAvailableShifts] = useState([]);
    const [loadingKendaraan, setLoadingKendaraan] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Preview Images
    const [previewTruk, setPreviewTruk] = useState(null);
    const [previewSurat, setPreviewSurat] = useState(null);
    
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSearchingPersonil, setIsSearchingPersonil] = useState(false);
    const [maxTime, setMaxTime] = useState(null);

    // Track if existing photo should be kept (untuk edit mode)
    const [keepExistingTruk, setKeepExistingTruk] = useState(true);
    const [keepExistingSurat, setKeepExistingSurat] = useState(true);

    // Refs untuk input file terpisah
    const fileInputTrukRef = useRef(null);
    const fileInputSuratRef = useRef(null);

    // --- EFFECTS ---

    // 1. Reset Form atau Load Edit Data
    useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                // EDIT MODE - Load data yang akan diedit
                console.log('📝 Loading Edit Data:', editData);
                
                const createdAt = new Date(editData.created_at);
                const tanggal = createdAt.toISOString().split('T')[0];
                const jam = createdAt.toTimeString().slice(0, 5);

                setFormData({
                    transporter_id: editData.transporter_id || '',
                    plat_nomor: editData.nopol || '',
                    nama_personil: editData.nama_personil || '',
                    no_seri_pengantar: editData.no_seri_pengantar || '',
                    shift_id: editData.shift_id || '',
                    tanggal: tanggal,
                    jam: jam,
                    foto_truk: null,
                    foto_surat: null,
                    keterangan: editData.keterangan || '',
                    status: editData.status || 'Valid'
                });

                // Set preview foto existing
                if (editData.foto_truk) {
                    setPreviewTruk(getPhotoUrl(editData.foto_truk));
                    setKeepExistingTruk(true);
                } else {
                    setPreviewTruk(null);
                    setKeepExistingTruk(false);
                }

                if (editData.foto_surat) {
                    setPreviewSurat(getPhotoUrl(editData.foto_surat));
                    setKeepExistingSurat(true);
                } else {
                    setPreviewSurat(null);
                    setKeepExistingSurat(false);
                }
            } else {
                // CREATE MODE - Reset form
                const today = getTodayDate();
                const nowTime = getCurrentTime();

                setFormData({
                    transporter_id: '',
                    plat_nomor: '',
                    nama_personil: '',
                    no_seri_pengantar: '',
                    shift_id: '',
                    tanggal: today,
                    jam: nowTime,
                    foto_truk: null,
                    foto_surat: null,
                    keterangan: 'Input Manual oleh Admin',
                    status: 'Valid'
                });
                
                setPreviewTruk(null);
                setPreviewSurat(null);
                setKeepExistingTruk(false);
                setKeepExistingSurat(false);
                setMaxTime(nowTime);
            }
            
            setAvailableKendaraan([]);
            setShowSuccessModal(false);
            fetchShifts();
        }
    }, [isOpen, editMode, editData]);

    const fetchShifts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/shift`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setAvailableShifts(data);
            }
        } catch (err) { console.error(err); }
    };

    // 2. Batasi Jam Hari Ini
    useEffect(() => {
        if (formData.tanggal === getTodayDate()) {
            setMaxTime(getCurrentTime());
        } else {
            setMaxTime(null);
        }
    }, [formData.tanggal]);

    // 3. Auto-Fill Shift & Personil
    useEffect(() => {
        const autoFillJadwal = async () => {
            if (formData.tanggal && formData.jam) {
                const today = getTodayDate();
                const now = getCurrentTime();
                
                if (formData.tanggal > today) {
                    setFormData(prev => ({ ...prev, tanggal: today }));
                    return;
                }
                if (formData.tanggal === today && formData.jam > now) {
                    setFormData(prev => ({ ...prev, jam: now }));
                    return;
                }

                setIsSearchingPersonil(true);
                try {
                    const url = `${API_BASE_URL}/api/shift/cari-personil?tanggal=${formData.tanggal}&jam=${formData.jam}`;
                    const res = await fetch(url);
                    const result = await res.json();

                    if (res.ok) {
                        setFormData(prev => ({
                            ...prev,
                            shift_id: result.data.shift_id || prev.shift_id,
                            nama_personil: result.data.nama || 'Tidak Ada Jadwal' 
                        }));
                    }
                } catch (err) { console.error(err); } 
                finally { setIsSearchingPersonil(false); }
            }
        };
        autoFillJadwal();
    }, [formData.tanggal, formData.jam]);

    // 4. Fetch Kendaraan
    useEffect(() => {
        const fetchKendaraan = async () => {
            if (!formData.transporter_id || !kegiatanData?.id) {
                setAvailableKendaraan([]);
                return;
            }
            setLoadingKendaraan(true);
            try {
                const url = `${API_BASE_URL}/api/kegiatan/truk-alokasi/${kegiatanData.id}/${formData.transporter_id}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableKendaraan(Array.isArray(data) ? data : []);
                }
            } catch (err) { setAvailableKendaraan([]); } 
            finally { setLoadingKendaraan(false); }
        };
        fetchKendaraan();
    }, [formData.transporter_id, kegiatanData]);

    // --- HANDLERS FOTO ---

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                alert("❌ Format file harus JPG, JPEG, atau PNG!");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert("❌ Ukuran foto terlalu besar (Max 5MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'truk') {
                    console.log('📸 New Foto Truk uploaded');
                    setPreviewTruk(reader.result);
                    setFormData(prev => ({ ...prev, foto_truk: reader.result }));
                    setKeepExistingTruk(false); // PENTING: Set false karena ada foto baru
                } else {
                    console.log('📸 New Foto Surat uploaded');
                    setPreviewSurat(reader.result);
                    setFormData(prev => ({ ...prev, foto_surat: reader.result }));
                    setKeepExistingSurat(false); // PENTING: Set false karena ada foto baru
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeFile = (type) => {
        if (type === 'truk') {
            console.log('🗑️ Removing Foto Truk');
            setPreviewTruk(null);
            setFormData(prev => ({ ...prev, foto_truk: null }));
            setKeepExistingTruk(false); // Don't keep existing
            if (fileInputTrukRef.current) fileInputTrukRef.current.value = '';
        } else {
            console.log('🗑️ Removing Foto Surat');
            setPreviewSurat(null);
            setFormData(prev => ({ ...prev, foto_surat: null }));
            setKeepExistingSurat(false);
            if (fileInputSuratRef.current) fileInputSuratRef.current.value = '';
        }
    };

    // --- SUBMIT ---

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validasi Data Utama
        if (!formData.transporter_id) return alert("❌ Pilih Transporter!");
        if (!formData.plat_nomor) return alert("❌ Isi Plat Nomor!");
        if (!formData.nama_personil || formData.nama_personil === 'Tidak Ada Jadwal') {
            return alert("❌ Jadwal Personil Kosong! Cek Jam/Tanggal.");
        }
        
        // Validasi Tanggal
        const today = getTodayDate();
        const now = getCurrentTime();
        if (formData.tanggal > today || (formData.tanggal === today && formData.jam > now)) {
            return alert("❌ Tanggal/Jam tidak boleh masa depan!");
        }

        console.log('🔍 Pre-submit State:', {
            foto_truk: formData.foto_truk ? 'Has data' : 'null',
            foto_surat: formData.foto_surat ? 'Has data' : 'null',
            keepExistingTruk,
            keepExistingSurat
        });

        setLoading(true);
        try {
            const payload = {
                kegiatan_id: kegiatanData.id,
                transporter_id: formData.transporter_id,
                no_polisi: formData.plat_nomor,
                nama_personil: formData.nama_personil,
                shift_id: formData.shift_id,
                tanggal: formData.tanggal,
                jam: formData.jam,
                no_seri_pengantar: formData.no_seri_pengantar || '-',
                keterangan: formData.keterangan,
                status: formData.status
            };

            let res;
            if (editMode && editData) {
                // EDIT MODE - PUT request
                
                // LOGIC PERBAIKAN: 
                // - Jika ada foto baru (formData.foto_*), kirim foto tersebut dan set keep=false
                // - Jika tidak ada foto baru, cek apakah keep existing atau hapus
                
                if (formData.foto_truk) {
                    // Ada foto baru
                    payload.foto_truk = formData.foto_truk;
                    payload.keep_existing_truk = false;
                    console.log('📤 Sending NEW foto truk');
                } else {
                    // Tidak ada foto baru, cek apakah user ingin keep atau hapus
                    payload.foto_truk = null;
                    payload.keep_existing_truk = keepExistingTruk;
                    console.log(`📤 Foto truk: ${keepExistingTruk ? 'KEEP existing' : 'REMOVE'}`);
                }

                if (formData.foto_surat) {
                    // Ada foto surat baru
                    payload.foto_surat = formData.foto_surat;
                    payload.keep_existing_surat = false;
                    console.log('📤 Sending NEW foto surat');
                } else {
                    // Tidak ada foto surat baru
                    payload.foto_surat = null;
                    payload.keep_existing_surat = keepExistingSurat;
                    console.log(`📤 Foto surat: ${keepExistingSurat ? 'KEEP existing' : 'REMOVE'}`);
                }

                console.log('📤 Sending Edit Payload:', {
                    ...payload,
                    foto_truk: payload.foto_truk ? 'Base64 Data' : null,
                    foto_surat: payload.foto_surat ? 'Base64 Data' : null,
                    keep_existing_truk: payload.keep_existing_truk,
                    keep_existing_surat: payload.keep_existing_surat
                });
                
                res = await fetch(`${API_BASE_URL}/api/keberangkatan/${editData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // CREATE MODE - POST request
                payload.foto_truk = formData.foto_truk;
                payload.foto_surat = formData.foto_surat;
                
                console.log('📤 Sending Create Payload:', {
                    ...payload,
                    foto_truk: payload.foto_truk ? 'Base64 Data' : null,
                    foto_surat: payload.foto_surat ? 'Base64 Data' : null
                });
                
                res = await fetch(`${API_BASE_URL}/api/keberangkatan/manual`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                const result = await res.json();
                console.log('✅ Server Response:', result);
                
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                const result = await res.json();
                console.error('❌ Server Error:', result);
                throw new Error(result.message || 'Gagal menyimpan data');
            }
        } catch (err) {
            console.error('❌ Submit Error:', err);
            alert(`❌ Gagal: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* SUCCESS MODAL */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                        <div className="w-48 h-48 bg-green-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <CheckCircle className="w-24 h-24 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">
                            {editMode ? 'Berhasil Diupdate' : 'Berhasil Disimpan'}
                        </h2>
                        <p className="text-green-600 font-semibold text-lg mb-6">
                            {editMode ? 'Data berhasil diperbarui!' : 'Data manual berhasil ditambahkan!'}
                        </p>
                    </div>
                </div>
            )}

            {/* MAIN MODAL */}
            <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
                        <h2 className="text-xl font-bold text-gray-800">
                            {editMode ? 'Edit Data Truk' : 'Input Data Manual'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" type="button">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form Scrollable */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Transporter */}
                            <InputGroup label="Transporter" required>
                                <select
                                    value={formData.transporter_id}
                                    onChange={(e) => setFormData({ ...formData, transporter_id: e.target.value, plat_nomor: '' })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm hover:bg-white"
                                    required
                                >
                                    <option value="">-- Pilih Transporter --</option>
                                    {transporterList?.map(t => (
                                        <option key={t.id || t.transporter_id} value={t.id || t.transporter_id}>
                                            {t.nama_transporter || t.nama}
                                        </option>
                                    ))}
                                </select>
                            </InputGroup>

                            {/* Plat Nomor */}
                            <InputGroup label="Plat Nomor" required>
                                <input
                                    list="manual-kendaraan-list"
                                    type="text"
                                    value={formData.plat_nomor}
                                    onChange={(e) => setFormData({ ...formData, plat_nomor: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm font-medium uppercase hover:bg-white"
                                    placeholder="Ketik plat nomor..."
                                    required
                                    disabled={!formData.transporter_id || loadingKendaraan}
                                />
                                <datalist id="manual-kendaraan-list">
                                    {availableKendaraan.map(k => <option key={k.id} value={k.plat_nomor} />)}
                                </datalist>
                            </InputGroup>

                            {/* Tanggal (Max Today) */}
                            <InputGroup label="Tanggal" required>
                                <input
                                    type="date"
                                    value={formData.tanggal}
                                    max={getTodayDate()} 
                                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm hover:bg-white"
                                    required
                                />
                            </InputGroup>

                            {/* Jam (Max Now if Today) */}
                            <InputGroup label="Jam" required>
                                <input
                                    type="time"
                                    value={formData.jam}
                                    max={maxTime} 
                                    onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm hover:bg-white"
                                    required
                                />
                            </InputGroup>

                            {/* Shift (Auto) */}
                            <InputGroup label="Shift (Otomatis)">
                                <select
                                    value={formData.shift_id}
                                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed appearance-none"
                                    disabled
                                >
                                    <option value="">-- Menunggu Waktu --</option>
                                    {availableShifts.map(s => <option key={s.id} value={s.id}>{s.nama_shift}</option>)}
                                </select>
                            </InputGroup>

                            {/* Personil (Auto) */}
                            <InputGroup label="Personil Bertugas">
                                <input
                                    type="text"
                                    value={isSearchingPersonil ? "Mencari..." : formData.nama_personil}
                                    readOnly
                                    className={`w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium cursor-not-allowed ${formData.nama_personil === 'Tidak Ada Jadwal' ? 'text-red-500 font-bold' : 'text-gray-500'}`}
                                    placeholder="Otomatis terisi..."
                                />
                            </InputGroup>
                        </div>

                        {/* No Seri */}
                        <InputGroup label="No Seri Pengantar">
                            <input
                                type="text"
                                value={formData.no_seri_pengantar}
                                onChange={(e) => setFormData({ ...formData, no_seri_pengantar: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm hover:bg-white"
                                placeholder="Masukkan nomor seri..."
                            />
                        </InputGroup>

                        {/* FOTO - Grid 2 Kolom */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* 1. Foto Truk (Opsional) */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Foto Truk (Opsional)
                                    {editMode && previewTruk && !formData.foto_truk && (
                                        <span className="ml-2 text-blue-600 text-[10px]">• Foto Existing</span>
                                    )}
                                </label>
                                {!previewTruk ? (
                                    <div 
                                        className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-4 text-center hover:border-red-400 hover:bg-white transition-all cursor-pointer group h-32 flex flex-col justify-center items-center"
                                        onClick={() => fileInputTrukRef.current.click()}
                                    >
                                        <input type="file" ref={fileInputTrukRef} className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleFileChange(e, 'truk')} />
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-red-50">
                                            <Camera className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                                        </div>
                                        <p className="text-xs font-medium text-gray-600">Upload Foto Truk</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-300 h-32">
                                        <img src={previewTruk} alt="Preview" className="w-full h-full object-contain bg-gray-100" />
                                        <button type="button" onClick={() => removeFile('truk')} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 2. Foto Surat (Opsional) */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Foto Surat (Opsional)
                                    {editMode && previewSurat && !formData.foto_surat && (
                                        <span className="ml-2 text-blue-600 text-[10px]">• Foto Existing</span>
                                    )}
                                </label>
                                {!previewSurat ? (
                                    <div 
                                        className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-4 text-center hover:border-red-400 hover:bg-white transition-all cursor-pointer group h-32 flex flex-col justify-center items-center"
                                        onClick={() => fileInputSuratRef.current.click()}
                                    >
                                        <input type="file" ref={fileInputSuratRef} className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleFileChange(e, 'surat')} />
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-red-50">
                                            <Camera className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                                        </div>
                                        <p className="text-xs font-medium text-gray-600">Upload Foto Surat</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-300 h-32">
                                        <img src={previewSurat} alt="Preview" className="w-full h-full object-contain bg-gray-100" />
                                        <button type="button" onClick={() => removeFile('surat')} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Keterangan */}
                        <InputGroup label="Keterangan" required>
                            <textarea
                                value={formData.keterangan}
                                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm min-h-[80px] hover:bg-white"
                                placeholder="Keterangan input manual..."
                                required
                            />
                        </InputGroup>

                        {/* Status Verifikasi */}
                        <div className="space-y-2 border-t pt-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Status Verifikasi <span className="text-red-500">*</span></label>
                            <div className="flex gap-4">
                                {['Valid', 'Tolak'].map(s => (
                                    <label key={s} className={`flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${formData.status === s ? (s === 'Valid' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value={s}
                                            checked={formData.status === s}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-4 h-4 accent-current"
                                        />
                                        <span className="text-sm font-bold">{s}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6 bg-white sticky bottom-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-70 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        {editMode ? <CheckCircle size={18} /> : <Plus size={18} />}
                                        {editMode ? 'Simpan Perubahan' : 'Simpan Data'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default ManualInputModal;