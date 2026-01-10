import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, videoAPI } from '../services/api';
import CustomDropdown from '../components/CustomDropdown';
import {
    FiUsers,
    FiFilm,
    FiSettings,
    FiTrash2,
    FiEdit2,
    FiCheck,
    FiX,
    FiShield,
    FiBarChart2,
    FiHardDrive,
    FiShare2,
    FiUserPlus
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminPanel = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');

    // Video assignment state
    const [assigningVideo, setAssigningVideo] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes, videosRes] = await Promise.all([
                authAPI.getUsers(),
                videoAPI.getStats(),
                videoAPI.getVideos()
            ]);
            setUsers(usersRes.data.data);
            setStats(statsRes.data.data);
            setVideos(videosRes.data.data);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await authAPI.updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u =>
                u._id === userId ? { ...u, role: newRole } : u
            ));
            setEditingUser(null);
            toast.success('Role updated successfully');
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleDeleteUser = async (userId) => {
        const userToDelete = users.find(u => u._id === userId);
        if (!window.confirm(`Are you sure you want to delete ${userToDelete?.username}?`)) return;

        try {
            await authAPI.deleteUser(userId);
            setUsers(prev => prev.filter(u => u._id !== userId));
            toast.success('User deleted successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    // Video Assignment Functions
    const handleOpenAssign = (video) => {
        setAssigningVideo(video);
        setSelectedUsers(video.assignedTo?.map(u => u._id || u) || []);
    };

    const handleToggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAssignVideo = async () => {
        try {
            await videoAPI.assignVideo(assigningVideo._id, selectedUsers);
            setVideos(prev => prev.map(v =>
                v._id === assigningVideo._id
                    ? { ...v, assignedTo: users.filter(u => selectedUsers.includes(u._id)) }
                    : v
            ));
            setAssigningVideo(null);
            toast.success('Video assigned successfully!');
        } catch (error) {
            toast.error('Failed to assign video');
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const roleColors = {
        admin: 'text-red-400 bg-red-500/20 border-red-500/30',
        editor: 'text-primary-400 bg-primary-500/20 border-primary-500/30',
        viewer: 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    };

    const statusColors = {
        safe: 'badge-safe',
        flagged: 'badge-flagged',
        processing: 'badge-processing',
        pending: 'badge-pending'
    };

    const tabs = [
        { id: 'users', label: 'Users', icon: FiUsers },
        { id: 'assign', label: 'Assign Videos', icon: FiShare2 },
        { id: 'stats', label: 'Statistics', icon: FiBarChart2 },
        { id: 'settings', label: 'Settings', icon: FiSettings }
    ];

    const viewers = users.filter(u => u.role === 'viewer');

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
                    <FiShield className="text-cyan-600" />
                    Admin Panel
                </h1>
                <p className="text-slate-500 mt-1">
                    Manage users, roles, and video assignments
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'bg-white text-slate-500 hover:text-cyan-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="card overflow-hidden bg-white shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <FiUsers className="text-cyan-600" />
                            User Management
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">
                                {users.length}
                            </span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="spinner mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="text-left p-4 text-slate-500 font-medium">User</th>
                                        <th className="text-left p-4 text-slate-500 font-medium">Email</th>
                                        <th className="text-left p-4 text-slate-500 font-medium">Organization</th>
                                        <th className="text-left p-4 text-slate-500 font-medium">Role</th>
                                        <th className="text-left p-4 text-slate-500 font-medium">Joined</th>
                                        <th className="text-right p-4 text-slate-500 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-700">{u.username}</span>
                                                    {u._id === user?._id && (
                                                        <span className="text-xs text-cyan-600 font-medium">(You)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600">{u.email}</td>
                                            <td className="p-4 text-slate-600">{u.organization || 'N/A'}</td>
                                            <td className="p-4">
                                                {editingUser === u._id ? (
                                                    <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 1000 }}>
                                                        <div className="w-32">
                                                            <CustomDropdown
                                                                options={[
                                                                    { value: 'viewer', label: 'Viewer' },
                                                                    { value: 'editor', label: 'Editor' },
                                                                    { value: 'admin', label: 'Admin' }
                                                                ]}
                                                                value={selectedRole}
                                                                onChange={setSelectedRole}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleUpdateRole(u._id, selectedRole)}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <FiCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUser(null)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <FiX className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`badge ${roleColors[u.role]}`}>
                                                        {u.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {u._id !== user?._id && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingUser(u._id);
                                                                    setSelectedRole(u.role);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                                title="Edit role"
                                                            >
                                                                <FiEdit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u._id)}
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete user"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Assign Videos Tab */}
            {activeTab === 'assign' && (
                <div className="space-y-6">
                    <div className="card bg-white shadow-sm border border-slate-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <FiShare2 className="text-cyan-600" />
                                Assign Videos to Viewers
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Select a video and assign it to viewers who can then watch it
                            </p>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="spinner mx-auto"></div>
                            </div>
                        ) : videos.length === 0 ? (
                            <div className="p-8 text-center">
                                <FiFilm className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No videos available</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="text-left p-4 text-slate-500 font-medium">Video</th>
                                            <th className="text-left p-4 text-slate-500 font-medium">Owner</th>
                                            <th className="text-left p-4 text-slate-500 font-medium">Status</th>
                                            <th className="text-left p-4 text-slate-500 font-medium">Assigned To</th>
                                            <th className="text-right p-4 text-slate-500 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {videos.map(video => (
                                            <tr key={video._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                            <FiFilm className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-700">{video.title}</p>
                                                            <p className="text-xs text-slate-400">
                                                                {new Date(video.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {video.owner?.username || 'Unknown'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={statusColors[video.status] || 'badge-pending'}>
                                                        {video.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {video.assignedTo?.length > 0 ? (
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {video.assignedTo.slice(0, 3).map((u, i) => (
                                                                <span key={i} className="px-2 py-1 rounded text-xs bg-green-50 text-green-600 border border-green-100">
                                                                    {u.username || u}
                                                                </span>
                                                            ))}
                                                            {video.assignedTo.length > 3 && (
                                                                <span className="text-xs text-slate-400">
                                                                    +{video.assignedTo.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm italic">Not assigned</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={() => handleOpenAssign(video)}
                                                            className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                                                        >
                                                            <FiUserPlus className="w-4 h-4" />
                                                            Assign
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Viewers Summary */}
                    <div className="card bg-white shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                            <FiUsers className="text-cyan-600" />
                            Available Viewers ({viewers.length})
                        </h3>
                        {viewers.length === 0 ? (
                            <p className="text-slate-500 text-sm">
                                No viewers found. Create a user with "Viewer" role first.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {viewers.map(v => (
                                    <div key={v._id} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                            {v.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm text-slate-700">{v.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="card text-center bg-white border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-4">
                            <FiFilm className="w-7 h-7 text-cyan-600" />
                        </div>
                        <p className="text-4xl font-bold text-slate-800">{stats?.totalVideos || 0}</p>
                        <p className="text-slate-500 mt-2">Total Videos</p>
                    </div>

                    <div className="card text-center bg-white border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                            <FiUsers className="w-7 h-7 text-green-600" />
                        </div>
                        <p className="text-4xl font-bold text-slate-800">{stats?.totalUsers || 0}</p>
                        <p className="text-slate-500 mt-2">Total Users</p>
                    </div>

                    <div className="card text-center bg-white border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <FiHardDrive className="w-7 h-7 text-amber-500" />
                        </div>
                        <p className="text-4xl font-bold text-slate-800">
                            {formatBytes(stats?.statusBreakdown?.reduce((acc, s) => acc + (s.totalSize || 0), 0) || 0)}
                        </p>
                        <p className="text-slate-500 mt-2">Storage Used</p>
                    </div>

                    <div className="card md:col-span-2 lg:col-span-3 bg-white border-slate-200">
                        <h3 className="text-lg font-bold mb-6 text-slate-800">Video Status Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats?.statusBreakdown?.map(status => (
                                <div key={status._id} className="p-4 rounded-xl bg-slate-50 text-center border border-slate-100">
                                    <p className="text-2xl font-bold capitalize text-slate-800">{status.count}</p>
                                    <p className={`text-sm capitalize font-medium ${status._id === 'safe' ? 'text-green-600' :
                                        status._id === 'flagged' ? 'text-red-500' :
                                            status._id === 'processing' ? 'text-amber-500' :
                                                'text-slate-500'
                                        }`}>
                                        {status._id}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {formatBytes(status.totalSize)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="card bg-white border-slate-200">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                        <FiSettings className="text-cyan-600" />
                        System Settings
                    </h2>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <h3 className="font-semibold mb-2 text-slate-700">Video Processing</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Configuration for video sensitivity analysis
                            </p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Sensitivity Threshold
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={70}
                                        className="input-field bg-white"
                                        min={0}
                                        max={100}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Videos scoring above this will be flagged
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Max File Size (MB)
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={500}
                                        className="input-field bg-white"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button className="btn-primary">
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Video Modal */}
            {assigningVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="card max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col bg-white shadow-2xl border-none">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <FiShare2 className="text-cyan-600" />
                                Assign Video
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">
                                "{assigningVideo.title}"
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-slate-500 mb-4">
                                Select viewers who can access this video:
                            </p>

                            {viewers.length === 0 ? (
                                <div className="text-center py-8">
                                    <FiUsers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No viewers available</p>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Create users with "Viewer" role first
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {viewers.map(v => (
                                        <label
                                            key={v._id}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedUsers.includes(v._id)
                                                ? 'bg-cyan-50 border border-cyan-200'
                                                : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(v._id)}
                                                onChange={() => handleToggleUser(v._id)}
                                                className="w-4 h-4 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-semibold">
                                                {v.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-700">{v.username}</p>
                                                <p className="text-xs text-slate-500">{v.email}</p>
                                            </div>
                                            {selectedUsers.includes(v._id) && (
                                                <FiCheck className="w-5 h-5 text-cyan-500" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <p className="text-sm text-slate-500">
                                {selectedUsers.length} viewer{selectedUsers.length !== 1 ? 's' : ''} selected
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAssigningVideo(null)}
                                    className="btn-secondary bg-white shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignVideo}
                                    className="btn-primary"
                                >
                                    Save Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
