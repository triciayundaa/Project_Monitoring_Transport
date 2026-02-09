import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import API_BASE_URL from '../config/api';

const UserList = () => {
    // State sidebar konsisten dengan halaman lain - TIDAK ada auto-close
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalType, setModalType] = useState(null); 
    const [selectedUser, setSelectedUser] = useState(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    
    const [formData, setFormData] = useState({ nama: '', email: '', no_telp: '', password: '', role: '' });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/users`);
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openAddModal = () => {
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
            password: '' 
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
                await axios.post(`${API_BASE_URL}/api/users/add`, formData);
            } else if (modalType === 'edit') {
                await axios.put(`${API_BASE_URL}/api/users/${selectedUser.email}`, formData);
            } else if (modalType === 'delete') {
                await axios.delete(`${API_BASE_URL}/api/users/${selectedUser.email}`);
            }
            setModalType('success');
            fetchUsers();
        } catch (error) {
            alert("Terjadi kesalahan: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* SIDEBAR - Struktur sama seperti halaman lain */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} title="Manajemen Pengguna" />
                
                <main className="flex-grow p-4 md:p-6 overflow-y-auto w-full">
                    <div className="max-w-7xl mx-auto w-full">
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div className="w-full sm:w-auto"></div>
                            <button onClick={openAddModal} className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all uppercase text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-plus"></i> Tambah Akun
                            </button>
                        </div>

                        {/* MOBILE VIEW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                            {users.map((user) => (
                                <div key={user.email} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-bold text-gray-800 text-lg truncate">{user.nama}</h3>
                                            <p className="text-xs text-gray-500 break-words">{user.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 
                                            ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 
                                              user.role === 'patroler' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-600 text-sm gap-2 bg-gray-50 p-2 rounded-lg mt-1">
                                        <i className="fas fa-phone text-gray-400"></i>
                                        <span>{user.no_telp || '-'}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                                        <button onClick={() => openEditModal(user)} className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-2 rounded-lg font-bold text-sm transition-colors">Edit</button>
                                        <button onClick={() => openDeleteModal(user)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg font-bold text-sm transition-colors">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP VIEW */}
                        <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden w-full">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-red-50/50 text-red-600">
                                            <th className="p-5 font-black uppercase text-sm whitespace-nowrap">NO</th>
                                            <th className="p-5 font-black uppercase text-sm whitespace-nowrap">Name</th>
                                            <th className="p-5 font-black uppercase text-sm whitespace-nowrap">Email</th>
                                            <th className="p-5 font-black uppercase text-sm whitespace-nowrap">No. Telepon</th>
                                            <th className="p-5 font-black uppercase text-sm whitespace-nowrap">Role</th>
                                            <th className="p-5 text-center font-black uppercase text-sm whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user, index) => (
                                            <tr key={user.email} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="p-5 text-gray-600 font-medium">{index + 1}</td>
                                                <td className="p-5 text-gray-800 font-bold whitespace-nowrap">{user.nama}</td>
                                                <td className="p-5 text-blue-600 underline font-medium">{user.email}</td>
                                                <td className="p-5 text-gray-700 font-medium whitespace-nowrap">{user.no_telp || '-'}</td>
                                                <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{user.role}</span></td>
                                                <td className="p-5">
                                                    <div className="flex justify-center space-x-3">
                                                        <button onClick={() => openEditModal(user)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow uppercase">Edit</button>
                                                        <button onClick={() => openDeleteModal(user)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow uppercase">Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {users.length === 0 && !loading && (
                            <div className="text-center py-12 text-gray-400">Belum ada data pengguna.</div>
                        )}
                    </div>
                </main>
            </div>

            {/* MODAL ADD / EDIT */}
            {(modalType === 'add' || modalType === 'edit') && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-black text-red-600 text-center mb-6 uppercase tracking-tighter">
                            {modalType === 'add' ? 'Tambah Akun' : 'Edit Akun'}
                        </h3>
                        <form onSubmit={handleAction} className="grid grid-cols-1 gap-4" autoComplete="off">
                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Nama</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Masukkan nama..."
                                    className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Email</label>
                                <input 
                                    type="email"
                                    required
                                    autoComplete="off"
                                    disabled={modalType === 'edit'} 
                                    placeholder="Masukkan email..."
                                    className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white disabled:text-gray-400"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">No. Telepon</label>
                                <input 
                                    type="text"
                                    required
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

                            <div className="relative">
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">
                                    {modalType === 'edit' ? 'Password Baru (Opsional)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showNewPassword ? "text" : "password"}
                                        required={modalType === 'add'}
                                        autoComplete="new-password" 
                                        placeholder={modalType === 'edit' ? "Biarkan kosong jika tidak ubah" : "Min. 12 Karakter dengan salah satu Huruf Kapital"}
                                        className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-white pr-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600">
                                        <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-red-600 font-bold mb-1 uppercase text-xs">Role</label>
                                <select 
                                    required 
                                    className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-red-600 font-bold text-gray-700 bg-transparent" 
                                    value={formData.role} 
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="">Pilih Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="personil">Personil</option>
                                    <option value="patroler">Patroler</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between mt-6 gap-4">
                                <button type="button" onClick={() => setModalType(null)} className="text-gray-500 font-bold text-sm hover:text-red-600 transition-colors uppercase">Batal</button>
                                <button type="submit" className="bg-cyan-400 text-white px-6 py-3 rounded-xl font-bold uppercase shadow-lg hover:bg-cyan-500 flex-1">{modalType === 'add' ? 'Tambahkan' : 'Update'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Delete */}
            {modalType === 'delete' && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase mb-2">Hapus Akun?</h3>
                        <p className="text-gray-500 mb-6 text-sm">Yakin hapus <b>{selectedUser?.nama}</b>?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setModalType(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200">Batal</button>
                            <button onClick={handleAction} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold shadow-lg">Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Success */}
            {modalType === 'success' && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-check text-green-500 text-4xl"></i>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 uppercase mb-6">Berhasil!</h2>
                        <button onClick={() => setModalType(null)} className="bg-green-500 text-white w-full py-3 rounded-xl font-bold hover:bg-green-600 shadow-lg">OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;