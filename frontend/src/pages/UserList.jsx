import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const UserList = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalType, setModalType] = useState(null); 
    const [selectedUser, setSelectedUser] = useState(null);
    
    // State untuk visibilitas password
    const [showNewPassword, setShowNewPassword] = useState(false);
    
    // Inisialisasi state form
    const [formData, setFormData] = useState({ nama: '', email: '', no_telp: '', password: '', role: '' });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openAddModal = () => {
        // Memastikan data kosong saat tambah akun
        setFormData({ nama: '', email: '', no_telp: '', password: '', role: '' });
        setShowNewPassword(false);
        setModalType('add');
    };

    const openEditModal = (user) => {
        setFormData({ 
            nama: user.nama, 
            email: user.email, 
            no_telp: user.no_telp, 
            role: user.role, 
            password: '' // Kosongkan password baru saat mulai edit
        });
        setSelectedUser(user);
        setShowNewPassword(false);
        setModalType('edit');
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setModalType('delete');
    };

    const handleAction = async (e) => {
        if (e) e.preventDefault();
        try {
            if (modalType === 'add') {
                await axios.post('http://localhost:3000/api/users/add', formData);
            } else if (modalType === 'edit') {
                await axios.put(`http://localhost:3000/api/users/${selectedUser.email}`, formData);
            } else if (modalType === 'delete') {
                await axios.delete(`http://localhost:3000/api/users/${selectedUser.email}`);
            }
            setModalType('success');
            fetchUsers();
        } catch (error) {
            alert("Terjadi kesalahan: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Manajemen Pengguna" />
                
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-end mb-6 gap-4">
                            <button onClick={openAddModal} className="bg-cyan-400 hover:bg-cyan-500 text-white px-8 py-2 rounded-2xl font-bold shadow-lg transition-all uppercase text-sm">
                                Tambah Akun
                            </button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-red-50/50 text-red-600">
                                        <th className="p-5 font-black uppercase text-sm">NO</th>
                                        <th className="p-5 font-black uppercase text-sm">Name</th>
                                        <th className="p-5 font-black uppercase text-sm">Email</th>
                                        <th className="p-5 font-black uppercase text-sm">No. Telepon</th>
                                        <th className="p-5 font-black uppercase text-sm">Role</th>
                                        <th className="p-5 text-center font-black uppercase text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, index) => (
                                        <tr key={user.email} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-5 text-gray-600 font-medium">{index + 1}</td>
                                            <td className="p-5 text-gray-800 font-bold">{user.nama}</td>
                                            <td className="p-5 text-blue-600 underline font-medium">{user.email}</td>
                                            <td className="p-5 text-gray-700 font-medium">{user.no_telp || '-'}</td>
                                            <td className="p-5"><span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold uppercase text-gray-500">{user.role}</span></td>
                                            <td className="p-5">
                                                <div className="flex justify-center space-x-3">
                                                    <button onClick={() => openEditModal(user)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-1.5 rounded-xl text-xs font-bold shadow-md uppercase">Edit</button>
                                                    <button onClick={() => openDeleteModal(user)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-1.5 rounded-xl text-xs font-bold shadow-md uppercase">Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* MODAL TAMBAH / EDIT */}
            {(modalType === 'add' || modalType === 'edit') && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-3xl font-black text-red-600 text-center mb-8 uppercase tracking-tighter">
                            {modalType === 'add' ? 'Tambah Akun' : 'Edit Akun'}
                        </h3>
                        <form onSubmit={handleAction} className="grid grid-cols-1 gap-4" autoComplete="off">
                            {/* Input Nama & Email */}
                            {['nama', 'email'].map((field) => (
                                <div key={field}>
                                    <label className="block text-red-600 font-bold mb-1 uppercase text-xs">{field}</label>
                                    <input 
                                        type={field === 'email' ? 'email' : 'text'}
                                        required
                                        autoComplete="off"
                                        placeholder={`Masukkan ${field}...`}
                                        className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white"
                                        value={formData[field]}
                                        onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                                    />
                                </div>
                            ))}

                            {/* Input No Telp dengan Validasi Angka & Max 15 digit */}
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">No. Telepon</label>
                                <input 
                                    type="text"
                                    required
                                    autoComplete="off"
                                    placeholder="Contoh: 08123456789"
                                    className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white"
                                    value={formData.no_telp}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || (/^\d+$/.test(val) && val.length <= 15)) {
                                            setFormData({...formData, no_telp: val});
                                        }
                                    }}
                                />
                            </div>

                            {/* Password Baru dengan Validasi Pattern */}
                            <div className="relative">
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">
                                    {modalType === 'edit' ? 'Password Baru' : 'Password'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showNewPassword ? "text" : "password"}
                                        required={modalType === 'add'}
                                        pattern="^(?=.*[A-Z]).{12,}$"
                                        title="Minimal 12 karakter dengan 1 huruf kapital"
                                        placeholder={modalType === 'edit' ? "Kosongkan jika tidak diubah" : "Minimal 12 Karakter & 1 Huruf Kapital"}
                                        autoComplete="new-password"
                                        className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white pr-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600">
                                        <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Role</label>
                                <select required className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-transparent" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                                    <option value="">Pilih Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="personil">Personil</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between mt-10">
                                <button type="button" onClick={() => setModalType(null)} className="text-black font-black text-xl hover:text-red-600 transition-colors uppercase">Back</button>
                                <button type="submit" className="bg-cyan-400 text-white px-16 py-3 rounded-2xl font-black uppercase shadow-lg hover:bg-cyan-500">{modalType === 'add' ? 'Tambahkan' : 'Update'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Delete & Success */}
            {modalType === 'delete' && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
                            <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 uppercase mb-2">Konfirmasi Hapus</h3>
                        <p className="text-gray-400 font-medium mb-8 text-sm px-4">Hapus user <b>{selectedUser?.nama}</b>? Data tidak dapat dikembalikan.</p>
                        <div className="flex space-x-4">
                            <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-2xl font-black text-gray-400 hover:text-gray-600 uppercase">Batal</button>
                            <button onClick={handleAction} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase shadow-lg shadow-red-200">Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {modalType === 'success' && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center">
                        <div className="w-48 h-48 bg-red-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <i className="fas fa-check text-red-500 text-8xl font-black"></i>
                        </div>
                        <h2 className="text-2xl font-black text-red-600 uppercase mb-10 tracking-tighter">Data Berhasil Update</h2>
                        <button onClick={() => setModalType(null)} className="bg-red-600 text-white px-16 py-3 rounded-2xl font-black hover:bg-red-700 shadow-lg uppercase">OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;