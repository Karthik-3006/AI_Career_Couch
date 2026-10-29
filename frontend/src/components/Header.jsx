import React from 'react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';
import { Sparkles, LogOut, User as UserIcon, Menu } from 'lucide-react';

export default function Header() {
  const { user, logout, setUser, toggleSidebar } = useAuth();

  const handleSimulateSubscription = async () => {
    if (!user) return;
    try {
      // Simulate subscribing for 12 months as an admin command
      const res = await adminService.grantSubscription(user.email, 12);
      setUser(prev => ({
        ...prev,
        is_subscriber: res.is_subscriber,
        subscription_expires_at: res.subscription_expires_at
      }));
      alert("Success! You are now premium. Enforced limits on coding compilers and downloads have been lifted.");
    } catch (err) {
      alert("Failed to simulate subscription: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center space-x-4">
        {user && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🛋️</span>
          <span className="font-bold text-xl text-gray-800 dark:text-white tracking-tight">AI Career Coach</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <>
            {user.is_subscriber ? (
              <span className="flex items-center text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium Member
              </span>
            ) : (
              <button 
                onClick={handleSimulateSubscription}
                className="flex items-center text-xs font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-950/20 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 px-3 py-1.5 rounded-lg transition-all"
              >
                <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                Subscribe (Simulate)
              </button>
            )}

            <div className="flex items-center space-x-2 border-l pl-4 border-gray-200 dark:border-gray-700">
              <div className="bg-primary-100 dark:bg-primary-950/30 p-2 rounded-full text-primary-600 dark:text-primary-400">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-none">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">{(Array.isArray(user.roles) ? user.roles : ['student']).join(', ')}</p>
              </div>
              <button 
                onClick={logout}
                className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
