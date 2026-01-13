import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VehicleList from "./pages/VehicleManagement/VehicleList";
import VehicleDetail from "./pages/VehicleManagement/VehicleDetail";
import UserList from "./pages/UserList";
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
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/vehicle-management" element={<ProtectedRoute><VehicleList /></ProtectedRoute>} />
                <Route path="/vehicle-management/:noPo" element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>} />
                
                {/* Pastikan path ini sesuai dengan yang ada di Sidebar.jsx */}
                <Route path="/manajemen-pengguna" element={<ProtectedRoute><UserList /></ProtectedRoute>} />
                
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
  );
}

export default App;