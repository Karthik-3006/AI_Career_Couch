import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  FileText, 
  Compass, 
  BookOpen, 
  Code, 
  MessageSquare,
  Lock,
  User,
  Bell,
  HelpCircle
} from 'lucide-react';

export default function Sidebar() {
  const { user, sidebarOpen } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Resume Analyzer', path: '/resume', icon: FileText },
    { name: 'Learning Roadmap', path: '/roadmap', icon: Compass },
    { name: 'Academic Subjects', path: '/learning', icon: BookOpen },
    { name: 'Coding Practice', path: '/coding', icon: Code },
    { name: 'Mock Interviews', path: '/interviews', icon: MessageSquare },
    { name: 'Updates & Notes', path: '/updates', icon: Bell },
    { name: 'Tutorial Guide', path: '/tutorial', icon: HelpCircle },
  ];

  const isAdmin = user?.roles?.includes('admin');

  return (
    <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] sticky top-16 hidden md:flex flex-col justify-between p-4 z-10 transition-all duration-300 ${
      sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden px-0 py-0 border-r-0'
    }`}>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 shadow-sm border border-primary-100 dark:border-primary-900/30' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      {isAdmin && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-auto">
          <NavLink
            to="/admin"
            className={({ isActive }) => 
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`
            }
          >
            <Lock className="h-5 w-5 text-red-500" />
            <span>Admin Settings</span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
