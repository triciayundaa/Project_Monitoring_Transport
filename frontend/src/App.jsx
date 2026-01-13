import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import KeberangkatanTruk from "./pages/KeberangkatanTruk";

// Fungsi untuk mengecek apakah user sudah login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    // Jika tidak ada data user di localStorage, tendang ke halaman login
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Fungsi untuk melindungi route admin saja
const AdminRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const userData = JSON.parse(user);
    const userRole = userData.role?.toString().toLowerCase().trim();
    
    if (userRole !== 'admin') {
      // Jika bukan admin, redirect ke halaman personil
      return <Navigate to="/keberangkatan-truk" replace />;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Fungsi untuk melindungi route personil saja
const PersonilRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const userData = JSON.parse(user);
    const userRole = userData.role?.toString().toLowerCase().trim();
    
    if (userRole !== 'personil') {
      // Jika bukan personil, redirect ke halaman admin
      return <Navigate to="/dashboard" replace />;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Jalur Utama: Jika akses root (/), arahkan ke Login atau Dashboard */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* Halaman Dashboard (Hanya untuk Admin) */}
        <Route 
          path="/dashboard" 
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          } 
        />

        {/* Halaman Keberangkatan Truk (Hanya untuk Personil) */}
        <Route 
          path="/keberangkatan-truk" 
          element={
            <PersonilRoute>
              <KeberangkatanTruk />
            </PersonilRoute>
          } 
        />

        {/* Route Otomatis: Jika user mengetik alamat yang salah, arahkan ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;