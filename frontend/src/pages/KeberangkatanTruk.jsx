import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const KeberangkatanTruk = () => {
    const [user, setUser] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [truckDepartures, setTruckDepartures] = useState([]);
    const navigate = useNavigate();

    // Modal states
    const [showModalPO, setShowModalPO] = useState(false);
    const [showModalForm, setShowModalForm] = useState(false);
    const [showModalError, setShowModalError] = useState(false);
    const [showModalDetail, setShowModalDetail] = useState(false);
    const [showModalSuccess, setShowModalSuccess] = useState(false);
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

    useEffect(() => {
        // Ambil data user dari localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            // Jika tidak ada user, redirect ke login
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        // Load data keberangkatan berdasarkan tanggal
        loadKeberangkatanData();
    }, [selectedDate]);

    const loadKeberangkatanData = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/keberangkatan/list?tanggal=${selectedDate}`);
            if (response.data.status === 'Success') {
                setTruckDepartures(response.data.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleInputDataBaru = () => {
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
            console.log('=== FRONTEND: Cek PO ===');
            console.log('Input noPO (raw):', noPO);
            console.log('Input noPO (trimmed):', noPOTrimmed);
            
            const response = await axios.post('http://localhost:3000/api/keberangkatan/cek-po', {
                no_po: noPOTrimmed
            });

            console.log('Response:', response.data);
            
            if (response.data.status === 'Success') {
                setPoData(response.data.data);
                setShowModalPO(false);
                setShowModalForm(true);
            }
        } catch (error) {
            console.error('Error cek PO:', error);
            console.error('Error response:', error.response?.data);
            
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
            // Request akses ke camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Camera belakang untuk mobile
            });

            // Buat video element untuk preview camera
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.maxHeight = '400px';
            video.style.objectFit = 'cover';

            // Buat modal untuk preview camera
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4';
            modal.setAttribute('style', 'z-index: 9999;');
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-4 max-w-md w-full">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Ambil Foto</h3>
                    <div id="camera-preview" class="mb-4 rounded-lg overflow-hidden bg-black flex items-center justify-center" style="min-height: 300px;"></div>
                    <div class="flex gap-3">
                        <button id="capture-btn" type="button" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
                            Ambil Foto
                        </button>
                        <button id="cancel-btn" type="button" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
                            Batal
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const previewDiv = modal.querySelector('#camera-preview');
            previewDiv.appendChild(video);

            // Buat canvas untuk capture foto
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Setup canvas size
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            });

            // Handle capture
            modal.querySelector('#capture-btn').addEventListener('click', () => {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                
                // Stop camera stream
                stream.getTracks().forEach(track => track.stop());
                
                // Update form data
                setFormData(prev => ({
                    ...prev,
                    [field]: imageData
                }));

                // Remove modal
                document.body.removeChild(modal);
            });

            // Handle cancel
            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                // Stop camera stream
                stream.getTracks().forEach(track => track.stop());
                // Remove modal
                document.body.removeChild(modal);
            });

        } catch (error) {
            console.error('Error accessing camera:', error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert('Akses camera ditolak. Silakan izinkan akses camera di pengaturan browser.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                alert('Camera tidak ditemukan. Pastikan device memiliki camera.');
            } else {
                alert('Terjadi kesalahan saat mengakses camera: ' + error.message);
            }
        }
    };

    const handleSimpan = async () => {
        if (!formData.no_polisi.trim()) {
            alert('Masukkan nomor polisi');
            return;
        }
        if (!formData.no_seri_pengantar.trim()) {
            alert('Masukkan nomor seri pengantar');
            return;
        }
        if (!formData.foto_truk) {
            alert('Ambil foto truk terlebih dahulu');
            return;
        }
        if (!formData.foto_surat) {
            alert('Ambil foto surat pengantar terlebih dahulu');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3000/api/keberangkatan/simpan', {
                kegiatan_id: poData.id,
                no_polisi: formData.no_polisi.trim(),
                email_user: user.email,
                shift_id: 1, // Default shift 1, bisa diambil dari jadwal_shift
                tanggal: selectedDate,
                no_seri_pengantar: formData.no_seri_pengantar.trim(),
                foto_truk: formData.foto_truk,
                foto_surat: formData.foto_surat
            });

            if (response.data.status === 'Success') {
                setShowModalForm(false);
                setFormData({
                    no_polisi: '',
                    no_seri_pengantar: '',
                    foto_truk: null,
                    foto_surat: null
                });
                setShowModalSuccess(true);
                loadKeberangkatanData();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
        } finally {
            setLoading(false);
        }
    };

    const handleLihatDetail = (truck) => {
        setSelectedDetail(truck);
        setShowModalDetail(true);
    };

    const handleHapus = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
        try {
            const response = await axios.delete(`http://localhost:3000/api/keberangkatan/hapus/${id}`);
            if (response.data.status === 'Success') {
                setTruckDepartures(prev => prev.filter(item => item.id !== id));
            } else {
                alert(response.data.message || 'Gagal menghapus data');
            }
        } catch (error) {
            console.error('Error menghapus data:', error);
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menghapus data');
        }
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'numeric', 
            year: 'numeric' 
        });
    };

    const formatTimeForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        }) + ' WIB';
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header Bar Merah - Sticky agar selalu terlihat di atas */}
            <header className="sticky top-0 z-40 bg-red-600 text-white px-4 py-3 md:px-6 md:py-4 shadow-lg">
                <div className="flex items-center justify-end space-x-4 md:space-x-6">
                    <div className="flex items-center space-x-2 md:space-x-3">
                        <span className="text-sm md:text-base font-semibold">Nama Personil</span>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        {user && (
                            <span className="text-sm md:text-base font-medium hidden sm:inline">
                                {user.nama}
                            </span>
                        )}
                    </div>
                    <div className="text-sm md:text-base font-semibold">
                        Shift 1
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 max-w-7xl mx-auto">
                {/* Title */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-600 text-center mb-6 md:mb-8">
                    Keberangkatan Truk
                </h1>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                    {/* Date Dropdown */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <label className="text-sm md:text-base font-semibold text-gray-700 whitespace-nowrap">
                            Tanggal:
                        </label>
                        <div className="relative flex-1 sm:flex-initial">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm md:text-base"
                            />
                        </div>
                    </div>

                    {/* Input Data Baru Button */}
                    <button
                        onClick={handleInputDataBaru}
                        className="w-full sm:w-auto bg-blue-400 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 md:px-8 md:py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
                    >
                        Input Data Baru
                    </button>
                </div>

                {/* Truck Departure Cards */}
                <div className="space-y-4 md:space-y-6">
                    {truckDepartures.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">Tidak ada data keberangkatan truk</p>
                        </div>
                    ) : (
                        truckDepartures.map((truck) => (
                            <div
                                key={truck.id}
                                className="border-2 border-red-500 rounded-lg p-4 md:p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-red-600">
                                        {truck.nama_vendor || 'N/A'}
                                    </h2>
                                    <span className="text-sm md:text-base text-gray-600 font-medium">
                                        {formatDateForDisplay(truck.tanggal)}
                                    </span>
                                </div>

                                {/* Card Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                                    <div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-1">Nomor Polisi</p>
                                        <p className="text-sm md:text-base font-semibold text-gray-800">
                                            {truck.plat_nomor || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-1">Jam berangkat</p>
                                        <p className="text-sm md:text-base font-semibold text-gray-800">
                                            {formatTimeForDisplay(truck.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    <button
                                        onClick={() => handleLihatDetail(truck)}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 md:py-3 px-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
                                    >
                                        Lihat Detail
                                    </button>
                                    <button
                                        onClick={() => handleHapus(truck.id)}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 md:py-3 px-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal Input PO */}
            {showModalPO && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-md w-full">
                        <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-6">
                            Masukkan Nomor PO
                        </h2>
                        <input
                            type="text"
                            value={noPO}
                            onChange={(e) => setNoPO(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCekPO()}
                            placeholder="Masukkan nomor PO"
                            className="w-full px-4 py-3 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-base mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModalPO(false)}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                            >
                                Kembali
                            </button>
                            <button
                                onClick={handleCekPO}
                                disabled={loading}
                                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Mencari...' : 'Selanjutnya'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Form Input Data */}
            {showModalForm && poData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-2xl w-full my-8">
                        <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-6">
                            Input Data Keberangkatan Truk
                        </h2>
                        
                        <div className="space-y-4">
                            {/* Personil (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Personil</label>
                                <input
                                    type="text"
                                    value={user?.nama || ''}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Shift (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Shift</label>
                                <input
                                    type="text"
                                    value="Shift 1"
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor Polisi (Input) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor Polisi</label>
                                <input
                                    type="text"
                                    value={formData.no_polisi}
                                    onChange={(e) => setFormData(prev => ({ ...prev, no_polisi: e.target.value }))}
                                    placeholder="Masukkan nomor polisi"
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            {/* Tanggal (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Tanggal</label>
                                <input
                                    type="text"
                                    value={formatDateForDisplay(selectedDate)}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor Seri Pengantar (Input) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor Seri Pengantar</label>
                                <input
                                    type="text"
                                    value={formData.no_seri_pengantar}
                                    onChange={(e) => setFormData(prev => ({ ...prev, no_seri_pengantar: e.target.value }))}
                                    placeholder="Masukkan nomor seri pengantar"
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            {/* Foto Truk */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Truk</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleCapturePhoto('foto_truk')}
                                        className="flex-1 px-4 py-2.5 border-2 border-red-500 rounded-lg text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>{formData.foto_truk ? 'Foto sudah diambil' : 'Silahkan Ambil Foto Truk'}</span>
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                                {formData.foto_truk && (
                                    <div className="mt-2">
                                        <img src={formData.foto_truk} alt="Foto Truk" className="w-full h-48 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, foto_truk: null }))}
                                            className="mt-2 text-sm text-red-600 hover:text-red-700"
                                        >
                                            Hapus Foto
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Foto Surat Pengantar */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Surat Pengantar</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleCapturePhoto('foto_surat')}
                                        className="flex-1 px-4 py-2.5 border-2 border-red-500 rounded-lg text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>{formData.foto_surat ? 'Foto sudah diambil' : 'Silahkan Ambil Foto Surat Pengantar'}</span>
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                                {formData.foto_surat && (
                                    <div className="mt-2">
                                        <img src={formData.foto_surat} alt="Foto Surat Pengantar" className="w-full h-48 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, foto_surat: null }))}
                                            className="mt-2 text-sm text-red-600 hover:text-red-700"
                                        >
                                            Hapus Foto
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowModalForm(false);
                                    setPoData(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                            >
                                Kembali
                            </button>
                            <button
                                onClick={handleSimpan}
                                disabled={loading}
                                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Error PO Tidak Ditemukan */}
            {showModalError && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-md w-full text-center">
                        <div className="mb-4">
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-red-600">
                                Nomor PO Tidak Ditemukan
                            </h2>
                        </div>
                        <button
                            onClick={() => {
                                setShowModalError(false);
                                setNoPO('');
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors"
                        >
                            Oke
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Detail Keberangkatan Truk */}
            {showModalDetail && selectedDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 overflow-y-auto">
                    <div className="min-h-full flex items-start justify-center py-8">
                        <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-2xl w-full my-auto">
                            <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-6">
                                Detail Keberangkatan Truk
                            </h2>
                        
                        <div className="space-y-4">
                            {/* Transportir (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Transportir</label>
                                <input
                                    type="text"
                                    value={selectedDetail.transporter || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor PO (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor PO</label>
                                <input
                                    type="text"
                                    value={selectedDetail.no_po || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Material (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Material</label>
                                <input
                                    type="text"
                                    value={selectedDetail.material || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor Kapal (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor Kapal</label>
                                <input
                                    type="text"
                                    value={selectedDetail.nama_kapal || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Personil (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Personil</label>
                                <input
                                    type="text"
                                    value={selectedDetail.nama_personil || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Shift (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Shift</label>
                                <input
                                    type="text"
                                    value={selectedDetail.nama_shift || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor Polisi (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor Polisi</label>
                                <input
                                    type="text"
                                    value={selectedDetail.plat_nomor || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Tanggal (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Tanggal</label>
                                <input
                                    type="text"
                                    value={formatDateForDisplay(selectedDetail.tanggal)}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Nomor Seri Pengantar (Read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Nomor Seri Pengantar</label>
                                <input
                                    type="text"
                                    value={selectedDetail.no_seri_pengantar || 'N/A'}
                                    disabled
                                    className="w-full px-4 py-2.5 border-2 border-red-500 rounded-lg bg-gray-100 text-gray-600"
                                />
                            </div>

                            {/* Foto Truk */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Truk</label>
                                <div className="border-2 border-red-500 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-gray-50">
                                    {selectedDetail.foto_truk ? (
                                        <img 
                                            src={selectedDetail.foto_truk} 
                                            alt="Foto Truk" 
                                            className="max-w-full max-h-64 object-contain rounded-lg"
                                        />
                                    ) : (
                                        <span className="text-red-600 font-semibold">Image</span>
                                    )}
                                </div>
                            </div>

                            {/* Foto Surat Pengantar */}
                            <div>
                                <label className="block text-sm font-semibold text-red-600 mb-2">Foto Surat Pengantar</label>
                                <div className="border-2 border-red-500 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-gray-50">
                                    {selectedDetail.foto_surat ? (
                                        <img 
                                            src={selectedDetail.foto_surat} 
                                            alt="Foto Surat Pengantar" 
                                            className="max-w-full max-h-64 object-contain rounded-lg"
                                        />
                                    ) : (
                                        <span className="text-red-600 font-semibold">Image</span>
                                    )}
                                </div>
                            </div>
                        </div>

                            <div className="flex justify-start mt-6">
                                <button
                                    onClick={() => {
                                        setShowModalDetail(false);
                                        setSelectedDetail(null);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                                >
                                    Kembali
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Success Data Berhasil Disimpan */}
            {showModalSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 max-w-md w-full text-center">
                        <div className="mb-4">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-red-600">
                                Data Berhasil Disimpan
                            </h2>
                        </div>
                        <button
                            onClick={() => {
                                setShowModalSuccess(false);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors"
                        >
                            Oke
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeberangkatanTruk;
