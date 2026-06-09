import React, { useState } from 'react';
import { User, Lock, Bell, Globe, Palette, CreditCard, Eye, EyeOff, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocale, Language, Currency } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const {
    language,
    setLanguage,
    timezone,
    setTimezone,
    isAutoTimezone,
    setIsAutoTimezone,
    currency,
    setCurrency,
  } = useLocale();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'language' | 'appearance' | 'billing'>('profile');

  // Password visibility toggles
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Two-Factor Authentication state — persisted in localStorage
  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean>(
    () => localStorage.getItem('nexus_2fa_enabled') === 'true'
  );

  const handleToggle2FA = () => {
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    localStorage.setItem('nexus_2fa_enabled', String(next));
  };

  if (!user) return null;

  const tabs = [
    { id: 'profile', name: t('Profile Settings'), icon: User },
    { id: 'security', name: t('Security Settings'), icon: Lock },
    { id: 'notifications', name: t('Notifications'), icon: Bell },
    { id: 'language', name: t('Language'), icon: Globe },
    { id: 'appearance', name: t('Appearance Settings'), icon: Palette },
    { id: 'billing', name: t('Billing & Subscriptions'), icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{t('Settings')}</h1>
        <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">{t('Manage your account preferences and settings')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardBody className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isActive
                        ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <Icon size={18} className="mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </CardBody>
        </Card>

        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Profile Settings')}</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="xl"
                  />

                  <div>
                    <Button variant="outline" size="sm">
                      {t('Change Photo')}
                    </Button>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('JPG, GIF or PNG. Max size of 800K')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label={t('Full Name')}
                    defaultValue={user.name}
                  />

                  <Input
                    label={t('Email')}
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    helperText={t('Email cannot be changed')}
                  />

                  <Input
                    label={t('Role')}
                    value={user.role}
                    disabled
                  />

                  <Input
                    label={t('Location')}
                    defaultValue="San Francisco, CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('Bio')}
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={4}
                    defaultValue={user.bio}
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">{t('Cancel')}</Button>
                  <Button>{t('Save Changes')}</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Security Settings')}</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                      twoFAEnabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {twoFAEnabled ? <ShieldCheck size={22} /> : <Shield size={22} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('Two-Factor Authentication')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {twoFAEnabled
                          ? t('Your account has an extra layer of protection')
                          : t('Add an extra layer of security to your account')}
                      </p>
                      <Badge variant={twoFAEnabled ? 'success' : 'error'} className="mt-1.5">
                        {twoFAEnabled ? t('Enabled') : t('Not Enabled')}
                      </Badge>
                    </div>
                  </div>
                  {/* Professional toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer" title={twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={twoFAEnabled}
                      onChange={handleToggle2FA}
                    />
                    <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 transition-colors duration-300"></div>
                  </label>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">{t('Change Password')}</h3>
                  <div className="space-y-4">
                    <Input
                      label={t('Current Password')}
                      type={showCurrentPw ? 'text' : 'password'}
                      fullWidth
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    <Input
                      label={t('New Password')}
                      type={showNewPw ? 'text' : 'password'}
                      fullWidth
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    <Input
                      label={t('Confirm New Password')}
                      type={showConfirmPw ? 'text' : 'password'}
                      fullWidth
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    <div className="flex justify-end">
                      <Button>{t('Update Password')}</Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Notifications Preferences */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Notification Preferences')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Choose how and when you want to receive alerts.')}</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-950 dark:text-gray-100">{t('Email Notifications')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('Get updates on new messages, meetings, and deals sent to your email.')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-950 dark:text-gray-100">{t('Direct Message Alerts')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('Notify me immediately when I receive a chat message.')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-950 dark:text-gray-100">{t('Marketing & News')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('Receive weekly newsletters, platform updates, and curated opportunities.')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Button>{t('Save Settings')}</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Language & Region Preferences */}
          {activeTab === 'language' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Language & Region')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Select your preferred language and regional settings.')}</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('Preferred Language')}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white p-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="ur">اردو (Urdu)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('Time Zone')}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAutoTimezone}
                          onChange={(e) => setIsAutoTimezone(e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500"
                        />
                        {t('Auto-detect Time Zone')}
                      </label>
                    </div>
                    <select
                      value={timezone}
                      disabled={isAutoTimezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white p-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50 transition-opacity"
                    >
                      <option value={timezone}>{timezone} ({t('Current')})</option>
                      <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (Saudi Time)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('Currency & Region Specifics')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('Preferred Currency')}
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as Currency)}
                        className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white p-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="USD">USD ($) - United States Dollar</option>
                        <option value="PKR">PKR (₨) - Pakistani Rupee</option>
                        <option value="SAR">SAR (SAR) - Saudi Riyal</option>
                        <option value="EUR">EUR (€) - Euro</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('All investments, wallet balance, and transaction amounts will convert instantly in real-time.')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button>{t('Save Changes')}</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Appearance Settings (Light / Dark Mode Selector) */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Appearance Settings')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Customize how Business Nexus looks on your device.')}</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    {t('Choose Theme')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Light theme option */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 text-left transition-all duration-300 ${theme === 'light'
                          ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-950/10 ring-2 ring-primary-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                    >
                      {/* Theme preview skeleton */}
                      <div className="w-full h-24 bg-gray-150 rounded-lg p-2 mb-3 border border-gray-200 flex flex-col justify-between">
                        <div className="flex gap-1.5">
                          <div className="w-8 h-2 bg-gray-300 rounded" />
                          <div className="w-6 h-2 bg-gray-200 rounded" />
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-3 bg-white rounded shadow-sm border border-gray-150" />
                          <div className="w-4/5 h-3 bg-white rounded shadow-sm border border-gray-150" />
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{t('Light Mode')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{t('Sleek, bright, and easy on the eyes')}</span>
                      {theme === 'light' && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                          ✓
                        </div>
                      )}
                    </button>

                    {/* Dark theme option */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 text-left transition-all duration-300 ${theme === 'dark'
                          ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-950/10 ring-2 ring-primary-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                    >
                      {/* Theme preview skeleton */}
                      <div className="w-full h-24 bg-gray-900 rounded-lg p-2 mb-3 border border-gray-800 flex flex-col justify-between">
                        <div className="flex gap-1.5">
                          <div className="w-8 h-2 bg-gray-700 rounded" />
                          <div className="w-6 h-2 bg-gray-800 rounded" />
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-3 bg-gray-800 rounded shadow-sm border border-gray-750" />
                          <div className="w-4/5 h-3 bg-gray-800 rounded shadow-sm border border-gray-750" />
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{t('Dark Mode')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{t('Premium aesthetic, comfortable dark theme')}</span>
                      {theme === 'dark' && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                          ✓
                        </div>
                      )}
                    </button>

                    {/* System theme option */}
                    <button
                      onClick={() => setTheme('system')}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 text-left transition-all duration-300 ${theme === 'system'
                          ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-950/10 ring-2 ring-primary-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                    >
                      {/* Theme preview skeleton (split half/half light & dark) */}
                      <div className="w-full h-24 rounded-lg mb-3 border border-gray-200 dark:border-gray-700 flex overflow-hidden">
                        {/* Left half: Light */}
                        <div className="w-1/2 bg-gray-100 p-2 flex flex-col justify-between border-r border-gray-200">
                          <div className="w-6 h-2 bg-gray-300 rounded" />
                          <div className="space-y-1">
                            <div className="w-full h-3 bg-white rounded shadow-sm border border-gray-150" />
                            <div className="w-full h-3 bg-white rounded shadow-sm border border-gray-150" />
                          </div>
                        </div>
                        {/* Right half: Dark */}
                        <div className="w-1/2 bg-gray-900 p-2 flex flex-col justify-between">
                          <div className="w-6 h-2 bg-gray-750 rounded" />
                          <div className="space-y-1">
                            <div className="w-full h-3 bg-gray-800 rounded shadow-sm border border-gray-750" />
                            <div className="w-full h-3 bg-gray-800 rounded shadow-sm border border-gray-750" />
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{t('System Default')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{t('Automatically matches your system theme')}</span>
                      {theme === 'system' && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                          ✓
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('Interface Effects')}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-950 dark:text-gray-300 font-medium">{t('Reduce Motion')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('Minimize animations and transition effects.')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Billing & Plans */}
          {activeTab === 'billing' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Billing & Subscriptions')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Manage your subscription plan, billing details, and receipts.')}</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-400 font-medium">{t('Pro Plan (Annual)')}</h3>
                    <p className="text-xs text-primary-700 dark:text-primary-300/80 mt-1">{t('Your next renewal date is December 15, 2026.')}</p>
                  </div>
                  <Badge variant="success">{t('Active')}</Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">{t('Payment Methods')}</h3>
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t('Visa ending in 4242')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Expires 12/28')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">{t('Edit')}</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};