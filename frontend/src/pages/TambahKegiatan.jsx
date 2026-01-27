import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

// Modern Modal Component
const Modal = ({ isOpen, onClose, type = 'success', title, message }) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="w-24 h-24 text-green-600" />,
        error: <XCircle className="w-24 h-24 text-red-600" />,
        warning: <AlertCircle className="w-24 h-24 text-yellow-600" />
    };

    const bgColors = {
        success: 'bg-green-50',
        error: 'bg-red-50',
        warning: 'bg-yellow-50'
    };

    const textColors = {
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600'
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className={`w-48 h-48 ${bgColors[type]} rounded-full flex items-center justify-center mb-8 shadow-inner`}>
                    {icons[type]}
                </div>
                <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 tracking-tight">{title}</h2>
                <p className={`${textColors[type]} font-semibold text-lg mb-6`}>{message}</p>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 uppercase tracking-wider"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

const TambahKegiatan = ({ onClose, onSuccess, mode = 'add', data = {} }) => {
    const [formData, setFormData] = useState({
        no_po: '',
        vendor: '',
        nama_kapal: '',
        material: '',
        incoterm: '',
        no_bl: '',
        quantity: '',
        tanggal_mulai: '',
        tanggal_selesai: ''
    });

    const [transporters, setTransporters] = useState(['']);
    const [availableTransporters, setAvailableTransporters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    
    // State untuk validasi edit
    const [earliestTruckDate, setEarliestTruckDate] = useState(null);
    const [minStartDate, setMinStartDate] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [transportersMetadata, setTransportersMetadata] = useState([]); // Store full metadata

    const showModal = (type, title, message) => {
        setModal({ isOpen: true, type, title, message });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: 'success', title: '', message: '' });
    };

    useEffect(() => {
        fetchTransporters();
    }, []);

    const fetchTransporters = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/kegiatan/transporters');
            const data = await res.json();
            setAvailableTransporters(data);
        } catch (error) {
            console.error('Error fetching transporters:', error);
        }
    };

    useEffect(() => {
        if (mode === 'edit' && data) {
            setIsEditMode(true);
            
            setFormData({
                no_po: data.no_po || '',
                vendor: data.vendor || '',
                nama_kapal: data.nama_kapal || '',
                material: data.material || '',
                incoterm: data.incoterm || '',
                no_bl: data.no_bl || '',
                quantity: data.quantity || '',
                tanggal_mulai: data.tanggal_mulai ? data.tanggal_mulai.split('T')[0] : '',
                tanggal_selesai: data.tanggal_selesai ? data.tanggal_selesai.split('T')[0] : ''
            });
            
            // ✅ Simpan metadata lengkap termasuk kegiatan_transporter_id
            if (data.transportersMetadata && data.transportersMetadata.length > 0) {
                setTransportersMetadata(data.transportersMetadata);
                setTransporters(data.transportersMetadata.map(t => t.nama));
            } else if (data.transporters && data.transporters.length > 0) {
                // Fallback jika hanya ada nama
                setTransporters(data.transporters);
                setTransportersMetadata(data.transporters.map(name => ({ nama: name })));
            }

            // Set earliest truck date untuk validasi tanggal mulai
            if (data.earliestTruckDate) {
                const earliestDate = new Date(data.earliestTruckDate);
                setEarliestTruckDate(earliestDate);
                
                // Format untuk input date (YYYY-MM-DD)
                const year = earliestDate.getFullYear();
                const month = String(earliestDate.getMonth() + 1).padStart(2, '0');
                const day = String(earliestDate.getDate()).padStart(2, '0');
                setMinStartDate(`${year}-${month}-${day}`);
            }
        }
    }, [mode, data]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Validasi khusus untuk tanggal_mulai di mode edit
        if (name === 'tanggal_mulai' && isEditMode && earliestTruckDate) {
            const selectedDate = new Date(value);
            if (selectedDate > earliestTruckDate) {
                showModal(
                    'warning',
                    'Tanggal Tidak Valid',
                    `Tanggal mulai tidak boleh melebihi ${earliestTruckDate.toLocaleDateString('id-ID')} (tanggal truk pertama masuk)`
                );
                return;
            }
        }
        
        setFormData({ ...formData, [name]: value });
    };

    const handleTransporterChange = (index, value) => {
        const newTransporters = [...transporters];
        newTransporters[index] = value;
        setTransporters(newTransporters);

        // Update metadata juga
        const newMetadata = [...transportersMetadata];
        if (newMetadata[index]) {
            newMetadata[index] = {
                ...newMetadata[index],
                nama: value
            };
        } else {
            newMetadata[index] = { nama: value };
        }
        setTransportersMetadata(newMetadata);
    };

    const addTransporterField = () => {
        setTransporters([...transporters, '']);
        setTransportersMetadata([...transportersMetadata, { nama: '' }]);
    };

    // Cek apakah transporter bisa dihapus
    const canRemoveTransporter = (index) => {
        if (mode === 'add') {
            return transporters.length > 1; // Di mode add, bisa hapus jika > 1
        }
        
        // Di mode edit:
        // - Hanya bisa hapus jika status = Waiting (belum ada truk)
        const metadata = transportersMetadata[index];
        if (!metadata) return false;

        // Jika tidak ada status atau status = Waiting, bisa dihapus
        const status = metadata.status || 'Waiting';
        const jumlahTruk = metadata.jumlah_truk || 0;
        
        return status === 'Waiting' && jumlahTruk === 0;
    };

    const removeTransporterField = (index) => {
        if (!canRemoveTransporter(index)) {
            const metadata = transportersMetadata[index];
            const status = metadata?.status || 'Waiting';
            const jumlahTruk = metadata?.jumlah_truk || 0;
            
            if (status !== 'Waiting' || jumlahTruk > 0) {
                showModal(
                    'warning',
                    'Tidak Dapat Menghapus',
                    `Transporter ini sudah memiliki ${jumlahTruk} truk atau status ${status}. Anda hanya bisa mengganti namanya.`
                );
            } else {
                showModal(
                    'warning',
                    'Tidak Dapat Menghapus',
                    'Minimal harus ada 1 transporter.'
                );
            }
            return;
        }
        
        const newTransporters = transporters.filter((_, i) => i !== index);
        const newMetadata = transportersMetadata.filter((_, i) => i !== index);
        
        setTransporters(newTransporters.length > 0 ? newTransporters : ['']);
        setTransportersMetadata(newMetadata.length > 0 ? newMetadata : [{ nama: '' }]);
    };

    const handleSubmit = async () => {
        // Validasi form - semua field wajib diisi untuk mode add
        if (mode === 'add') {
            const requiredFields = {
                'no_po': 'Nomor PO',
                'vendor': 'Nama Vendor',
                'nama_kapal': 'Nama Kapal',
                'material': 'Material',
                'incoterm': 'Incoterm',
                'no_bl': 'Nomor BL',
                'quantity': 'Quantity',
                'tanggal_mulai': 'Tanggal Mulai',
                'tanggal_selesai': 'Tanggal Selesai'
            };

            const emptyFields = [];
            for (const [key, label] of Object.entries(requiredFields)) {
                if (!formData[key] || formData[key].toString().trim() === '') {
                    emptyFields.push(label);
                }
            }

            if (emptyFields.length > 0) {
                showModal('warning', 'Data Tidak Lengkap', `Field berikut wajib diisi: ${emptyFields.join(', ')}`);
                return;
            }
        } else {
            // Validasi minimal untuk mode edit
            if (!formData.no_po || !formData.vendor) {
                showModal('warning', 'Data Tidak Lengkap', 'Nomor PO dan Vendor wajib diisi!');
                return;
            }
        }

        // Validasi transporter
        const validTransporters = transporters.filter(t => t.trim() !== '');
        if (validTransporters.length === 0) {
            showModal('warning', 'Data Tidak Lengkap', 'Minimal harus ada 1 transporter!');
            return;
        }

        setLoading(true);

        // Validasi tanggal
        if (formData.tanggal_mulai && formData.tanggal_selesai) {
            if (formData.tanggal_selesai < formData.tanggal_mulai) {
                showModal('warning', 'Tanggal Tidak Valid', 'Tanggal Selesai tidak boleh kurang dari Tanggal Mulai!');
                setLoading(false);
                return;
            }
        }

        // Validasi khusus untuk edit: cek tanggal mulai vs truk pertama
        if (mode === 'edit' && earliestTruckDate && formData.tanggal_mulai) {
            const selectedStartDate = new Date(formData.tanggal_mulai);
            if (selectedStartDate > earliestTruckDate) {
                showModal(
                    'warning',
                    'Tanggal Tidak Valid',
                    `Tanggal mulai tidak boleh melebihi ${earliestTruckDate.toLocaleDateString('id-ID')} (tanggal truk pertama masuk)`
                );
                setLoading(false);
                return;
            }
        }

        const url = mode === 'add' 
            ? 'http://localhost:3000/api/kegiatan' 
            : `http://localhost:3000/api/kegiatan/${data.old_no_po || data.no_po}`;
        
        const method = mode === 'add' ? 'POST' : 'PUT';

        // ✅ Prepare transporters dengan metadata untuk edit
        let transportersPayload;
        if (mode === 'edit') {
            // Kirim dengan format yang include kegiatan_transporter_id
            transportersPayload = transportersMetadata
                .filter((meta, idx) => transporters[idx]?.trim() !== '')
                .map((meta, idx) => ({
                    kegiatan_transporter_id: meta.kegiatan_transporter_id, // Bisa undefined untuk transporter baru
                    nama: transporters[idx].trim()
                }));
        } else {
            // Mode add, kirim array nama saja
            transportersPayload = validTransporters;
        }

        const payload = {
            ...formData,
            nama_vendor: formData.vendor,
            transporters: transportersPayload
        };

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || 'Gagal menyimpan data');
            }

            showModal(
                'success',
                mode === 'add' ? 'Berhasil Ditambahkan' : 'Berhasil Diperbarui',
                mode === 'add' 
                    ? 'Kegiatan berhasil ditambahkan ke sistem!' 
                    : 'Data kegiatan berhasil diperbarui!'
            );
            
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
            
        } catch (error) {
            console.error(error);
            showModal('error', 'Gagal Menyimpan', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal 
                isOpen={modal.isOpen}
                onClose={closeModal}
                type={modal.type}
                title={modal.title}
                message={modal.message}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
                    
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">
                            {mode === 'add' ? 'Tambah Kegiatan Baru' : 'Edit PO'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        
                        {/* Info Box jika ada earliest truck date */}
                        {isEditMode && earliestTruckDate && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold text-blue-900">Informasi Edit</p>
                                    <p className="text-blue-700">
                                        Tanggal mulai kegiatan tidak boleh melebihi <strong>{earliestTruckDate.toLocaleDateString('id-ID')}</strong> (tanggal truk pertama masuk).
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup 
                                label="Nomor PO" 
                                name="no_po" 
                                value={formData.no_po} 
                                onChange={handleChange} 
                                required 
                                placeholder="Masukkan No PO"
                            />

                            <InputGroup 
                                label="Nama Vendor" 
                                name="vendor" 
                                value={formData.vendor} 
                                onChange={handleChange} 
                                required 
                                placeholder="Masukkan Nama Vendor"
                            />
                            
                            <InputGroup 
                                label="Nama Kapal" 
                                name="nama_kapal" 
                                value={formData.nama_kapal} 
                                onChange={handleChange} 
                                required
                                placeholder="Masukkan Nama Kapal"
                            />
                            
                            <InputGroup 
                                label="Incoterm" 
                                name="incoterm" 
                                value={formData.incoterm} 
                                onChange={handleChange} 
                                required
                                placeholder="Masukkan Incoterm"
                            />
                            
                            <InputGroup 
                                label="Nomor BL" 
                                name="no_bl" 
                                value={formData.no_bl} 
                                onChange={handleChange} 
                                required
                                placeholder="Masukkan Nomor BL"
                            />

                            <InputGroup 
                                label="Quantity (ton)" 
                                name="quantity" 
                                type="number"
                                value={formData.quantity !== '' ? parseFloat(formData.quantity) : ''}
                                onChange={handleChange} 
                                required
                                min={0}          
                                step={0.01}
                                placeholder="Masukkan Quantity"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">
                                Material <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                                name="material"
                                value={formData.material}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm min-h-[80px]"
                                placeholder="Deskripsi Material..."
                            ></textarea>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Transporter <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addTransporterField}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Tambah Transporter
                                </button>
                            </div>

                            {transporters.map((transporter, index) => {
                                const canDelete = canRemoveTransporter(index);
                                
                                return (
                                    <div key={index} className="flex gap-2 items-center">
                                        <div className="flex-1 relative">
                                            <input
                                                list={`transporters-${index}`}
                                                type="text"
                                                value={transporter}
                                                onChange={(e) => handleTransporterChange(index, e.target.value)}
                                                placeholder="Ketik atau pilih dari daftar..."
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                            />
                                            <datalist id={`transporters-${index}`}>
                                                {availableTransporters.map(t => (
                                                    <option key={t.id} value={t.nama_transporter} />
                                                ))}
                                            </datalist>
                                        </div>
                                        
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => removeTransporterField(index)}
                                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus transporter"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Tanggal Mulai <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    name="tanggal_mulai"
                                    value={formData.tanggal_mulai} 
                                    onChange={handleChange}
                                    required
                                    max={minStartDate || undefined}
                                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm bg-gray-50 border-gray-200 hover:bg-white"
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Tanggal Selesai <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    name="tanggal_selesai"
                                    value={formData.tanggal_selesai} 
                                    onChange={handleChange}
                                    required
                                    min={formData.tanggal_mulai}
                                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm bg-gray-50 border-gray-200 hover:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-70 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Menyimpan...
                                    </>
                                ) : (
                                    mode === 'add' ? 'Simpan' : 'Update'
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

const InputGroup = ({ label, name, type = "text", value, onChange, required, disabled, placeholder, ...props }) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input 
            type={type} 
            name={name}
            value={value} 
            onChange={onChange} 
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            {...props} 
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm 
                ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}
        />
    </div>
);

export default TambahKegiatan;