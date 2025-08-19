"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import { User, Trash2, Shield, Users, Crown, GraduationCap } from "lucide-react"
import toast from "react-hot-toast"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  rollNo?: string
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/api/users")
      // Handle paginated response
      const usersData = data.results || data
      setUsers(usersData)
      setLoading(false)
    } catch (error) {
      toast.error("Failed to fetch users")
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return

    try {
      await api.delete(`/users/${id}`)
      toast.success("User deleted successfully")
      fetchUsers()
    } catch (error) {
      toast.error("Failed to delete user")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown size={16} className="text-yellow-400" />
      case "shopAdmin":
        return <Shield size={16} className="text-blue-400" />
      default:
        return <GraduationCap size={16} className="text-green-400" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "shopAdmin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
  }

  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true
    return user.role === filter
  })

  const userStats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    shopAdmin: users.filter((u) => u.role === "shopAdmin").length,
    student: users.filter((u) => u.role === "student").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base lg:text-lg">
          Manage all system users and their roles
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg">
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start">
            <Users size={20} className="sm:hidden mb-2 flex-shrink-0" />
            <Users size={24} className="hidden sm:block lg:hidden mr-3 flex-shrink-0" />
            <Users size={32} className="hidden lg:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm lg:text-base font-semibold truncate">Total Users</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold">{userStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg shadow-lg">
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start">
            <Crown size={20} className="sm:hidden mb-2 flex-shrink-0" />
            <Crown size={24} className="hidden sm:block lg:hidden mr-3 flex-shrink-0" />
            <Crown size={32} className="hidden lg:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm lg:text-base font-semibold truncate">Admins</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold">{userStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg">
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start">
            <Shield size={20} className="sm:hidden mb-2 flex-shrink-0" />
            <Shield size={24} className="hidden sm:block lg:hidden mr-3 flex-shrink-0" />
            <Shield size={32} className="hidden lg:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm lg:text-base font-semibold truncate">Shop Admins</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold">{userStats.shopAdmin}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg">
          <div className="p-3 sm:p-4 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start">
            <GraduationCap size={20} className="sm:hidden mb-2 flex-shrink-0" />
            <GraduationCap size={24} className="hidden sm:block lg:hidden mr-3 flex-shrink-0" />
            <GraduationCap size={32} className="hidden lg:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm lg:text-base font-semibold truncate">Students</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold">{userStats.student}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
          {[
            { key: "all", label: "All Users", count: userStats.total },
            { key: "admin", label: "Admins", count: userStats.admin },
            { key: "shopAdmin", label: "Shop Admins", count: userStats.shopAdmin },
            { key: "student", label: "Students", count: userStats.student },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 sm:px-4 lg:px-5 py-2 lg:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm lg:text-base whitespace-nowrap ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105"
              }`}
            >
              <span className="hidden sm:inline">
                {label} ({count})
              </span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-card border rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <div className="p-2 bg-primary rounded-lg mr-3 flex-shrink-0">
                  <User size={16} className="text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(user.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                disabled={user.role === "admin"}
                title={user.role === "admin" ? "Cannot delete admin user" : "Delete user"}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
              >
                {getRoleIcon(user.role)}
                <span className="ml-1 capitalize">{user.role}</span>
              </span>
              <div className="text-right">
                {user.rollNo && <p className="text-xs text-muted-foreground">Roll: {user.rollNo}</p>}
                <p className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold">User</th>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold">Role</th>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold hidden lg:table-cell">
                  Roll Number
                </th>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold hidden xl:table-cell">Joined</th>
                <th className="text-left py-3 px-4 text-sm lg:text-base font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary rounded-lg mr-3 flex-shrink-0">
                        <User size={16} className="text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground truncate block text-sm lg:text-base">
                          {user.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground py-3 px-4 text-sm lg:text-base max-w-xs truncate">
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs lg:text-sm font-medium ${getRoleColor(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role}</span>
                    </span>
                  </td>
                  <td className="text-muted-foreground py-3 px-4 hidden lg:table-cell text-sm lg:text-base">
                    {user.rollNo || "-"}
                  </td>
                  <td className="text-muted-foreground py-3 px-4 hidden xl:table-cell text-sm lg:text-base">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors hover:scale-110"
                      disabled={user.role === "admin"}
                      title={user.role === "admin" ? "Cannot delete admin user" : "Delete user"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 sm:py-16 lg:py-20">
          <User size={48} className="md:hidden text-muted-foreground mx-auto mb-4" />
          <User size={64} className="hidden md:block text-muted-foreground mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-muted-foreground mb-2">No Users Found</h3>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md mx-auto">
            {filter === "all" ? "No users in the system yet." : `No ${filter} users found.`}
          </p>
        </div>
      )}
    </div>
  )
}

export default UsersPage
