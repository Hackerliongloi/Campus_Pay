import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Loader2 } from 'lucide-react';

// Route Guard for Authenticated Users
const DashboardResolver = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-indigo-400 space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <h4 className="font-bold text-sm tracking-widest text-indigo-300 uppercase animate-pulse">
          Loading Secure Wallet Session...
        </h4>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Resolve view based on user role
  if (user.role === 'student') {
    return <StudentDashboard />;
  }

  if (user.role === 'vendor') {
    return <VendorDashboard />;
  }

  if (user.role === 'admin' || user.role === 'subadmin') {
    return <AdminDashboard />;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Guest Pages (Login/Signup)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Guest Auth Pages */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Signup />
              </GuestRoute>
            }
          />

          {/* Secure App Dashboard */}
          <Route path="/" element={<DashboardResolver />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
