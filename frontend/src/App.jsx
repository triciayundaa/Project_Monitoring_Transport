import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Fungsi untuk mengecek apakah user sudah login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    // Jika tidak ada data user di localStorage, tendang ke halaman login
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

        {/* Halaman Dashboard (Diproteksi) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Route Otomatis: Jika user mengetik alamat yang salah, arahkan ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;