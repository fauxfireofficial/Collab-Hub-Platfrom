import React, { useState, useEffect } from 'react';
import { Search, Book, MessageCircle, Phone, Mail, ExternalLink, Send, CheckCircle2, Clock, MessageSquareReply, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My tickets state
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const handleStartChat = async () => {
    try {
      const res = await api.get('/users/admin-id');
      if (res.data && res.data.adminId) {
        navigate(`/chat/${res.data.adminId}`);
      }
    } catch (error: any) {
      toast.error('Support Chat is currently unavailable.');
    }
  };

  const faqs = [
    { question: t('faq.connect.question'), answer: t('faq.connect.answer') },
    { question: t('faq.profile.question'), answer: t('faq.profile.answer') },
    { question: t('faq.documents.question'), answer: t('faq.documents.answer') },
    { question: t('faq.collab.question'), answer: t('faq.collab.answer') },
  ];

  // Fetch user's tickets
  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await api.get('/help/my-tickets');
      setMyTickets(res.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  // Submit support ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/help/submit', { subject, message });
      toast.success(res.data.message || 'Ticket submitted successfully!');
      setSubject('');
      setMessage('');
      fetchMyTickets(); // Refresh tickets list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
      replied: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
      closed: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    };
    const icons: Record<string, React.ReactNode> = {
      open: <Clock size={12} />,
      replied: <CheckCircle2 size={12} />,
      closed: <CheckCircle2 size={12} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border uppercase tracking-wide ${styles[status] || styles.open}`}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Help & Support')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('Find answers to common questions or get in touch with our support team')}</p>
      </div>
      
      <div className="max-w-2xl">
        <Input
          placeholder={t('Search help articles...')}
          startAdornment={<Search size={18} />}
          fullWidth
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 dark:bg-primary-950/40 rounded-lg mb-4">
              <Book size={24} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Documentation')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t('Browse our detailed documentation and guides')}
            </p>
            <Button variant="outline" className="mt-4" rightIcon={<ExternalLink size={16} />}>
              {t('View Docs')}
            </Button>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 dark:bg-primary-950/40 rounded-lg mb-4">
              <MessageCircle size={24} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Live Chat')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t('Chat with our support team in real-time')}
            </p>
            <Button className="mt-4" onClick={handleStartChat}>{t('Start Chat')}</Button>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 dark:bg-primary-950/40 rounded-lg mb-4">
              <Phone size={24} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Contact Us')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t('Get help via email or phone')}
            </p>
            <Button variant="outline" className="mt-4" leftIcon={<Mail size={16} />}>
              {t('Contact Support')}
            </Button>
          </CardBody>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Frequently Asked Questions')}</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      
      {/* Submit Support Ticket Form */}
      <Card id="support-form" className="border-indigo-100 dark:border-indigo-900/30 scroll-mt-20">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Send size={20} />
            <h2 className="text-lg font-bold">{t('Submit a Support Ticket')}</h2>
          </div>
          <p className="text-xs text-indigo-100 mt-1">Fill out the form below and our team will respond via email.</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmitTicket} className="space-y-5 max-w-2xl">
            <Input
              label={t('Subject')}
              placeholder={t('Brief description of your issue')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              fullWidth
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Message')}
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3 text-sm"
                rows={5}
                placeholder={t('Describe your issue in detail. The more information you provide, the faster we can help.')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                type="submit" 
                isLoading={isSubmitting} 
                leftIcon={<Send size={16} />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md"
              >
                {t('Submit Ticket')}
              </Button>
              <p className="text-xs text-gray-400">You'll receive a response at your registered email address.</p>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* My Tickets History */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquareReply size={20} className="text-indigo-600 dark:text-indigo-400" />
              My Support Tickets
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track the status and replies to your submitted tickets.</p>
          </div>
          <button 
            onClick={fetchMyTickets} 
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Refresh
          </button>
        </CardHeader>
        <CardBody className="p-0">
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : myTickets.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {myTickets.map(ticket => (
                <div key={ticket._id || ticket.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{ticket.subject}</h4>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ticket.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd, yyyy • hh:mm a') : ''}
                    </span>
                  </div>

                  {/* Admin reply if available */}
                  {ticket.status === 'replied' && ticket.adminReply && (
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-lg p-3">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Admin Response
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.adminReply}</p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {ticket.repliedAt ? format(new Date(ticket.repliedAt), 'MMM dd, yyyy • hh:mm a') : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquareReply className="mx-auto w-10 h-10 text-indigo-300 dark:text-indigo-900/50 mb-4" />
              <p className="font-bold text-gray-900 dark:text-white text-base">No tickets submitted yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">You haven't created any support requests.</p>
              <Button 
                onClick={() => document.getElementById('support-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
              >
                Start a new support request
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
