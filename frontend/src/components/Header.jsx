import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome,
    FiFilm,
    FiSettings,
    FiLogOut,
    FiUser,
    FiMenu,
    FiX
} from 'react-icons/fi';
import { useState } from 'react';

const Header = () => {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/library', label: 'Library', icon: FiFilm },
    ];

    if (isAdmin()) {
        navItems.push({ path: '/admin', label: 'Admin', icon: FiSettings });
    }

    const isActive = (path) => location.pathname === path;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                            <FiFilm className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-800">
                            VideoStream App
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive(item.path)
                                        ? 'bg-cyan-500/15 text-cyan-600'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Menu */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 border border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <FiUser className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold text-slate-800">{user?.username}</p>
                                <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Logout"
                        >
                            <FiLogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-slate-200">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive(item.path)
                                            ? 'bg-cyan-500/15 text-cyan-600'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                        <FiUser className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{user?.username}</p>
                                        <p className="text-slate-500 text-sm capitalize">{user?.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <FiLogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
