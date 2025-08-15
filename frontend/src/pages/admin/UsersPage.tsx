import React, { useEffect, useState } from 'react';
import api from '../../api';
import { User, Trash2, Shield, Users, Crown, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
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
      const { data } = await api.get('/api/users');
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
              await api.delete(`/users/${id}`);
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
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">User Management</h1>
        <p className="text-[var(--secondary-text)] mt-2 text-sm sm:text-base">Manage all system users and their roles</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <Users size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <Users size={32} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Users</p>
              <p className="text-2xl sm:text-3xl font-bold">{userStats.total}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <Crown size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <Crown size={32} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Admins</p>
              <p className="text-2xl sm:text-3xl font-bold">{userStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <Shield size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <Shield size={32} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Shop Admins</p>
              <p className="text-2xl sm:text-3xl font-bold">{userStats.shopAdmin}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <GraduationCap size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <GraduationCap size={32} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Students</p>
              <p className="text-2xl sm:text-3xl font-bold">{userStats.student}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {[
            { key: 'all', label: 'All Users', count: userStats.total },
            { key: 'admin', label: 'Admins', count: userStats.admin },
            { key: 'shopAdmin', label: 'Shop Admins', count: userStats.shopAdmin },
            { key: 'student', label: 'Students', count: userStats.student },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                filter === key
                  ? 'bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white'
                  : 'bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              <span className="hidden sm:inline">{label} ({count})</span>
              <span className="sm:hidden">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="enhanced-table overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-sm">User</th>
              <th className="text-left py-2 px-2 text-sm hidden sm:table-cell">Email</th>
              <th className="text-left py-2 px-2 text-sm">Role</th>
              <th className="text-left py-2 px-2 text-sm hidden md:table-cell">Roll Number</th>
              <th className="text-left py-2 px-2 text-sm hidden lg:table-cell">Joined</th>
              <th className="text-left py-2 px-2 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)]">
                <td className="py-2 px-2">
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--primary-text)] truncate block">{user.name}</span>
                      <span className="text-xs text-[var(--secondary-text)] sm:hidden">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td className="text-[var(--secondary-text)] py-2 px-2 hidden sm:table-cell text-sm">{user.email}</td>
                <td className="py-2 px-2">
                  <span className={`badge ${getRoleColor(user.role)} flex items-center w-fit text-xs`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1 capitalize">{user.role}</span>
                  </span>
                </td>
                <td className="text-[var(--secondary-text)] py-2 px-2 hidden md:table-cell text-sm">{user.rollNo || '-'}</td>
                <td className="text-[var(--secondary-text)] py-2 px-2 hidden lg:table-cell text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="py-2 px-2">
                  <button
                    onClick={() => handleDelete(user.id)}
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
          <div className="text-center py-8 sm:py-12">
            <User size={40} className="sm:hidden text-[var(--muted-text)] mx-auto mb-3" />
            <User size={48} className="hidden sm:block text-[var(--muted-text)] mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-[var(--secondary-text)] mb-2">
              No Users Found
            </h3>
            <p className="text-[var(--muted-text)] text-sm sm:text-base">
              {filter === 'all' ? 'No users in the system yet.' : `No ${filter} users found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;