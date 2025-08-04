import React, { useEffect, useState } from 'react';
import api from '../../api';
import { User, Trash2, Shield, Users, Crown, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  rollNo?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      // Handle paginated response
      const usersData = data.results || data;
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch users');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/users/${id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} className="text-yellow-400" />;
      case 'shopAdmin':
        return <Shield size={16} className="text-blue-400" />;
      default:
        return <GraduationCap size={16} className="text-green-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'badge-warning';
      case 'shopAdmin':
        return 'badge-info';
      default:
        return 'badge-success';
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  const userStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    shopAdmin: users.filter(u => u.role === 'shopAdmin').length,
    student: users.filter(u => u.role === 'student').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex space-x-2 text-4xl font-bold">
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '0ms' }}>L</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '150ms' }}>O</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '300ms' }}>A</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '450ms' }}>D</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '600ms' }}>I</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '750ms' }}>N</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '900ms' }}>G</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">User Management</h1>
        <p className="text-[var(--secondary-text)] mt-2">Manage all system users and their roles</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <Users size={32} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Users</p>
              <p className="text-3xl font-bold">{userStats.total}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="p-6 flex items-center">
            <Crown size={32} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Admins</p>
              <p className="text-3xl font-bold">{userStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <Shield size={32} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">shop Admins</p>
              <p className="text-3xl font-bold">{userStats.shopAdmin}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <GraduationCap size={32} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Students</p>
              <p className="text-3xl font-bold">{userStats.student}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'All Users', count: userStats.total },
            { key: 'admin', label: 'Admins', count: userStats.admin },
            { key: 'shopAdmin', label: 'shop Admins', count: userStats.shopAdmin },
            { key: 'student', label: 'Students', count: userStats.student },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === key
                  ? 'bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white'
                  : 'bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="enhanced-table">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">User</th>
              <th className="text-left">Email</th>
              <th className="text-left">Role</th>
              <th className="text-left">Roll Number</th>
              <th className="text-left">Joined</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-lg mr-3">
                      <User size={16} className="text-white" />
                    </div>
                    <span className="font-medium text-[var(--primary-text)]">{user.name}</span>
                  </div>
                </td>
                <td className="text-[var(--secondary-text)]">{user.email}</td>
                <td>
                  <span className={`badge ${getRoleColor(user.role)} flex items-center w-fit`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1 capitalize">{user.role}</span>
                  </span>
                </td>
                <td className="text-[var(--secondary-text)]">{user.rollNo || '-'}</td>
                <td className="text-[var(--secondary-text)]">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="p-2 text-[var(--error)] hover:bg-red-500/10 rounded-lg transition-colors"
                    disabled={user.role === 'admin'}
                    title={user.role === 'admin' ? 'Cannot delete admin user' : 'Delete user'}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User size={48} className="text-[var(--muted-text)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--secondary-text)] mb-2">
              No Users Found
            </h3>
            <p className="text-[var(--muted-text)]">
              {filter === 'all' ? 'No users in the system yet.' : `No ${filter} users found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;