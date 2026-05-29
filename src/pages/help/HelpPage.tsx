import React from 'react';
import { Search, Book, MessageCircle, Phone, Mail, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();

  const faqs = [
    { question: t('faq.connect.question'), answer: t('faq.connect.answer') },
    { question: t('faq.profile.question'), answer: t('faq.profile.answer') },
    { question: t('faq.documents.question'), answer: t('faq.documents.answer') },
    { question: t('faq.collab.question'), answer: t('faq.collab.answer') },
  ];

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
            <Button className="mt-4">{t('Start Chat')}</Button>
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
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Still need help?')}</h2>
        </CardHeader>
        <CardBody>
          <form className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label={t('Full Name')} placeholder={t('Your name')} />
              <Input label={t('Email')} type="email" placeholder="your@email.com" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Message')}
              </label>
              <textarea
                className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                rows={4}
                placeholder={t('How can we help you?')}
              />
            </div>
            
            <div>
              <Button>{t('Send Message')}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
