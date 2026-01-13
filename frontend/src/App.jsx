import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DaftarKegiatan from "./pages/DaftarKegiatan";
import DetailKegiatan from "./pages/DetailKegiatan";

// Route protection
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Daftar Kegiatan */}
        <Route
          path="/kegiatan"
          element={
            <ProtectedRoute>
              <DaftarKegiatan />
            </ProtectedRoute>
          }
        />

        {/* Detail Kegiatan */}
        <Route
          path="/kegiatan/detail/:no_po"
          element={
            <ProtectedRoute>
              <DetailKegiatan />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
