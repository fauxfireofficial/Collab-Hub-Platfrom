import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X, Bell, MessageCircle, User, LogOut, Building2, CircleDollarSign, Shield, Users, FileText, Calendar, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // User dashboard route based on role
  const dashboardRoute = user?.role === 'entrepreneur'
    ? '/dashboard/entrepreneur'
    : user?.role === 'admin'
    ? '/dashboard/admin'
    : '/dashboard/investor';

  // User profile route
  const profileRoute = user
    ? '/profile'
    : '/login';

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = [
    {
      icon: user?.role === 'entrepreneur' 
        ? <Building2 size={18} /> 
        : user?.role === 'admin'
        ? <Shield size={18} />
        : <CircleDollarSign size={18} />,
      text: 'Dashboard',
      path: dashboardRoute,
    },
    {
      icon: <MessageCircle size={18} />,
      text: 'Messages',
      path: user ? '/chat' : '/login',
    },
    {
      icon: (
        <span className="relative inline-flex items-center">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-lg animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      ),
      text: 'Notifications',
      path: user ? '/notifications' : '/login',
    },
    {
      icon: <User size={18} />,
      text: 'Profile',
      path: profileRoute,
    }
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link to={user ? dashboardRoute : '/'} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Business Nexus</span>
            </Link>
          </div>
 
          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:ms-6">
            {user ? (
              <div className="flex items-center space-x-1">
                {navLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive(link.path)
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="me-2">{link.icon}</span>
                    {t(link.text)}
                    {/* Dot indicator under "Notifications" tab when unread */}
                    {link.text === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                    )}
                  </Link>
                ))}
 
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  leftIcon={<LogOut size={18} />}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('Logout')}
                </Button>
 
                <Link to={profileRoute} className="flex items-center space-x-2 ms-2">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="sm"
                    status={user.isOnline ? 'online' : 'offline'}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="outline">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {/* Mobile bell badge */}
            {user && unreadCount > 0 && (
              <Link to="/notifications" className="relative me-2 p-2">
                <Bell size={22} className="text-gray-700 dark:text-gray-300" />
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </Link>
            )}
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-fade-in max-h-[85vh] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user ? (
              <>
                <div className="flex items-center space-x-3 px-3 py-2">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="sm"
                    status={user.isOnline ? 'online' : 'offline'}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                  </div>
                </div>

                {/* Main nav links */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  {navLinks.map((link, index) => (
                    <Link
                      key={index}
                      to={link.path}
                      className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="me-3">{link.icon}</span>
                      {t(link.text)}
                    </Link>
                  ))}
                </div>

                {/* Sidebar links — role-based */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('Navigation')}</p>
                  {user.role === 'entrepreneur' && (
                    <>
                      <Link to="/meetings" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <Calendar size={18} className="me-3" />{t('Meetings & Calendar')}
                      </Link>
                      <Link to="/documents" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <FileText size={18} className="me-3" />{t('Documents')}
                      </Link>
                      <Link to="/payments" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <CircleDollarSign size={18} className="me-3" />{t('Wallet & Payments')}
                      </Link>
                    </>
                  )}
                  {user.role === 'investor' && (
                    <>
                      <Link to="/entrepreneurs" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <Users size={18} className="me-3" />{t('Find Startups')}
                      </Link>
                      <Link to="/meetings" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <Calendar size={18} className="me-3" />{t('Meetings & Calendar')}
                      </Link>
                      <Link to="/deals" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <FileText size={18} className="me-3" />{t('Deals')}
                      </Link>
                      <Link to="/payments" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                        <CircleDollarSign size={18} className="me-3" />{t('Wallet & Payments')}
                      </Link>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/payments" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                      <CircleDollarSign size={18} className="me-3" />{t('Wallet & Payments')}
                    </Link>
                  )}
                </div>

                {/* Settings links */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('Settings')}</p>
                  <Link to="/settings" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                    <Settings size={18} className="me-3" />{t('Settings')}
                  </Link>
                  <Link to="/help" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md" onClick={() => setIsMenuOpen(false)}>
                    <HelpCircle size={18} className="me-3" />{t('Help & Support')}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <LogOut size={18} className="me-3" />
                    {t('Logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-2 px-3 py-2">
                <Link
                  to="/login"
                  className="w-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button variant="outline" fullWidth>Log in</Button>
                </Link>
                <Link
                  to="/register"
                  className="w-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button fullWidth>Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};