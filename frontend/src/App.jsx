import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Import Halaman dari HEAD (Fitur Lama/Fitur Lain)
import VehicleList from "./pages/VehicleManagement/VehicleList";
import VehicleDetail from "./pages/VehicleManagement/VehicleDetail";
import UserList from "./pages/UserList";
import LaporanList from "./pages/Laporan/LaporanList";
import LaporanDetail from "./pages/Laporan/LaporanDetail";

// Import Halaman dari FATHIYA (Fitur Baru)
import KeberangkatanTruk from "./pages/KeberangkatanTruk";
import ManajemenJadwal from "./pages/ManajemenJadwal";

// --- PROTECTED ROUTES ---

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
        {/* JALUR UTAMA */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- HALAMAN ADMIN --- */}
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        
        {/* Manajemen Kendaraan (Saya asumsikan ini fitur Admin, sesuaikan path dengan Sidebar.jsx) */}
        <Route path="/manajemen-kendaraan" element={<AdminRoute><VehicleList /></AdminRoute>} />
        <Route path="/vehicle-management/:noPo" element={<AdminRoute><VehicleDetail /></AdminRoute>} />
        
        {/* Manajemen Pengguna */}
        <Route path="/manajemen-pengguna" element={<AdminRoute><UserList /></AdminRoute>} />
        
        {/* Laporan */}
        <Route path="/laporan" element={<AdminRoute><LaporanList /></AdminRoute>} />
        <Route path="/laporan/detail/:id" element={<AdminRoute><LaporanDetail /></AdminRoute>} />

        {/* Manajemen Jadwal (Fitur Baru Fathiya) */}
        <Route path="/manajemen-jadwal" element={<AdminRoute><ManajemenJadwal /></AdminRoute>} />


        {/* --- HALAMAN PERSONIL --- */}
        <Route path="/keberangkatan-truk" element={<PersonilRoute><KeberangkatanTruk /></PersonilRoute>} />


        {/* ROUTE NOT FOUND */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;