import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

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
            
            if (data.transporters && data.transporters.length > 0) {
                setTransporters(data.transporters);
            }
        }
    }, [mode, data]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTransporterChange = (index, value) => {
        const newTransporters = [...transporters];
        newTransporters[index] = value;
        setTransporters(newTransporters);
    };

    const addTransporterField = () => {
        setTransporters([...transporters, '']);
    };

    const removeTransporterField = (index) => {
        const newTransporters = transporters.filter((_, i) => i !== index);
        setTransporters(newTransporters.length > 0 ? newTransporters : ['']);
    };

    const handleSubmit = async () => {
        setLoading(true);

        if (formData.tanggal_mulai && formData.tanggal_selesai) {
            if (formData.tanggal_selesai < formData.tanggal_mulai) {
                alert("Tanggal Selesai tidak boleh kurang dari Tanggal Mulai!");
                setLoading(false);
                return;
            }
        }

        const url = mode === 'add' 
            ? 'http://localhost:3000/api/kegiatan' 
            : `http://localhost:3000/api/kegiatan/${data.old_no_po || data.no_po}`;
        
        const method = mode === 'add' ? 'POST' : 'PUT';

        const payload = {
            ...formData,
            nama_vendor: formData.vendor,
            transporters: transporters.filter(t => t.trim() !== '')
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
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const hasRunningTransporter = mode === 'edit' && data.hasRunningTransporter;

    return (
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup 
                            label="Nomor PO" 
                            name="no_po" 
                            value={formData.no_po} 
                            onChange={handleChange} 
                            required 
                            disabled={hasRunningTransporter} 
                            placeholder={hasRunningTransporter ? "Tidak bisa diedit (Sedang Berjalan)" : "Masukkan No PO"}
                        />

                        <InputGroup 
                            label="Nama Vendor" 
                            name="vendor" 
                            value={formData.vendor} 
                            onChange={handleChange} 
                            required 
                        />
                        
                        <InputGroup 
                            label="Nama Kapal" 
                            name="nama_kapal" 
                            value={formData.nama_kapal} 
                            onChange={handleChange} 
                        />
                        
                        <InputGroup 
                            label="Incoterm" 
                            name="incoterm" 
                            value={formData.incoterm} 
                            onChange={handleChange} 
                        />
                        
                        <InputGroup 
                            label="Nomor BL" 
                            name="no_bl" 
                            value={formData.no_bl} 
                            onChange={handleChange} 
                        />

                        <InputGroup 
                            label="Quantity (ton)" 
                            name="quantity" 
                            type="number"
                            value={formData.quantity !== '' ? parseFloat(formData.quantity) : ''}
                            onChange={handleChange} 
                            min={0}          
                            step={0.01}      
                        />
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

                        {transporters.map((transporter, index) => (
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
                                
                                {transporters.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTransporterField(index)}
                                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup 
                            label="Tanggal Mulai" 
                            name="tanggal_mulai" 
                            type="date" 
                            value={formData.tanggal_mulai} 
                            onChange={handleChange} 
                            disabled={hasRunningTransporter} 
                        />
                        
                        <InputGroup 
                            label="Tanggal Selesai" 
                            name="tanggal_selesai" 
                            type="date" 
                            value={formData.tanggal_selesai} 
                            onChange={handleChange} 
                            min={formData.tanggal_mulai} 
                        />
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