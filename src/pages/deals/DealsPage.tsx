import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Filter, DollarSign, TrendingUp, Users, Calendar,
  X, Plus, Briefcase
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Deal, DealStatus, DealStage } from '../../types';

// ─── Shared deal store (in-memory for this session) ──────────────────────────
export const initialDeals: Deal[] = [
  {
    id: 1,
    startup: { name: 'TechWave AI', logo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg', industry: 'FinTech' },
    amount: '$1.5M', equity: '15%', status: 'Due Diligence', stage: 'Series A',
    lastActivity: '2024-02-15',
    notes: 'Strong team, impressive traction. Need to review financials.',
    activities: [
      { id: 'a1', date: '2024-02-15', type: 'note', description: 'Initial due diligence review started.', by: 'You' },
      { id: 'a2', date: '2024-02-10', type: 'meeting', description: 'Intro call with founders — very promising.', by: 'You' },
    ],
    files: [{ name: 'TechWave_Pitch.pdf', size: '4.2 MB', uploadedAt: '2024-02-10' }],
  },
  {
    id: 2,
    startup: { name: 'GreenLife Solutions', logo: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg', industry: 'CleanTech' },
    amount: '$2M', equity: '20%', status: 'Term Sheet', stage: 'Seed',
    lastActivity: '2024-02-10',
    notes: 'Term sheet sent. Waiting for founder signatures.',
    activities: [
      { id: 'b1', date: '2024-02-10', type: 'status_change', description: 'Status changed to Term Sheet.', by: 'You' },
    ],
    files: [
      { name: 'GreenLife_TermSheet.pdf', size: '1.8 MB', uploadedAt: '2024-02-10' },
      { name: 'GreenLife_Financials.xlsx', size: '960 KB', uploadedAt: '2024-02-08' },
    ],
  },
  {
    id: 3,
    startup: { name: 'HealthPulse', logo: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', industry: 'HealthTech' },
    amount: '$800K', equity: '12%', status: 'Negotiation', stage: 'Pre-seed',
    lastActivity: '2024-02-05',
    notes: 'Negotiating equity percentage — founder wants 10%, we propose 12%.',
    activities: [
      { id: 'c1', date: '2024-02-05', type: 'note', description: 'Equity negotiation ongoing.', by: 'You' },
    ],
    files: [],
  },
];

// Startup options will be fetched dynamically

const STAGES: DealStage[] = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'];
const STATUSES: DealStatus[] = ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'];

// ─── Status styling ───────────────────────────────────────────────────────────
export const getStatusVariant = (status: string): 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'gray' => {
  switch (status) {
    case 'Due Diligence': return 'primary';
    case 'Term Sheet':    return 'secondary';
    case 'Negotiation':  return 'accent';
    case 'Closed':       return 'success';
    case 'Passed':       return 'error';
    default:             return 'gray';
  }
};

// ─── Add Deal Modal ───────────────────────────────────────────────────────────
interface AddDealModalProps {
  onClose: () => void;
  onAdd: (deal: Deal) => void;
}

const AddDealModal: React.FC<AddDealModalProps> = ({ onClose, onAdd }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    startupName: '',
    amount: '',
    equity: '',
    stage: 'Seed' as DealStage,
    status: 'Due Diligence' as DealStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startupOptions, setStartupOptions] = useState<any[]>([]);

  React.useEffect(() => {
    // We import api at the top of the file
    import('../../services/api').then(({ default: api }) => {
      api.get('/users/entrepreneurs')
        .then(res => {
          // Map backend entrepreneurs to the format AddDealModal expects
          const options = res.data.map((u: any) => ({
            name: u.startupName || u.name,
            logo: u.avatarUrl || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
            industry: u.industry || 'Technology',
          }));
          setStartupOptions(options);
        })
        .catch(err => console.error('Failed to load startups', err));
    });
  }, []);

  const selectedStartup = startupOptions.find(s => s.name === form.startupName) || {
    name: form.startupName || 'Unknown Startup',
    logo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    industry: 'Unknown'
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.startupName) e.startupName = 'Please select a startup.';
    if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Enter a valid number.';
    if (!form.equity || isNaN(Number(form.equity))) e.equity = 'Enter a valid number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const newDeal: Deal = {
      id: Date.now(),
      startup: selectedStartup!,
      amount: `$${Number(form.amount).toLocaleString()}`,
      equity: `${form.equity}%`,
      status: form.status,
      stage: form.stage,
      lastActivity: new Date().toISOString().split('T')[0],
      notes: '',
      activities: [
        {
          id: `act-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'status_change',
          description: `Deal created at stage: ${form.stage}, Status: ${form.status}`,
          by: 'You',
        },
      ],
      files: [],
    };
    onAdd(newDeal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Briefcase size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Add New Deal')}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('Fill in the details to create a new investment deal.')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Startup Name Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('Startup Name')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.startupName}
                onChange={e => setForm(f => ({ ...f, startupName: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-white dark:bg-gray-900 dark:text-white transition-colors ${
                  errors.startupName
                    ? 'border-red-400 focus:ring-red-500/20'
                    : 'border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                }`}
              >
                <option value="">{t('— Select a startup —')}</option>
                {startupOptions.map(s => (
                  <option key={s.name} value={s.name}>{s.name} ({s.industry})</option>
                ))}
              </select>
            </div>
            {errors.startupName && <p className="mt-1 text-xs text-red-500">{errors.startupName}</p>}
          </div>

          {/* Amount + Equity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Investment Amount ($)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500000"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-white dark:bg-gray-900 dark:text-white transition-colors ${
                  errors.amount
                    ? 'border-red-400 focus:ring-red-500/20'
                    : 'border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                }`}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Equity %')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={form.equity}
                onChange={e => setForm(f => ({ ...f, equity: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 sm:text-sm bg-white dark:bg-gray-900 dark:text-white transition-colors ${
                  errors.equity
                    ? 'border-red-400 focus:ring-red-500/20'
                    : 'border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                }`}
              />
              {errors.equity && <p className="mt-1 text-xs text-red-500">{errors.equity}</p>}
            </div>
          </div>

          {/* Stage + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Stage')}</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 sm:text-sm bg-white dark:bg-gray-900 dark:text-white transition-colors"
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Status')}</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as DealStatus }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 sm:text-sm bg-white dark:bg-gray-900 dark:text-white transition-colors"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Status preview badge */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{t('Status preview')}:</span>
            <Badge variant={getStatusVariant(form.status)}>{form.status}</Badge>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit">
              <Plus size={16} className="mr-1.5" />
              {t('Add Deal')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const DealsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getStoredDeals = (): Deal[] => {
    const stored = localStorage.getItem('nexus_deals');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return initialDeals;
      }
    }
    return initialDeals;
  };

  const [deals, setDeals] = useState<Deal[]>(getStoredDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const statusKeys: DealStatus[] = ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'];

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    const matchesSearch =
      deal.startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.startup.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(deal.status);
    return matchesSearch && matchesStatus;
  });

  const handleAddDeal = (deal: Deal) => {
    const updatedDeals = [deal, ...deals];
    setDeals(updatedDeals);
    localStorage.setItem('nexus_deals', JSON.stringify(updatedDeals));
  };

  // Computed stats
  const totalInvestment = deals
    .filter(d => d.status !== 'Passed')
    .reduce((sum, d) => {
      const num = parseFloat(d.amount.replace(/[$KM,]/g, '')) *
        (d.amount.includes('M') ? 1_000_000 : d.amount.includes('K') ? 1_000 : 1);
      return sum + num;
    }, 0);
  const formatTotal = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

  const activeDealsCount = deals.filter(d => !['Closed', 'Passed'].includes(d.status)).length;
  const closedThisMonth = deals.filter(d => d.status === 'Closed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Investment Deals')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('Track and manage your investment pipeline')}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-1.5" />
          {t('Add Deal')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                <DollarSign size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Total Investment')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTotal(totalInvestment)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg mr-3">
                <TrendingUp size={20} className="text-secondary-600 dark:text-secondary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Active Deals')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{activeDealsCount}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-lg mr-3">
                <Users size={20} className="text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Portfolio Companies')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{deals.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg mr-3">
                <Calendar size={20} className="text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Closed This Month')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{closedThisMonth}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input
            placeholder={t('Search deals by startup name or industry...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            startAdornment={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {statusKeys.map(status => (
              <Badge
                key={status}
                variant={selectedStatus.includes(status) ? getStatusVariant(status) : 'gray'}
                className="cursor-pointer select-none transition-all"
                onClick={() => toggleStatus(status)}
              >
                {t(status)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Active Deals')}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredDeals.length} {t('deal(s) found')}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">{t('No deals found')}</p>
                <p className="text-sm">{t('Try adjusting your search or filters.')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Startup', 'Amount', 'Equity', 'Status', 'Stage', 'Last Activity', 'Actions'].map(h => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                      >
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeals.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar src={deal.startup.logo} alt={deal.startup.name} size="sm" className="flex-shrink-0" />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{deal.startup.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{deal.startup.industry}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{deal.amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{deal.equity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(deal.status)}>
                          {t(deal.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{deal.stage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(deal.lastActivity).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/deals/${deal.id}`)}
                        >
                          {t('View Details')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Add Deal Modal */}
      {showModal && (
        <AddDealModal onClose={() => setShowModal(false)} onAdd={handleAddDeal} />
      )}
    </div>
  );
};