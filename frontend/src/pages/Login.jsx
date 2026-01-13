import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import gambar dari folder assets
import logoSemen from '../assets/logo-semen-padang.png';
import bgGudang from '../assets/bg-gudang.jpeg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Clear localStorage dulu untuk menghindari data lama
            localStorage.removeItem('user');
            
            // Memanggil API Backend
            const response = await axios.post('http://localhost:3000/api/auth/login', { 
                email, 
                password 
            });
            
            // Simpan data user ke localStorage
            const userData = response.data.user;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Ambil role dari response
            const userRole = userData.role;
            
            // Debug: Log untuk melihat data yang diterima
            console.log('=== DEBUG LOGIN ===');
            console.log('Full response:', response.data);
            console.log('User object:', userData);
            console.log('Role (raw):', userRole);
            console.log('Role type:', typeof userRole);
            console.log('===================');
            
            // Normalize role untuk pengecekan (case-insensitive, trim spasi)
            const normalizedRole = String(userRole || '').toLowerCase().trim();
            
            // Redirect berdasarkan role - WAJIB sesuai dengan role
            if (normalizedRole === 'admin') {
                console.log('✅ Admin detected - Redirecting to /dashboard');
                alert("Selamat Datang " + userData.nama);
                navigate('/dashboard', { replace: true });
            } else if (normalizedRole === 'personil') {
                console.log('✅ Personil detected - Redirecting to /keberangkatan-truk');
                alert("Selamat Datang " + userData.nama);
                navigate('/keberangkatan-truk', { replace: true });
            } else {
                // Fallback jika role tidak dikenali
                console.error('❌ Role tidak dikenali!', {
                    original: userRole,
                    normalized: normalizedRole,
                    type: typeof userRole,
                    fullUser: userData
                });
                localStorage.removeItem('user'); // Clear jika role tidak valid
                alert(`Role tidak dikenali: "${userRole}". Silakan hubungi administrator.\n\nPastikan role di database adalah 'admin' atau 'personil' (huruf kecil, tanpa spasi).`);
                return;
            } 
        } catch (err) {
            alert(err.response?.data?.message || "Email atau Password Salah!");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
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
                        <input 
                            type="password" 
                            placeholder="Masukkan password anda"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required
                        />
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
                {/* Overlay gelap agar teks/gambar kiri lebih menonjol */}
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