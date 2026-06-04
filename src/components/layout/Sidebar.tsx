import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  Home, Building2, CircleDollarSign, Users, MessageCircle, 
  FileText, Settings, HelpCircle, Calendar, Shield
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, text }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center py-2.5 px-4 rounded-md transition-colors duration-200 ${
          isActive 
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }`
      }
    >
      <span className="me-3">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  if (!user) return null;
  
  // Define sidebar items based on user role
  const entrepreneurItems = [
    { to: '/dashboard/entrepreneur', icon: <Home size={20} />, text: 'Dashboard' },
    { to: '/profile', icon: <Building2 size={20} />, text: 'My Startup' },
    { to: '/investors', icon: <CircleDollarSign size={20} />, text: 'Find Investors' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
    { to: '/meetings', icon: <Calendar size={20} />, text: 'Meetings & Calendar' },
    { to: '/documents', icon: <FileText size={20} />, text: 'Documents' },
    { to: '/payments', icon: <CircleDollarSign size={20} />, text: 'Wallet & Payments' },
  ];
  
  const investorItems = [
    { to: '/dashboard/investor', icon: <Home size={20} />, text: 'Dashboard' },
    { to: '/profile', icon: <CircleDollarSign size={20} />, text: 'My Portfolio' },
    { to: '/entrepreneurs', icon: <Users size={20} />, text: 'Find Startups' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
    { to: '/meetings', icon: <Calendar size={20} />, text: 'Meetings & Calendar' },
    { to: '/deals', icon: <FileText size={20} />, text: 'Deals' },
    { to: '/payments', icon: <CircleDollarSign size={20} />, text: 'Wallet & Payments' },
  ];

  
  const adminItems = [
    { to: '/dashboard/admin', icon: <Shield size={20} />, text: 'Admin Portal' },
    { to: '/payments', icon: <CircleDollarSign size={20} />, text: 'Wallet & Payments' },
    { to: '/chat', icon: <MessageCircle size={20} />, text: 'Messages' },
  ];
  
  let sidebarItems = [];
  if (user.role === 'admin') {
    sidebarItems = adminItems;
  } else if (user.role === 'entrepreneur') {
    sidebarItems = entrepreneurItems;
  } else {
    sidebarItems = investorItems;
  }
  
  // Common items at the bottom
  const commonItems = [
    { to: '/settings', icon: <Settings size={20} />, text: 'Settings' },
    { to: '/help', icon: <HelpCircle size={20} />, text: 'Help & Support' },
  ];
  
  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-full border-r border-gray-200 dark:border-gray-700 hidden md:block transition-colors duration-300">
      <div className="h-full flex flex-col">
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 space-y-1">
            {sidebarItems.map((item, index) => (
              <SidebarItem
                key={index}
                to={item.to}
                icon={item.icon}
                text={t(item.text)}
              />
            ))}
          </div>
          
          <div className="mt-8 px-3">
            <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('Settings')}
            </h3>
            <div className="mt-2 space-y-1">
              {commonItems.map((item, index) => (
                <SidebarItem
                  key={index}
                  to={item.to}
                  icon={item.icon}
                  text={t(item.text)}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('Need assistance?')}</p>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{t('Contact Support')}</h4>
            <a 
              href="mailto:support@businessnexus.com" 
              className="mt-2 inline-flex items-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500"
            >
              support@businessnexus.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};