import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TambahKegiatan = ({ onClose, onSuccess, mode = 'add', data = {} }) => {
    // State Form
    const [formData, setFormData] = useState({
        no_po: '',
        vendor: '',
        transporter: '',
        nama_kapal: '',
        material: '',
        incoterm: '',
        no_bl: '',
        quantity: '',
        total_truk: '', 
        tanggal_mulai: '',
        tanggal_selesai: ''
    });

    const [loading, setLoading] = useState(false);

    // Load Data jika Mode Edit
    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                no_po: data.no_po || '',
                vendor: data.vendor || '',
                transporter: data.transporter || '',
                nama_kapal: data.nama_kapal || '',
                material: data.material || '',
                incoterm: data.incoterm || '',
                no_bl: data.no_bl || '',
                quantity: data.quantity || '',
                total_truk: data.total_truk || '',
                tanggal_mulai: data.tanggal_mulai ? data.tanggal_mulai.split('T')[0] : '',
                tanggal_selesai: data.tanggal_selesai ? data.tanggal_selesai.split('T')[0] : ''
            });
        }
    }, [mode, data]);

    // Handle Change Input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // --- VALIDASI TANGGAL (LOGIC) ---
        // Jika Tanggal Selesai lebih kecil dari Tanggal Mulai, hentikan proses.
        if (formData.tanggal_mulai && formData.tanggal_selesai) {
            if (formData.tanggal_selesai < formData.tanggal_mulai) {
                alert("Tanggal Selesai tidak boleh kurang dari Tanggal Mulai!");
                setLoading(false);
                return; // Stop function di sini
            }
        }

        const url = mode === 'add' 
            ? 'http://localhost:3000/api/kegiatan' 
            : `http://localhost:3000/api/kegiatan/${data.old_no_po || data.no_po}`;
        
        const method = mode === 'add' ? 'POST' : 'PUT';

        // Normalisasi Data
        const payload = {
            ...formData,
            nama_vendor: formData.vendor,
            total_truk: 0 // Default 0 karena input dihapus
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

            alert(mode === 'add' ? 'Kegiatan berhasil ditambahkan!' : 'Kegiatan berhasil diperbarui!');
            onSuccess(); // Refresh Data di Parent
            onClose();   // Tutup Modal
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Logika Kunci Input (No PO & Tanggal Mulai terkunci jika sudah berjalan)
    const isPoLocked = mode === 'edit' && (data.status === 'On Progress' || data.status === 'Completed');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'add' ? 'Tambah Kegiatan Baru' : 'Edit PO'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* NO PO (LOCKED CONDITION) */}
                        <InputGroup 
                            label="Nomor PO" 
                            name="no_po" 
                            value={formData.no_po} 
                            onChange={handleChange} 
                            required 
                            disabled={isPoLocked} 
                            placeholder={isPoLocked ? "Tidak bisa diedit (Sedang Berjalan)" : "Masukkan No PO"}
                        />

                        <InputGroup label="Nama Vendor" name="vendor" value={formData.vendor} onChange={handleChange} required />
                        
                        <InputGroup label="Transporter" name="transporter" value={formData.transporter} onChange={handleChange} />
                        <InputGroup label="Nama Kapal" name="nama_kapal" value={formData.nama_kapal} onChange={handleChange} />
                        
                        <InputGroup label="Incoterm" name="incoterm" value={formData.incoterm} onChange={handleChange} />
                        <InputGroup label="Nomor BL" name="no_bl" value={formData.no_bl} onChange={handleChange} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Material</label>
                        <textarea 
                            name="material"
                            value={formData.material}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm min-h-[80px]"
                            placeholder="Deskripsi Material..."
                        ></textarea>
                    </div>

                    {/* Quantity */}
                    <div className="grid grid-cols-1">
                        <InputGroup label="Quantity (ton)" name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TANGGAL MULAI */}
                        <InputGroup 
                            label="Tanggal Mulai" 
                            name="tanggal_mulai" 
                            type="date" 
                            value={formData.tanggal_mulai} 
                            onChange={handleChange} 
                            disabled={isPoLocked} 
                        />
                        
                        {/* TANGGAL SELESAI (VALIDASI UI) */}
                        {/* Atribut 'min' mencegah user memilih tanggal mundur di kalender */}
                        <InputGroup 
                            label="Tanggal Selesai" 
                            name="tanggal_selesai" 
                            type="date" 
                            value={formData.tanggal_selesai} 
                            onChange={handleChange} 
                            min={formData.tanggal_mulai} 
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
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
                                mode === 'add' ? 'Simpan' : 'Update'
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// Komponen Input Sederhana (Updated dengan spread props)
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
            // Spread sisa props ke sini agar atribut seperti 'min', 'max', dll berfungsi
            {...props} 
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm 
                ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}
        />
    </div>
);

export default TambahKegiatan;