import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../lib/auth'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  User as UserIcon, 
  LogOut, 
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

const Layout: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ...(isAdmin ? [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Audit Log', href: '/audit', icon: FileText },
    ] : []),
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">IT Center Admin</h1>
          </div>
          
          <nav className="flex-1 p-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-900">IT Center</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <nav className="p-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout

