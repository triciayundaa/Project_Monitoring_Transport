import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const VehicleDetail = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [vehicles, setVehicles] = useState([]);
    const [transporterName, setTransporterName] = useState('');
    const [loading, setLoading] = useState(true);
    
    // State untuk Modal Tambah & Bulk Input
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false); 
    const [newNopol, setNewNopol] = useState('');
    const [tempNopolList, setTempNopolList] = useState([]); 

    // --- STATE UNTUK DELETE ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);

    // --- STATE BARU UNTUK EDIT ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ id: null, oldNopol: '', newNopol: '' });

    const { noPo } = useParams();
    const navigate = useNavigate();

    const fetchVehicleData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:3000/api/vehicles/${noPo}`);
            setVehicles(response.data.vehicles);
            setTransporterName(response.data.transporter);
        } catch (error) {
            console.error("Gagal mengambil detail kendaraan:", error);
        } finally {
            setLoading(false);
        }
    };

    const addTempNopol = () => {
        if (!newNopol) return;
        setTempNopolList([...tempNopolList, newNopol.toUpperCase()]);
        setNewNopol('');
    };

    const removeTempNopol = (index) => {
        setTempNopolList(tempNopolList.filter((_, i) => i !== index));
    };

    const saveAllVehicles = async () => {
        if (tempNopolList.length === 0) return;
        try {
            setLoading(true);
            await Promise.all(
                tempNopolList.map(nopol => 
                    axios.post('http://localhost:3000/api/vehicles/add', {
                        no_po: noPo,
                        nopol: nopol
                    })
                )
            );
            
            setTempNopolList([]);
            setIsModalOpen(false);
            setIsSuccessModalOpen(true); 
            fetchVehicleData();
        } catch (error) {
            alert("Gagal menyimpan beberapa kendaraan.");
        } finally {
            setLoading(false);
        }
    };

    // --- FUNGSI UNTUK DELETE ---
    const confirmDelete = (id) => {
        setSelectedVehicleId(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        try {
            setLoading(true);
            await axios.delete(`http://localhost:3000/api/vehicles/${selectedVehicleId}`);
            setIsDeleteModalOpen(false);
            fetchVehicleData();
        } catch (error) {
            alert("Gagal menghapus data");
        } finally {
            setLoading(false);
        }
    };

    // --- FUNGSI BARU UNTUK EDIT ---
    const openEditModal = (vehicle) => {
        setEditData({
            id: vehicle.id,
            oldNopol: vehicle.nopol,
            newNopol: ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateNopol = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Sesuaikan endpoint ini dengan backend Anda (biasanya PUT /api/vehicles/:id)
            await axios.put(`http://localhost:3000/api/vehicles/${editData.id}`, {
                nopol: editData.newNopol.toUpperCase()
            });
            setIsEditModalOpen(false);
            fetchVehicleData();
        } catch (error) {
            alert("Gagal memperbarui Nopol");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        confirmDelete(id);
    };

    useEffect(() => {
        fetchVehicleData();
    }, [noPo]);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Manajemen Kendaraan" />

                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-sm p-8 border border-gray-100">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-2xl font-black text-red-600 uppercase">
                                {transporterName || 'Loading...'}
                            </h3>
                            <div className="flex items-center">
                                <span className="font-bold text-gray-800 mr-4">No. PO</span>
                                <div className="bg-white border border-gray-200 shadow-inner px-12 py-2 rounded-lg font-bold text-gray-700">
                                    {noPo}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <button 
                                onClick={() => { setTempNopolList([]); setIsModalOpen(true); }}
                                className="bg-cyan-400 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors uppercase"
                            >
                                Tambah NOPOL
                            </button>
                        </div>

                        <div className="overflow-hidden border border-red-600 rounded-xl">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="border-b border-red-600 bg-red-50/30">
                                        <th className="py-3 px-4 text-red-600 font-black text-sm uppercase">No</th>
                                        <th className="py-3 px-4 text-red-600 font-black text-sm uppercase">Nopol</th>
                                        <th className="py-3 px-4 text-red-600 font-black text-sm uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && vehicles.length === 0 ? (
                                        <tr><td colSpan="3" className="py-4 italic text-gray-400">Memuat data...</td></tr>
                                    ) : vehicles.length > 0 ? (
                                        vehicles.map((v, index) => (
                                            <tr key={v.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 text-gray-600 text-sm font-medium">{index + 1}</td>
                                                <td className="py-4 text-gray-800 text-sm font-bold uppercase">{v.nopol}</td>
                                                <td className="py-4">
                                                    <div className="flex justify-center space-x-4">
                                                        {/* Icon Edit diaktifkan ke openEditModal */}
                                                        <i onClick={() => openEditModal(v)} className="far fa-edit text-xl text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"></i>
                                                        <i onClick={() => confirmDelete(v.id)} className="far fa-trash-alt text-xl text-red-500 cursor-pointer hover:text-red-700 transition-colors"></i>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="py-10 text-gray-400">Belum ada kendaraan terdaftar.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <button onClick={() => navigate(-1)} className="mt-8 text-black font-black text-xl hover:text-red-600 transition-colors flex items-center">
                            <i className="fas fa-chevron-left mr-2"></i> Back
                        </button>
                    </div>
                </main>
            </div>

            {/* MODAL INPUT NOPOL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-300">
                        <h3 className="text-3xl font-black text-red-600 text-center mb-8 uppercase tracking-tighter">
                            Tambah Daftar Nopol
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Transportir</label>
                                <input type="text" disabled className="w-full border-b-2 border-gray-300 py-2 bg-transparent outline-none font-bold text-gray-700" value={transporterName} />
                            </div>
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Nomor PO</label>
                                <input type="text" disabled className="w-full border-b-2 border-gray-300 py-2 bg-transparent outline-none font-bold text-gray-700" value={noPo} />
                            </div>
                            <div className="relative">
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Input Nopol Baru</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 border-b-2 border-gray-300 py-2 outline-none focus:border-red-600 font-bold uppercase placeholder:font-normal"
                                        placeholder="Ketik Nopol (Contoh: BA 1234 ABC)..."
                                        value={newNopol}
                                        onChange={(e) => setNewNopol(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addTempNopol()}
                                    />
                                    <button onClick={addTempNopol} className="bg-cyan-400 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-cyan-500 transition-colors">Add</button>
                                </div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
                                {tempNopolList.length === 0 ? (
                                    <p className="text-gray-400 text-center text-sm italic py-4">Belum ada nopol dalam daftar tunggu</p>
                                ) : (
                                    <div className="flex flex-col space-y-2">
                                        {tempNopolList.map((n, idx) => (
                                            <div key={idx} className="bg-white flex justify-between items-center px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 uppercase shadow-sm animate-in fade-in slide-in-from-bottom-1">
                                                <div className="flex items-center">
                                                    <span className="bg-red-50 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-3 font-black">{idx + 1}</span>
                                                    {n}
                                                </div>
                                                <button onClick={() => removeTempNopol(idx)} className="text-red-500 hover:text-red-700 transition-colors">
                                                    <i className="fas fa-times-circle text-lg"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-12">
                            <button onClick={() => setIsModalOpen(false)} className="text-black font-black text-xl hover:text-red-600 transition-colors uppercase flex items-center">
                                <i className="fas fa-chevron-left mr-2 text-sm"></i> Back
                            </button>
                            <button 
                                onClick={saveAllVehicles} 
                                disabled={tempNopolList.length === 0}
                                className={`px-16 py-3 rounded-2xl font-black text-white uppercase shadow-lg transition-all ${
                                    tempNopolList.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                }`}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL EDIT NOPOL (Sesuai Desain Gambar 130f49.png) --- */}
{isEditModalOpen && (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Edit NOPOL</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form onSubmit={handleUpdateNopol} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">NOPOL Lama</label>
                    <input 
                        type="text" 
                        disabled 
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 uppercase cursor-not-allowed" 
                        value={editData.oldNopol} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">NOPOL Baru</label>
                    <input 
                        type="text" 
                        required
                        placeholder="Input Nopol Baru..."
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-800 uppercase focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                        value={editData.newNopol} 
                        onChange={(e) => setEditData({...editData, newNopol: e.target.value})}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button 
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-6 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit"
                        // Tombol dinonaktifkan jika input kosong atau hanya spasi
                        disabled={!editData.newNopol.trim()} 
                        className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${
                            !editData.newNopol.trim() 
                            ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                            : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                        }`}
                    >
                        Simpan
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

            {/* SUCCESS POPUP */}
            {isSuccessModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center">
                        <div className="w-48 h-48 bg-red-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <i className="fas fa-check text-red-500 text-8xl font-black"></i>
                        </div>
                        <h2 className="text-2xl font-black text-red-600 uppercase mb-10 tracking-tighter">NOPOL Berhasil Ditambahkan</h2>
                        <button onClick={() => setIsSuccessModalOpen(false)} className="bg-red-600 text-white px-16 py-3 rounded-2xl font-black hover:bg-red-700 transition-all shadow-lg uppercase">
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI DELETE */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-2">Konfirmasi Hapus</h3>
                        <p className="text-gray-400 font-medium mb-8 text-sm px-4 text-center">
                            Apakah Anda yakin ingin menghapus nopol ini? Data yang sudah dihapus tidak dapat dikembalikan.
                        </p>
                        <div className="flex w-full space-x-4">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-3 rounded-2xl font-black text-gray-400 hover:text-gray-600 uppercase transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={executeDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase shadow-lg shadow-red-200 transition-all"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleDetail;