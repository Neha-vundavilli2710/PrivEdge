import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';

// Public
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// User
import UserDashboard from './pages/user/Dashboard';
import Chatbot from './pages/user/Chatbot';
import Conversations from './pages/user/Conversations';
import KnowledgeBase from './pages/user/KnowledgeBase';
import Insights from './pages/user/Insights';
import UserProfile from './pages/user/Profile';
import UserSettings from './pages/user/Settings';

// Reviewer
import ReviewerDashboard from './pages/reviewer/ReviewerDashboard';
import ReviewQueue from './pages/reviewer/ReviewQueue';
import ReviewQuery from './pages/reviewer/ReviewQuery';
import ReviewHistory from './pages/reviewer/ReviewHistory';
import ReviewerAnalytics from './pages/reviewer/ReviewerAnalytics';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import UserDetail from './pages/admin/UserDetail';
import RoutingAnalytics from './pages/admin/RoutingAnalytics';
import QueryLogs from './pages/admin/QueryLogs';
import HumanReviewMonitoring from './pages/admin/HumanReviewMonitoring';
import AdminKnowledgeBase from './pages/admin/AdminKnowledgeBase';
import SystemMonitoring from './pages/admin/SystemMonitoring';
import AdminSettings from './pages/admin/AdminSettings';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, role } = useApp();
  const { pathname } = useLocation();
  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (pathname.split('/')[1] !== role) return <Navigate to={`/${role}/dashboard`} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, role, authLoading } = useApp();
  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</div>;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={`/${role}/dashboard`} /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={`/${role}/dashboard`} /> : <Register />} />

      {/* User */}
      <Route path="/user/dashboard" element={<AuthGuard><UserDashboard /></AuthGuard>} />
      <Route path="/user/chatbot" element={<AuthGuard><Chatbot /></AuthGuard>} />
      <Route path="/user/conversations" element={<AuthGuard><Conversations /></AuthGuard>} />
      <Route path="/user/knowledge-base" element={<AuthGuard><KnowledgeBase /></AuthGuard>} />
      <Route path="/user/insights" element={<AuthGuard><Insights /></AuthGuard>} />
      <Route path="/user/profile" element={<AuthGuard><UserProfile /></AuthGuard>} />
      <Route path="/user/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />

      {/* Reviewer */}
      <Route path="/reviewer/dashboard" element={<AuthGuard><ReviewerDashboard /></AuthGuard>} />
      <Route path="/reviewer/queue" element={<AuthGuard><ReviewQueue /></AuthGuard>} />
      <Route path="/reviewer/review/:id" element={<AuthGuard><ReviewQuery /></AuthGuard>} />
      <Route path="/reviewer/history" element={<AuthGuard><ReviewHistory /></AuthGuard>} />
      <Route path="/reviewer/analytics" element={<AuthGuard><ReviewerAnalytics /></AuthGuard>} />
      <Route path="/reviewer/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
      <Route path="/admin/users" element={<AuthGuard><UserManagement /></AuthGuard>} />
      <Route path="/admin/users/:id" element={<AuthGuard><UserDetail /></AuthGuard>} />
      <Route path="/admin/routing" element={<AuthGuard><RoutingAnalytics /></AuthGuard>} />
      <Route path="/admin/logs" element={<AuthGuard><QueryLogs /></AuthGuard>} />
      <Route path="/admin/reviews" element={<AuthGuard><HumanReviewMonitoring /></AuthGuard>} />
      <Route path="/admin/knowledge" element={<AuthGuard><AdminKnowledgeBase /></AuthGuard>} />
      <Route path="/admin/system" element={<AuthGuard><SystemMonitoring /></AuthGuard>} />
      <Route path="/admin/settings" element={<AuthGuard><AdminSettings /></AuthGuard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
