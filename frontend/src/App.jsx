import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// --- IMPORT FITUR BARU (OLIVIA) ---
import DaftarKegiatan from "./pages/DaftarKegiatan";
import DetailKegiatan from "./pages/DetailKegiatan";

// --- IMPORT FITUR LAMA/HEAD (Fathiya & Trici) ---
import VehicleList from "./pages/VehicleManagement/VehicleList";
import VehicleDetail from "./pages/VehicleManagement/VehicleDetail";
import UserList from "./pages/UserList";
import LaporanList from "./pages/Laporan/LaporanList";
import LaporanDetail from "./pages/Laporan/LaporanDetail";
import KeberangkatanTruk from "./pages/KeberangkatanTruk";
import ManajemenJadwal from "./pages/ManajemenJadwal";

// --- PROTECTED ROUTES (LOGIKA KEAMANAN DARI HEAD) ---

// 1. Cek Login Saja (Bisa Admin/Personil)
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// 2. Khusus Admin
const AdminRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/login" replace />;
  
  try {
    const userData = JSON.parse(user);
    const userRole = userData.role?.toString().toLowerCase().trim();
    
    if (userRole !== 'admin') {
      return <Navigate to="/keberangkatan-truk" replace />;
    }
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 3. Khusus Personil
const PersonilRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/login" replace />;
  
  try {
    const userData = JSON.parse(user);
    const userRole = userData.role?.toString().toLowerCase().trim();
    
    if (userRole !== 'personil') {
      return <Navigate to="/dashboard" replace />;
    }
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- JALUR UTAMA --- */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- HALAMAN ADMIN --- */}
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        
        {/* 1. Manajemen Kegiatan (Fitur Baru Olivia) */}
        {/* Path disesuaikan dengan Sidebar: /manajemen-kegiatan */}
        <Route path="/manajemen-kegiatan" element={<AdminRoute><DaftarKegiatan /></AdminRoute>} />
        <Route path="/manajemen-kegiatan/detail/:no_po" element={<AdminRoute><DetailKegiatan /></AdminRoute>} />

        {/* 2. Manajemen Kendaraan */}
        <Route path="/manajemen-kendaraan" element={<AdminRoute><VehicleList /></AdminRoute>} />
        <Route path="/vehicle-management/:noPo/:transporterId" element={<AdminRoute><VehicleDetail /></AdminRoute>} />
        
        {/* 3. Manajemen Pengguna */}
        <Route path="/manajemen-pengguna" element={<AdminRoute><UserList /></AdminRoute>} />
        
        {/* 4. Laporan */}
        <Route path="/laporan" element={<AdminRoute><LaporanList /></AdminRoute>} />
        <Route path="/laporan/detail/:id" element={<AdminRoute><LaporanDetail /></AdminRoute>} />

        {/* 5. Manajemen Jadwal */}
        <Route path="/manajemen-jadwal" element={<AdminRoute><ManajemenJadwal /></AdminRoute>} />


        {/* --- HALAMAN PERSONIL --- */}
        <Route path="/keberangkatan-truk" element={<PersonilRoute><KeberangkatanTruk /></PersonilRoute>} />


        {/* --- FALLBACK (Jika halaman tidak ditemukan) --- */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;