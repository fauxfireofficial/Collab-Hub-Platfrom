import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, FileText, MessageSquare, Activity, 
  DollarSign, TrendingUp, Calendar, Upload, Download, Send
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Deal } from '../../types';
import { initialDeals, getStatusVariant } from './DealsPage';

export const DealDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'files' | 'chat'>('history');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Find deal from mock store
    if (dealId) {
      const foundDeal = initialDeals.find(d => d.id === parseInt(dealId));
      if (foundDeal) {
        setDeal(foundDeal);
      }
    }
  }, [dealId]);

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400 mb-4">{t('Deal not found or loading...')}</div>
        <Button variant="outline" onClick={() => navigate('/deals')}>
          <ArrowLeft size={16} className="mr-2" />
          {t('Back to Deals')}
        </Button>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // In a real app, this would send to backend
    // For now, we just clear the input to simulate sending
    setNewMessage('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/deals')}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {deal.startup.name} {t('Investment')}
            </h1>
            <Badge variant={getStatusVariant(deal.status)}>{t(deal.status)}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {deal.startup.industry} • {deal.stage} {t('Stage')}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('Investment Amount')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{deal.amount}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('Equity Offered')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{deal.equity}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('Last Activity')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {new Date(deal.lastActivity).toLocaleDateString()}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area (Tabs) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-0">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  <Activity size={18} />
                  {t('Activity History')}
                </button>
                <button
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'files'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('files')}
                >
                  <FileText size={18} />
                  {t('Documents')} ({deal.files?.length || 0})
                </button>
                <button
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'chat'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('chat')}
                >
                  <MessageSquare size={18} />
                  {t('Discussion')}
                </button>
              </div>
            </CardHeader>
            <CardBody className="min-h-[400px]">
              
              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6 animate-fade-in">
                  {deal.activities && deal.activities.length > 0 ? (
                    <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                      {deal.activities.map((activity) => (
                        <div key={activity.id} className="relative pl-6">
                          <div className="absolute w-3 h-3 bg-primary-600 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white dark:ring-gray-900" />
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {activity.by}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(activity.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <Activity size={32} className="mx-auto mb-3 opacity-50" />
                      <p>{t('No activity recorded yet.')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('Shared Documents')}</h3>
                    <Button size="sm" variant="outline">
                      <Upload size={16} className="mr-2" />
                      {t('Upload File')}
                    </Button>
                  </div>
                  
                  {deal.files && deal.files.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {deal.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-primary-300 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                              <FileText size={20} />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{file.size} • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                            <Download size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      <FileText size={32} className="mx-auto mb-3 opacity-50" />
                      <p>{t('No documents uploaded for this deal.')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[400px] animate-fade-in">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="text-center text-xs text-gray-400 my-2">{t('Discussion started')}</div>
                    
                    {/* Mock message from entrepreneur */}
                    <div className="flex gap-3">
                      <Avatar src={deal.startup.logo} alt={deal.startup.name} size="sm" />
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm max-w-[80%]">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          Hi! Thanks for moving us to the {deal.status} stage. Let me know if you need any additional documents.
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">10:42 AM</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Input */}
                  <div className="mt-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        fullWidth
                        placeholder={t('Type a message to the founders...')}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                        <Send size={18} />
                      </Button>
                    </form>
                  </div>
                </div>
              )}
              
            </CardBody>
          </Card>
        </div>

        {/* Sidebar (Startup Info) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Startup Profile')}</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <Avatar src={deal.startup.logo} alt={deal.startup.name} size="xl" className="mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{deal.startup.name}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{deal.startup.industry}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('Deal Notes')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                  {deal.notes || t('No internal notes added yet.')}
                </p>
              </div>

              <Button variant="outline" className="w-full">
                {t('View Full Profile')}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
