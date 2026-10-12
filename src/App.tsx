import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { CustomerMenu } from './pages/CustomerMenu';
import { StaffFloorPortal } from './components/StaffFloorPortal';
import { DebugPanel } from './components/DebugPanel';

function getResolvedPath(): string {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const qrSlug = params.get('qr_slug');
  const qrTable = params.get('qr_table');
  if (qrSlug && qrTable && !path.startsWith('/menu/')) {
    const cleanPath = `/menu/${qrSlug}/table/${qrTable}`;
    try {
      window.history.replaceState({}, '', cleanPath);
    } catch {
      // Ignore history errors in restricted webviews
    }
    return cleanPath;
  }
  return path;
}

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(getResolvedPath);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handlePopState = () => setCurrentPath(getResolvedPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (sessionStorage.getItem('restoqr_customer_qr_lock') === 'true') {
      if (!path.startsWith('/menu/')) {
        return;
      }
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Customer QR Menu Route: /menu/:slug/table/:tableNumber or /menu/:slug
  const menuMatch =
    currentPath.match(/^\/menu\/([^/]+)\/table\/(\d+)/) ||
    currentPath.match(/^\/menu\/([^/]+)\/?$/);

  useEffect(() => {
    if (menuMatch) {
      sessionStorage.setItem('restoqr_customer_qr_lock', 'true');
    }
  }, [menuMatch]);

  // Normalize URL for logged-in users inside useEffect (never during render)
  useEffect(() => {
    if (loading || menuMatch || !user) return;
    const isStaffOnly = user.role === 'waiter' || user.role === 'kitchen_staff';
    if (isStaffOnly && currentPath !== '/restaurant/pos') {
      window.history.replaceState({}, '', '/restaurant/pos');
      setCurrentPath('/restaurant/pos');
      return;
    }
    if (currentPath === '/login' || currentPath === '/') {
      const target =
        user.role === 'platform_admin'
          ? '/admin'
          : isStaffOnly
            ? '/restaurant/pos'
            : '/restaurant';
      window.history.replaceState({}, '', target);
      setCurrentPath(target);
    }
  }, [loading, menuMatch, user, currentPath]);

  if (menuMatch) {
    const slug = decodeURIComponent(menuMatch[1]);
    const tableNum = menuMatch[2] ? parseInt(menuMatch[2], 10) : undefined;
    return <CustomerMenu slug={slug} tableNumber={tableNum} onNavigate={navigate} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading RestoQR Platform...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login
  if (!user) {
    return <Login onNavigate={navigate} />;
  }

  // Super Admin Protected Route
  if (user.role === 'platform_admin') {
    return <AdminDashboard onNavigate={navigate} />;
  }

  // Dedicated Staff / Waiter Floor Portal
  if (user.role === 'waiter' || user.role === 'kitchen_staff' || currentPath === '/restaurant/pos') {
    return <StaffFloorPortal onNavigate={navigate} />;
  }

  // Restaurant Owner / Manager Dashboard
  return <RestaurantDashboard onNavigate={navigate} />;
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
        <DebugPanel />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
