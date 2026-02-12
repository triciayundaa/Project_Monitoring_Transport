import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api'; // <--- IMPORT CONFIG

// Import gambar dari folder assets
import logoSemen from '../assets/logo-semen-padang.png';
import bgGudang from '../assets/TB.jpeg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State untuk show/hide password
    const [showSuccessModal, setShowSuccessModal] = useState(false); // State untuk pop-up sukses
    const [userName, setUserName] = useState(''); // State untuk menyimpan nama user buat pop-up
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Clear localStorage dulu untuk menghindari data lama
            localStorage.removeItem('user');
            
            // Memanggil API Backend GUNAKAN API_BASE_URL
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { 
                email, 
                password 
            });
            
            const userData = response.data.user;
            
            // Simpan data user ke localStorage
            localStorage.setItem('user', JSON.stringify(userData));
            
            // --- GABUNGAN LOGIKA DI SINI ---
            
            // 1. Set nama dan Tampilkan Modal Sukses (Fitur dari HEAD - Lebih Bagus)
            setUserName(userData.nama);
            setShowSuccessModal(true);

            // 2. Redirect Berdasarkan Role dengan Delay (Fitur dari Fathiya)
            setTimeout(() => {
                setShowSuccessModal(false); // Tutup modal

                const normalizedRole = String(userData.role || '').toLowerCase().trim();

                if (normalizedRole === 'admin') {
                    // Jika Admin -> Ke Dashboard
                    navigate('/dashboard', { replace: true });
                } else if (normalizedRole === 'personil') {
                    // Jika Personil -> Ke Halaman Truk (Sesuai kodingan Fathiya)
                    // Catatan: Pastikan route '/keberangkatan-truk' sudah ada di App.jsx
                    navigate('/keberangkatan-truk', { replace: true });
                } else if (normalizedRole === 'patroler') {
                    // 🔥 TAMBAHAN BARU: Jika Patroler -> Ke Halaman Patroli/Laporan
                    // Pastikan route '/laporan-patroli' atau '/patroli' sudah dibuat di App.jsx
                    navigate('/laporan-patroli', { replace: true });
                } else {
                    // Fallback jika role aneh
                    alert("Role tidak dikenali. Silakan hubungi admin.");
                    localStorage.removeItem('user');
                }
            }, 2000); // Delay 2 detik agar user sempat baca tulisan "Login Berhasil"

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Email atau Password Salah!");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* POP-UP SUKSES LOGIN */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-48 h-48 bg-red-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                            <i className="fas fa-check text-red-600 text-8xl font-black"></i>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 tracking-tighter">Login Berhasil</h2>
                        <p className="text-gray-500 font-medium">Selamat Datang, <span className="text-red-600 font-bold">{userName}</span></p>
                        <p className="text-xs text-gray-400 mt-4">Mengalihkan halaman...</p>
                    </div>
                </div>
            )}

            {/* SISI KIRI: FORM LOGIN */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-white shadow-xl z-10">
                <div className="mb-10">
                    <img src={logoSemen} alt="Logo Semen Padang" className="h-16 mb-6" />
                    <h1 className="text-3xl font-extrabold text-red-700 leading-tight">
                        Monitoring Pengelolaan Gudang <br /> Barang Curah
                    </h1>
                    <div className="h-1 w-20 bg-red-600 mt-4"></div>
                    <h2 className="text-2xl font-semibold text-gray-800 mt-6 text-center lg:text-left">Login</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Email Address</label>
                        <input 
                            type="email" 
                            placeholder="nama@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Masukkan password anda"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required
                            />
                            {/* IKON MATA */}
                            <button 
                                type="button" 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center text-gray-600 cursor-pointer">
                            <input type="checkbox" className="mr-2 accent-red-600 w-4 h-4" /> 
                            Remember Me
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-full shadow-lg transform hover:scale-[1.02] transition-all duration-300 uppercase tracking-wider"
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-10 text-center text-gray-500 text-sm">
                    &copy; 2026 PT Semen Padang. All Rights Reserved.
                </p>
            </div>

            {/* SISI KANAN: GAMBAR BACKGROUND */}
            <div 
                className="hidden lg:block lg:w-1/2 bg-cover bg-center relative" 
                style={{ backgroundImage: `url(${bgGudang})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-black/40"></div>
                <div className="absolute bottom-12 left-12 text-white">
                    <h3 className="text-4xl font-bold">Excellence in Quality</h3>
                    <p className="text-lg opacity-90">Membangun Negeri dengan Kebanggaan.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;