import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API_BASE_URL from '../../config/api';

const VehicleDetail = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [vehicles, setVehicles] = useState([]);
    const [transporterName, setTransporterName] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false); 
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [newNopol, setNewNopol] = useState('');
    const [tempNopolList, setTempNopolList] = useState([]); 

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ id: null, oldNopol: '', newNopol: '' });

    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [masterAssets, setMasterAssets] = useState([]);
    const [selectedMasterIds, setSelectedMasterIds] = useState([]);

    const { noPo, transporterId } = useParams();
    const navigate = useNavigate();

    const [transporterList, setTransporterList] = useState([]);
    const [selectedTransporterId, setSelectedTransporterId] = useState(transporterId || 'all');

    const formatNopol = (value) => {
        return value.toUpperCase(); 
    };

    const fetchVehicleData = async () => {
        if (!noPo) return;
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/vehicles/${noPo}`, {
                params: { transporter_id: selectedTransporterId }
            });
            if (response.data) {
                setVehicles(response.data.vehicles.map(v => ({
                    ...v,
                    nopol: v.plat_nomor 
                })));
                if (selectedTransporterId === 'all') {
                    setTransporterName("Semua Transporter");
                } else {
                    const current = response.data.transporters.find(t => t.transporter_id == selectedTransporterId);
                    setTransporterName(current ? current.nama_transporter : "Transporter");
                }
            }
        } catch (error) {
            console.error("Gagal mengambil detail kendaraan:", error);
            setErrorMessage("Gagal memuat data detail kendaraan.");
            setIsErrorModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransportersByPo = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/kegiatan/${noPo}/transporters`);
            setTransporterList(res.data); 
            if (selectedTransporterId === 'all' && transporterId) {
                setSelectedTransporterId(transporterId);
            }
        } catch (err) {
            console.error("Gagal fetch transporter:", err);
        }
    };

    const fetchMasterAssets = async () => {
        const finalId = (selectedTransporterId && selectedTransporterId !== 'all') ? selectedTransporterId : transporterId;
        if (!finalId || finalId === 'all') {
            alert("Pilih Transporter spesifik untuk melihat katalog.");
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vehicles/master/${finalId}`);
            setMasterAssets(res.data);
            setIsMasterModalOpen(true);
        } catch (err) {
            console.error("Fetch Master Error:", err);
        }
    };

    const addTempNopol = () => {
        if (!newNopol.trim()) return;
        setTempNopolList([...tempNopolList, newNopol.toUpperCase().trim()]);
        setNewNopol('');
    };

    const removeTempNopol = (index) => {
        setTempNopolList(tempNopolList.filter((_, i) => i !== index));
    };

    const saveAllVehicles = async () => {
        if (tempNopolList.length === 0) return;
        const finalId = (selectedTransporterId && selectedTransporterId !== 'all') ? selectedTransporterId : transporterId;
        try {
            setLoading(true);
            await Promise.all(
                tempNopolList.map(nopol => 
                    axios.post(`${API_BASE_URL}/api/vehicles/add`, {
                        no_po: noPo,
                        nopol: nopol,
                        transporter_id: finalId 
                    })
                )
            );
            setTempNopolList([]);
            setIsModalOpen(false);
            setIsSuccessModalOpen(true); 
            fetchVehicleData();
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Gagal menyimpan kendaraan.");
            setIsErrorModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const saveFromMaster = async () => {
        if (selectedMasterIds.length === 0) return;
        const finalId = (selectedTransporterId && selectedTransporterId !== 'all') ? selectedTransporterId : transporterId;
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/vehicles/assign-master`, {
                no_po: noPo,
                transporter_id: finalId,
                vehicle_ids: selectedMasterIds
            });
            setIsMasterModalOpen(false);
            setSelectedMasterIds([]);
            setIsSuccessModalOpen(true);
            fetchVehicleData();
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Gagal alokasi dari katalog.");
            setIsErrorModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id) => {
        setSelectedVehicleId(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        try {
            setLoading(true);
            await axios.delete(`${API_BASE_URL}/api/vehicles/${selectedVehicleId}`);
            setIsDeleteModalOpen(false);
            fetchVehicleData();
        } catch (error) {
            const msg = error.response?.data?.message || "";
            setIsDeleteModalOpen(false);
            if (msg.includes("foreign key")) {
                setErrorMessage("Data tidak dapat dihapus karena unit kendaraan ini sudah memiliki riwayat transaksi keberangkatan pada NO PO ini.");
            } else {
                setErrorMessage("Gagal menghapus data.");
            }
            setIsErrorModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (vehicle) => {
        setEditData({ id: vehicle.id, oldNopol: vehicle.nopol, newNopol: '' });
        setIsEditModalOpen(true);
    };

    const handleUpdateNopol = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.put(`${API_BASE_URL}/api/vehicles/${editData.id}`, {
                nopol: editData.newNopol.toUpperCase().trim()
            });
            setIsEditModalOpen(false);
            fetchVehicleData();
        } catch (error) {
            setErrorMessage("Gagal memperbarui Nopol.");
            setIsErrorModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransportersByPo(); }, [noPo]);
    useEffect(() => { fetchVehicleData(); }, [noPo, selectedTransporterId]);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Manajemen Kendaraan" />
                
                <main className="flex-grow p-3 md:p-6 overflow-y-auto">
                    <div className="max-w-5xl mx-auto bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm p-4 md:p-8 border border-gray-100">
                        
                        {/* Header Section - Responsive */}
                        <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6 md:mb-8">
                            <div className="flex-1">
                                <h3 className="text-xl md:text-2xl font-black text-red-600 uppercase break-words">{transporterName || 'Loading...'}</h3>
                                {transporterList.length > 0 && (
                                    <select value={selectedTransporterId} onChange={(e) => setSelectedTransporterId(e.target.value)}
                                            className="mt-3 w-full md:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg font-bold text-sm focus:ring-2 focus:ring-red-500 outline-none">
                                        <option value="all">Semua Transporter</option>
                                        {transporterList.map(t => (<option key={t.transporter_id} value={t.transporter_id}>{t.nama_transporter}</option>))}
                                    </select>
                                )}
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-2">
                                <span className="font-bold text-gray-800 uppercase text-xs whitespace-nowrap">No. PO</span>
                                <div className="bg-white border border-gray-200 shadow-inner px-4 md:px-12 py-2 rounded-xl font-bold text-gray-700 text-sm">{noPo}</div>
                            </div>
                        </div>

                        {/* Button Actions - Responsive Stack on Mobile */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <button onClick={() => { setTempNopolList([]); setIsModalOpen(true); }}
                                className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors uppercase">
                                + Tambah Baru
                            </button>
                            <button onClick={fetchMasterAssets} disabled={selectedTransporterId === 'all'}
                                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors uppercase border ${selectedTransporterId === 'all' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                                <i className="fas fa-list-ul mr-2"></i> Pilih dari Katalog
                            </button>
                        </div>

                        {/* Table - Horizontal Scroll on Mobile */}
                        <div className="overflow-x-auto border border-red-600 rounded-xl -mx-4 md:mx-0">
                            <div className="px-4 md:px-0">
                                <table className="w-full text-center border-collapse min-w-[300px]">
                                    <thead>
                                        <tr className="border-b border-red-600 bg-red-50/30">
                                            <th className="py-2.5 md:py-3 px-2 md:px-4 text-red-600 font-black text-xs md:text-sm uppercase">No</th>
                                            <th className="py-2.5 md:py-3 px-2 md:px-4 text-red-600 font-black text-xs md:text-sm uppercase whitespace-nowrap">No. Polisi</th>
                                            <th className="py-2.5 md:py-3 px-2 md:px-4 text-red-600 font-black text-xs md:text-sm uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && vehicles.length === 0 ? (
                                            <tr><td colSpan="3" className="py-4 italic text-gray-400 text-xs md:text-sm">Memuat data...</td></tr>
                                        ) : vehicles.length > 0 ? (
                                            vehicles.map((v, index) => (
                                                <tr key={v.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 md:py-4 px-2 text-gray-600 text-xs md:text-sm font-medium">{index + 1}</td>
                                                    <td className="py-3 md:py-4 px-2 text-gray-800 text-sm md:text-base font-bold uppercase">{v.nopol}</td>
                                                    <td className="py-3 md:py-4 px-2">
                                                        <div className="flex justify-center space-x-3 md:space-x-4">
                                                            <i onClick={() => openEditModal(v)} className="far fa-edit text-lg md:text-xl text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"></i>
                                                            <i onClick={() => confirmDelete(v.id)} className="far fa-trash-alt text-lg md:text-xl text-red-500 cursor-pointer hover:text-red-700 transition-colors"></i>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="3" className="py-6 md:py-10 text-gray-400 font-bold uppercase text-[10px] md:text-xs text-center italic px-4">Belum ada kendaraan terdaftar untuk PO ini.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Back Button */}
                        <div className="text-left mt-6 md:mt-8">
                             <button onClick={() => navigate(-1)} className="text-black font-black text-base md:text-xl hover:text-red-600 transition-colors flex items-center">
                                <i className="fas fa-chevron-left mr-2 text-sm md:text-base"></i> Back
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* MODALS - Keep desktop styling, adjust for mobile */}
            
            {/* MODAL PILIH DARI KATALOG MASTER */}
            {isMasterModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl md:text-2xl font-black text-gray-800 text-center mb-4 md:mb-6 uppercase tracking-tighter">Katalog Asset {transporterName}</h3>
                        <p className="text-gray-500 text-xs md:text-sm mb-4 text-center px-2">Pilih nopol yang sudah terdaftar untuk dialokasikan ke NO PO {noPo}</p>
                        <div className="max-h-[250px] md:max-h-[300px] overflow-y-auto space-y-2 mb-6 md:mb-8 pr-2">
                            {masterAssets.length > 0 ? masterAssets.map((asset) => (
                                <label key={asset.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-200 cursor-pointer hover:bg-red-50 transition-colors group">
                                    <span className="font-bold text-sm md:text-base text-gray-700 group-hover:text-red-600">{asset.plat_nomor}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-red-600" 
                                        onChange={(e) => {
                                            if(e.target.checked) setSelectedMasterIds([...selectedMasterIds, asset.id]);
                                            else setSelectedMasterIds(selectedMasterIds.filter(id => id !== asset.id));
                                        }}
                                    />
                                </label>
                            )) : <p className="text-center py-10 text-gray-400 italic text-sm">Belum ada asset terdaftar di katalog transporter ini.</p>}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => setIsMasterModalOpen(false)} className="font-bold text-sm text-gray-500 hover:text-red-600 uppercase">Batal</button>
                            <button onClick={saveFromMaster} disabled={selectedMasterIds.length === 0}
                                className={`px-6 md:px-10 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-sm font-black text-white uppercase shadow-lg transition-all ${selectedMasterIds.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                                Tambahkan ({selectedMasterIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL INPUT NOPOL BARU */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl md:text-3xl font-black text-red-600 text-center mb-6 md:mb-8 uppercase tracking-tighter">Tambah Nopol Baru</h3>
                        <div className="space-y-4 md:space-y-6">
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Transportir</label>
                                <input type="text" disabled className="w-full border-b-2 border-gray-300 py-2 bg-transparent outline-none font-bold text-gray-700 text-sm" value={transporterName} />
                            </div>
                            <div className="relative">
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Input No. Polisi Baru</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input type="text" className="flex-1 border-b-2 border-gray-300 py-2 outline-none focus:border-red-600 font-bold uppercase text-sm"
                                        placeholder="Contoh: B 1234 ABC" value={newNopol}
                                        onChange={(e) => setNewNopol(formatNopol(e.target.value))}
                                        onKeyPress={(e) => e.key === 'Enter' && addTempNopol()}
                                    />
                                    <button onClick={addTempNopol} className="bg-cyan-400 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-cyan-500 transition-colors">Add</button>
                                </div>
                            </div>
                            <div className="max-h-[150px] md:max-h-[200px] overflow-y-auto bg-gray-50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-100 shadow-inner">
                                {tempNopolList.map((n, idx) => (
                                    <div key={idx} className="bg-white flex justify-between items-center px-3 md:px-5 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-800 uppercase shadow-sm mb-2">
                                        <div className="flex items-center">
                                            <span className="bg-red-50 text-red-600 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[9px] md:text-[10px] mr-2 md:mr-3 font-black">{idx + 1}</span>
                                            {n}
                                        </div>
                                        <button onClick={() => removeTempNopol(idx)} className="text-red-500 hover:text-red-700 transition-colors"><i className="fas fa-times-circle text-base md:text-lg"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-8 md:mt-12 gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="text-black font-black text-base md:text-xl hover:text-red-600 transition-colors uppercase order-2 sm:order-1">Batal</button>
                            <button onClick={saveAllVehicles} disabled={tempNopolList.length === 0}
                                className={`w-full sm:w-auto px-12 md:px-16 py-3 rounded-xl md:rounded-2xl font-black text-white uppercase shadow-lg transition-all order-1 sm:order-2 ${tempNopolList.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT NOPOL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative text-left">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg md:text-xl font-bold text-gray-800">Edit Katalog Asset</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-lg md:text-xl"></i></button>
                        </div>
                        <form onSubmit={handleUpdateNopol} className="space-y-5 md:space-y-6">
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">NO.Polisi Lama</label>
                                <input type="text" disabled className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-100 border border-gray-200 rounded-xl font-bold text-sm text-gray-500 uppercase cursor-not-allowed" value={editData.oldNopol} />
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">No. Polisi Baru</label>
                                <input type="text" required placeholder="Input Nopol Baru..." className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-800 uppercase focus:ring-2 focus:ring-red-500 outline-none transition-all" value={editData.newNopol} onChange={(e) => setEditData({...editData, newNopol: formatNopol(e.target.value)})} />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 md:px-6 py-2 md:py-2.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors">Batal</button>
                                <button type="submit" disabled={!editData.newNopol.trim()} className={`px-6 md:px-8 py-2 md:py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${!editData.newNopol.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL SUCCESS & ERROR - Keep existing modals */}
            {isSuccessModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm text-center">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl flex flex-col items-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 bg-red-100 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-inner"><i className="fas fa-check text-red-500 text-5xl md:text-8xl font-black"></i></div>
                        <h2 className="text-xl md:text-2xl font-black text-red-600 uppercase mb-6 md:mb-10 tracking-tighter text-center">Berhasil dilakukan</h2>
                        <button onClick={() => setIsSuccessModalOpen(false)} className="bg-red-600 text-white px-12 md:px-16 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black hover:bg-red-700 shadow-lg uppercase transition-all text-sm md:text-base">OK</button>
                    </div>
                </div>
            )}
            {isErrorModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm text-center">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl flex flex-col items-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 bg-red-50 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-inner"><i className="fas fa-exclamation-circle text-red-600 text-5xl md:text-8xl font-black"></i></div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase mb-4 tracking-tighter text-center">Pemberitahuan</h2>
                        <p className="text-gray-500 font-bold mb-8 md:mb-10 px-4 leading-relaxed text-sm md:text-base">{errorMessage}</p>
                        <button onClick={() => setIsErrorModalOpen(false)} className="bg-gray-800 text-white px-12 md:px-16 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black hover:bg-gray-900 shadow-lg uppercase transition-all text-sm md:text-base">Tutup</button>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI DELETE */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm text-center">
                    <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl flex flex-col items-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-inner"><i className="fas fa-exclamation-triangle text-red-500 text-2xl md:text-3xl"></i></div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-800 uppercase mb-2 tracking-tighter text-center">Konfirmasi Hapus</h3>
                        <p className="text-gray-400 font-medium mb-6 md:mb-8 text-xs md:text-sm px-4 text-center">Apakah Anda yakin ingin melepas kendaraan ini dari daftar alokasi PO {noPo}? Data di katalog master tetap tersimpan.</p>
                        <div className="flex w-full flex-col sm:flex-row gap-3 sm:space-x-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 uppercase transition-colors order-2 sm:order-1">Batal</button>
                            <button onClick={executeDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-sm uppercase shadow-lg shadow-red-200 transition-all order-1 sm:order-2">Lepas</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleDetail;