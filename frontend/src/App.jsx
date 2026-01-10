import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VideoLibrary from './pages/VideoLibrary';
import AdminPanel from './pages/AdminPanel';

// Components
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Layout wrapper for authenticated pages
const AuthenticatedLayout = ({ children }) => {
    return (
        <div className="min-h-screen">
            <div className="animated-bg"></div>
            <Header />
            <main className="pt-20 px-4 pb-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

// App Routes Component
const AppRoutes = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animated-bg"></div>
                <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
            />
            <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
            />

            {/* Protected Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <AuthenticatedLayout>
                            <Dashboard />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/library"
                element={
                    <ProtectedRoute>
                        <AuthenticatedLayout>
                            <VideoLibrary />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requiredRole="admin">
                        <AuthenticatedLayout>
                            <AdminPanel />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                }
            />

            {/* Default Redirect */}
            <Route
                path="/"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
            />
            <Route
                path="*"
                element={<Navigate to="/" />}
            />
        </Routes>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'rgba(30, 41, 59, 0.9)',
                            color: '#e2e8f0',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            maxWidth: '400px',
                            wordBreak: 'break-word'
                        },
                        success: {
                            iconTheme: {
                                primary: '#22c55e',
                                secondary: '#e2e8f0',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#e2e8f0',
                            },
                        },
                    }}
                />
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
