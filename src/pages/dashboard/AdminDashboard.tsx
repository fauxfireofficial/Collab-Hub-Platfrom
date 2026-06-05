import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CircleDollarSign, 
  CreditCard, 
  Layers, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  X, 
  AlertTriangle,
  History,
  TrendingUp,
  Settings,
  ShieldCheck,
  UserCheck,
  Plus,
  Minus,
  MessageSquareReply,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
  Ticket as TicketIcon
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useLocale } from '../../context/LocaleContext';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'entrepreneur' | 'investor' | 'admin';
  walletBalance: number;
  avatarUrl?: string;
  startupName?: string;
  isOnline: boolean;
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  userId: {
    name: string;
    email: string;
    role: string;
  };
  recipientId?: {
    name: string;
    email: string;
    role: string;
    startupName?: string;
  };
  type: 'deposit' | 'withdraw' | 'transfer' | 'escrow' | 'escrow_release';
  amount: number;
  fee?: number;
  status: 'completed' | 'pending' | 'held' | 'failed';
  iban?: string;
  createdAt: string;
}

interface MilestoneRecord {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'released';
  deadline?: string;
  startupId: {
    name: string;
    startupName?: string;
    avatarUrl?: string;
  };
  investorId?: {
    name: string;
    avatarUrl?: string;
  };
  transactionId?: {
    amount: number;
    status: string;
  };
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { formatLocalCurrency, formatLocalDate } = useLocale();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'users' | 'transactions' | 'milestones' | 'tickets'>('overview');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<TransactionRecord[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');

  // Ticket Reply Modal
  const [ticketReplyModal, setTicketReplyModal] = useState<{
    isOpen: boolean;
    ticketId: string;
    subject: string;
    userName: string;
    userEmail: string;
    message: string;
    reply: string;
  }>({
    isOpen: false,
    ticketId: '',
    subject: '',
    userName: '',
    userEmail: '',
    message: '',
    reply: ''
  });

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [milestoneSearch, setMilestoneSearch] = useState('');

  // Modals States
  const [balanceModal, setBalanceModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    currentBalance: number;
    amount: string;
    action: 'add' | 'deduct';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    currentBalance: 0,
    amount: '',
    action: 'add'
  });

  const [deleteUserModal, setDeleteUserModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: '',
    userName: ''
  });

  const [milestoneOverrideModal, setMilestoneOverrideModal] = useState<{
    isOpen: boolean;
    milestoneId: string;
    title: string;
    amount: number;
    action: 'released' | 'cancelled' | 'none';
  }>({
    isOpen: false,
    milestoneId: '',
    title: '',
    amount: 0,
    action: 'none'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, txsRes, milestonesRes, withdrawalsRes, ticketsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/transactions'),
        api.get('/admin/milestones'),
        api.get('/payments/withdraw/pending'),
        api.get('/admin/tickets')
      ]);

      setUsers(usersRes.data);
      setTransactions(txsRes.data);
      setMilestones(milestonesRes.data);
      setPendingWithdrawals(withdrawalsRes.data);
      setTickets(ticketsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load administration data. Make sure you are logged in as admin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Balance Adjustment
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(balanceModal.amount) <= 0 || isNaN(parseFloat(balanceModal.amount))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.put(`/admin/users/${balanceModal.userId}/balance`, {
        amount: parseFloat(balanceModal.amount),
        action: balanceModal.action
      });

      toast.success(response.data.message || 'Balance adjusted successfully!');
      setBalanceModal({ ...balanceModal, isOpen: false, amount: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to adjust balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.delete(`/admin/users/${deleteUserModal.userId}`);
      toast.success(response.data.message || 'User deleted successfully.');
      setDeleteUserModal({ isOpen: false, userId: '', userName: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Withdrawal
  const handleApproveWithdrawal = async (txId: string) => {
    try {
      const response = await api.post(`/payments/withdraw/approve/${txId}`);
      toast.success(response.data.message || 'Withdrawal approved & processed via Stripe.');
      if (response.data.stripeWarning) {
        toast(response.data.stripeWarning, { icon: '⚠️', duration: 6000 });
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal.');
    }
  };

  // Reject Withdrawal
  const handleRejectWithdrawal = async (txId: string) => {
    try {
      const response = await api.post(`/payments/withdraw/reject/${txId}`);
      toast.success(response.data.message || 'Withdrawal request rejected.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal.');
    }
  };

  // Milestone Override Status
  const handleMilestoneOverride = async () => {
    if (milestoneOverrideModal.action === 'none') return;
    setIsSubmitting(true);
    try {
      const response = await api.put(`/admin/milestones/${milestoneOverrideModal.milestoneId}/status`, {
        status: milestoneOverrideModal.action
      });
      toast.success(response.data.message || 'Milestone override completed.');
      setMilestoneOverrideModal({ isOpen: false, milestoneId: '', title: '', amount: 0, action: 'none' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Override failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ticket reply
  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyModal.reply.trim()) {
      toast.error('Please enter a reply message.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post(`/admin/tickets/${ticketReplyModal.ticketId}/reply`, {
        reply: ticketReplyModal.reply
      });
      toast.success(res.data.message || 'Reply sent successfully!');
      setTicketReplyModal({ ...ticketReplyModal, isOpen: false, reply: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ticket close
  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await api.put(`/admin/tickets/${ticketId}/close`);
      toast.success(res.data.message || 'Ticket closed.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to close ticket.');
    }
  };

  // Calculate stats
  const totalUsers = users.length;
  const totalBalance = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
  const activeEscrowAmount = milestones
    .filter(m => m.status === 'in_progress' || m.status === 'completed')
    .reduce((sum, m) => sum + (m.targetAmount || 0), 0);
  const totalTransactionsCount = transactions.length;
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  // Filter lists
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    t.userId?.name?.toLowerCase().includes(txSearch.toLowerCase()) ||
    t.type?.toLowerCase().includes(txSearch.toLowerCase()) ||
    t.status?.toLowerCase().includes(txSearch.toLowerCase()) ||
    (t.recipientId && t.recipientId.name.toLowerCase().includes(txSearch.toLowerCase()))
  );

  const filteredMilestones = milestones.filter(m => 
    m.title.toLowerCase().includes(milestoneSearch.toLowerCase()) ||
    m.status.toLowerCase().includes(milestoneSearch.toLowerCase()) ||
    m.startupId?.name?.toLowerCase().includes(milestoneSearch.toLowerCase())
  );

  if (isLoading && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading Admin Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 dark:text-gray-150">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🛡️</span> Corporate Admin Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage business users, audit transactions, resolve escrow disputes, and oversee payouts.</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <ShieldCheck size={16} />
          Logged in as Administrator
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: <TrendingUp size={16} /> },
          { id: 'withdrawals', label: `Pending Payouts (${pendingWithdrawals.length})`, icon: <CreditCard size={16} /> },
          { id: 'users', label: 'User Manager', icon: <Users size={16} /> },
          { id: 'transactions', label: 'Transaction Audit', icon: <History size={16} /> },
          { id: 'milestones', label: 'Escrow Dispute Center', icon: <Layers size={16} /> },
          { id: 'tickets', label: `Support Tickets (${openTicketsCount})`, icon: <TicketIcon size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Total Users</span>
                  <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{totalUsers}</h3>
                  <span className="text-[10px] text-gray-400">Entrepreneurs & Investors</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Users size={24} />
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Escrow locked</span>
                  <h3 className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{formatLocalCurrency(activeEscrowAmount)}</h3>
                  <span className="text-[10px] text-gray-400">Total in Escrow Milestones</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Layers size={24} />
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Platform Cash</span>
                  <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatLocalCurrency(totalBalance)}</h3>
                  <span className="text-[10px] text-gray-400">Aggregate User Wallets</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CircleDollarSign size={24} />
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Pending Payouts</span>
                  <h3 className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-500">{pendingWithdrawals.length}</h3>
                  <span className="text-[10px] text-gray-400">Requires review & signoff</span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-xl">
                  <CreditCard size={24} />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Actions Panel */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">⚡ Administrative Actions</h4>
                </CardHeader>
                <CardBody className="p-4 space-y-3">
                  <button 
                    onClick={() => setActiveTab('withdrawals')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-150 dark:border-gray-800 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-850 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><CreditCard size={18} /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Review Payout Requests</p>
                        <p className="text-[10px] text-gray-400">Approve bank payouts via Stripe</p>
                      </div>
                    </div>
                    {pendingWithdrawals.length > 0 && (
                      <span className="w-5 h-5 bg-amber-550 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        {pendingWithdrawals.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => setActiveTab('users')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-150 dark:border-gray-800 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-850 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"><Users size={18} /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">User Balance Control</p>
                        <p className="text-[10px] text-gray-400">Add or deduct wallet funds</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Manage {users.length}</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('milestones')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-150 dark:border-gray-800 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-850 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"><Layers size={18} /></div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Dispute Resolution Room</p>
                        <p className="text-[10px] text-gray-400">Force release or cancel escrows</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Overwatch</span>
                  </button>
                </CardBody>
              </Card>

              {/* Stripe Account Status Simulated */}
              <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-none shadow-xl">
                <CardBody className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">Stripe Integration</span>
                      <h4 className="font-bold text-lg mt-0.5">Sandbox Account</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] uppercase font-semibold">Active</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-80">Connected Keys</span>
                      <span className="font-mono text-[10px]">sk_test_...Kq2x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">Payout Mechanism</span>
                      <span className="font-semibold text-indigo-200">Stripe Payouts API</span>
                    </div>
                  </div>

                  <div className="border-t border-indigo-850 pt-3 flex items-center justify-between text-xs text-indigo-300">
                    <span>Developer Sandbox Mode</span>
                    <span>Standard Payout (USD)</span>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Recent Pending Payouts Preview */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex justify-between items-center border-b border-gray-150 dark:border-gray-800/60 p-4">
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Pending Withdrawal Requests Queue</h4>
                  <button onClick={() => setActiveTab('withdrawals')} className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 hover:underline">
                    View All Queue
                  </button>
                </CardHeader>
                <CardBody className="p-0">
                  {pendingWithdrawals.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {pendingWithdrawals.slice(0, 3).map(tx => (
                        <div key={tx.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar src={tx.userId?.avatarUrl} alt={tx.userId?.name} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{tx.userId?.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{tx.userId?.role} • {tx.userId?.email}</p>
                            </div>
                          </div>

                          <div className="space-y-1 sm:text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatLocalCurrency(tx.amount)}</p>
                            <p className="text-[10px] text-gray-400 select-all font-mono">IBAN: {tx.iban}</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(tx.id)}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(tx.id)}
                              className="px-2.5 py-1 text-xs font-semibold border border-red-200 text-red-650 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 text-sm space-y-1">
                      <Check className="mx-auto text-emerald-500 w-8 h-8" />
                      <p className="font-semibold">Withdrawal queue is empty.</p>
                      <p className="text-xs text-gray-400">All user withdrawals are fully settled.</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pending Withdrawals */}
      {activeTab === 'withdrawals' && (
        <Card className="shadow-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-600 to-indigo-650 text-white p-5">
            <h3 className="font-bold text-lg">🔧 Developer Admin Review Panel</h3>
            <p className="text-xs opacity-90 mt-1">Review pending wallet withdrawals, simulate bank verification, and trigger Stripe sandbox payouts.</p>
          </CardHeader>
          <CardBody className="p-0">
            {pendingWithdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3">Requested By</th>
                      <th className="px-6 py-3">IBAN / Routing</th>
                      <th className="px-6 py-3">Payout Amount</th>
                      <th className="px-6 py-3">Fee</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pendingWithdrawals.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{tx.userId?.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{tx.userId?.role} • {tx.userId?.email}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs select-all text-gray-700 dark:text-gray-300">
                          {tx.iban || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          {formatLocalCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">
                          {formatLocalCurrency(tx.fee || 0)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {formatLocalDate(new Date(tx.createdAt))}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
                            onClick={() => handleApproveWithdrawal(tx.id)}
                          >
                            Approve & Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-650 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20"
                            onClick={() => handleRejectWithdrawal(tx.id)}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Check className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
                <p className="font-medium">No pending withdrawal requests.</p>
                <p className="text-xs text-gray-400 mt-1">When users request a withdrawal from their wallet, they will appear here for review.</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab: User Manager */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Registered Platform Users</h3>
              <p className="text-xs text-gray-550 dark:text-gray-450">Review role portfolios, and manage active cash balances.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Input
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                fullWidth
                startAdornment={<Search size={16} className="text-gray-400" />}
              />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-gray-750">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Wallet Balance</th>
                      <th className="px-6 py-3">Details</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar src={u.avatarUrl} alt={u.name} size="sm" />
                          <div>
                            <div className="font-bold text-gray-905 dark:text-white">{u.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-405">{u.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                            u.role === 'admin' 
                              ? 'bg-red-50 text-red-750 dark:bg-red-950/30 dark:text-red-400' 
                              : u.role === 'investor'
                              ? 'bg-purple-50 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400'
                              : 'bg-blue-50 text-blue-750 dark:bg-blue-950/30 dark:text-blue-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          {formatLocalCurrency(u.walletBalance)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {u.role === 'entrepreneur' ? (
                            <span>Startup: <strong>{u.startupName || 'N/A'}</strong></span>
                          ) : u.role === 'investor' ? (
                            <span>Corporate Fund</span>
                          ) : (
                            <span>System Administrator</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1 text-xs ${u.isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-550 animate-pulse' : 'bg-gray-300'}`}></span>
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {u.email !== 'nexus@admin.com' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setBalanceModal({
                                  isOpen: true,
                                  userId: u.id,
                                  userName: u.name,
                                  currentBalance: u.walletBalance,
                                  amount: '',
                                  action: 'add'
                                })}
                              >
                                Adjust Balance
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/10"
                                onClick={() => setDeleteUserModal({
                                  isOpen: true,
                                  userId: u.id,
                                  userName: u.name
                                })}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="font-semibold">No users found matching "{userSearch}".</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab: Transaction Audit */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader className="p-4 border-b border-gray-150 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Global Transaction Ledger</h3>
              <p className="text-xs text-gray-550 dark:text-gray-405">Platform-wide audit list of deposits, withdrawals, transfers, and escrow events.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Input
                placeholder="Filter transactions..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                fullWidth
                startAdornment={<Search size={16} className="text-gray-400" />}
              />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-gray-750">
                    <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Sender</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Recipient</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-550 dark:text-gray-400">
                          {tx.id.substring(0, 10)}...
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-550 dark:text-gray-400">
                          {formatLocalDate(new Date(tx.createdAt))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{tx.userId?.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">{tx.userId?.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide border ${
                            tx.type === 'deposit' 
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50' 
                              : tx.type === 'withdraw'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-900/50'
                              : tx.type === 'escrow'
                              ? 'bg-purple-50 text-purple-750 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50'
                              : 'bg-blue-50 text-blue-750 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-905 dark:text-white">
                          {formatLocalCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {tx.recipientId ? (
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">{tx.recipientId.name}</div>
                              {tx.recipientId.startupName && <div className="text-[10px] text-gray-400 font-medium">Startup: {tx.recipientId.startupName}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Platform</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                            tx.status === 'completed' 
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-455' 
                              : tx.status === 'held'
                              ? 'bg-purple-50 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400'
                              : tx.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="font-semibold">No transactions audit records found.</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab: Escrow Dispute Center */}
      {activeTab === 'milestones' && (
        <Card>
          <CardHeader className="p-4 border-b border-gray-150 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Escrow Dispute Overwatch Room</h3>
              <p className="text-xs text-gray-550 dark:text-gray-405">Review agreement roadmaps, audit escrow balances, and force release/refund locked cash.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Input
                placeholder="Filter milestones..."
                value={milestoneSearch}
                onChange={(e) => setMilestoneSearch(e.target.value)}
                fullWidth
                startAdornment={<Search size={16} className="text-gray-400" />}
              />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {filteredMilestones.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-gray-750">
                    <tr>
                      <th className="px-6 py-3">Milestone / Title</th>
                      <th className="px-6 py-3">Startup</th>
                      <th className="px-6 py-3">Investor</th>
                      <th className="px-6 py-3">Target Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Escrow Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                    {filteredMilestones.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-905 dark:text-white leading-tight">{m.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{m.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{m.startupId?.name}</div>
                          {m.startupId?.startupName && <div className="text-xs text-gray-500">Startup: {m.startupId.startupName}</div>}
                        </td>
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-300">
                          {m.investorId?.name || <span className="text-gray-400 italic">Roadmap Only</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-905 dark:text-white">
                          {formatLocalCurrency(m.targetAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                            m.status === 'released' 
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                              : m.status === 'completed'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 animate-pulse'
                              : m.status === 'in_progress'
                              ? 'bg-indigo-50 text-indigo-755 dark:bg-indigo-950/20 dark:text-indigo-400'
                              : 'bg-gray-100 text-gray-550 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {m.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {(m.status === 'in_progress' || m.status === 'completed') && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-650 hover:bg-emerald-700 text-white border-none shadow-sm"
                                onClick={() => setMilestoneOverrideModal({
                                  isOpen: true,
                                  milestoneId: m.id,
                                  title: m.title,
                                  amount: m.targetAmount,
                                  action: 'released'
                                })}
                              >
                                Force Release
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-650 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/10"
                                onClick={() => setMilestoneOverrideModal({
                                  isOpen: true,
                                  milestoneId: m.id,
                                  title: m.title,
                                  amount: m.targetAmount,
                                  action: 'cancelled'
                                })}
                              >
                                Cancel & Refund
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="font-semibold">No milestone dispute records found.</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab: Support Tickets */}
      {activeTab === 'tickets' && (
        <Card>
          <CardHeader className="p-4 border-b border-gray-150 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <TicketIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
                Support Tickets Queue
              </h3>
              <p className="text-xs text-gray-550 dark:text-gray-405">Review user help requests and reply with email notifications.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto mt-3 sm:mt-0">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search by ID or Subject..."
                  value={ticketSearchTerm}
                  onChange={(e) => setTicketSearchTerm(e.target.value)}
                  fullWidth
                  startAdornment={<Search size={16} className="text-gray-400" />}
                />
              </div>
              <div className="flex gap-2 text-xs w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 font-semibold border border-amber-100 dark:border-amber-900/40 whitespace-nowrap">
                  Open: {tickets.filter(t => t.status === 'open').length}
                </span>
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-semibold border border-emerald-100 dark:border-emerald-900/40 whitespace-nowrap">
                  Replied: {tickets.filter(t => t.status === 'replied').length}
                </span>
                <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-semibold border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Closed: {tickets.filter(t => t.status === 'closed').length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {tickets.filter(t => 
              (t._id || t.id || '').toLowerCase().includes(ticketSearchTerm.toLowerCase()) || 
              (t.subject || '').toLowerCase().includes(ticketSearchTerm.toLowerCase())
            ).length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {tickets.filter(t => 
                  (t._id || t.id || '').toLowerCase().includes(ticketSearchTerm.toLowerCase()) || 
                  (t.subject || '').toLowerCase().includes(ticketSearchTerm.toLowerCase())
                ).map((ticket: any) => (
                  <div key={ticket._id || ticket.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      {/* Left: User info + ticket content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar src={ticket.userId?.avatarUrl} alt={ticket.userId?.name || ticket.name} size="sm" />
                          <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-white break-words">{ticket.userId?.name || ticket.name}</div>
                            <div className="text-[10px] text-gray-400 break-all">{ticket.userId?.email || ticket.email} • {ticket.userId?.role || 'user'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 break-words max-w-full">{ticket.subject}</h4>
                          <span className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                            ticket.status === 'open'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                              : ticket.status === 'replied'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                              : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                          }`}>
                            {ticket.status === 'open' && <Clock size={10} />}
                            {ticket.status === 'replied' && <CheckCircle2 size={10} />}
                            {ticket.status === 'closed' && <Check size={10} />}
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>

                        {/* Show admin reply if exists */}
                        {ticket.adminReply && (
                          <div className="mt-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Admin Reply</p>
                            <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.adminReply}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {ticket.repliedAt ? format(new Date(ticket.repliedAt), 'MMM dd, yyyy • hh:mm a') : ''}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions + Date */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0 mt-3 lg:mt-0">
                        <span className="text-[10px] text-gray-400">
                          {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd, yyyy • hh:mm a') : ''}
                        </span>
                        <div className="flex gap-1.5">
                          {ticket.status !== 'closed' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm"
                                onClick={() => setTicketReplyModal({
                                  isOpen: true,
                                  ticketId: ticket._id || ticket.id,
                                  subject: ticket.subject,
                                  userName: ticket.userId?.name || ticket.name,
                                  userEmail: ticket.userId?.email || ticket.email,
                                  message: ticket.message,
                                  reply: ticket.adminReply || ''
                                })}
                              >
                                <Send size={12} className="mr-1" />
                                {ticket.adminReply ? 'Update Reply' : 'Reply'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                                onClick={() => handleCloseTicket(ticket._id || ticket.id)}
                              >
                                Close
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <TicketIcon className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-semibold">No support tickets yet.</p>
                <p className="text-xs text-gray-400 mt-1">When users submit help requests, they will appear here.</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* MODAL: Adjust Balance */}
      {balanceModal.isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Adjust Wallet Balance</h3>
              <button onClick={() => setBalanceModal({ ...balanceModal, isOpen: false })} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">User:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{balanceModal.userName}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Current Balance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatLocalCurrency(balanceModal.currentBalance)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceModal({ ...balanceModal, action: 'add' })}
                      className={`py-2 px-3 rounded-lg border font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                        balanceModal.action === 'add'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-900'
                          : 'border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <Plus size={16} /> Add Funds
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceModal({ ...balanceModal, action: 'deduct' })}
                      className={`py-2 px-3 rounded-lg border font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                        balanceModal.action === 'deduct'
                          ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/25 dark:text-red-400 dark:border-red-900'
                          : 'border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <Minus size={16} /> Deduct Funds
                    </button>
                  </div>
                </div>

                <Input
                  label="Adjustment Amount (USD)"
                  type="number"
                  placeholder="e.g. 500"
                  value={balanceModal.amount}
                  onChange={(e) => setBalanceModal({ ...balanceModal, amount: e.target.value })}
                  required
                  fullWidth
                  min="0.01"
                />

                <div className="flex gap-3 border-t border-gray-150 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setBalanceModal({ ...balanceModal, isOpen: false })} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting} className="bg-indigo-650 hover:bg-indigo-700 text-white border-none shadow-md">
                    Apply Adjustment
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* MODAL: Delete User Confirmation */}
      {deleteUserModal.isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardBody className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-950/50 text-red-650 dark:text-red-450 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={26} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete User Account</h3>
              <p className="text-sm text-gray-550 dark:text-gray-400 mb-6">
                Are you sure you want to delete the user account for <strong>{deleteUserModal.userName}</strong>? This action is permanent and cannot be undone. All user data, transactions, and holdings will become orphaned.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setDeleteUserModal({ isOpen: false, userId: '', userName: '' })} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  fullWidth 
                  onClick={handleDeleteUser}
                  isLoading={isSubmitting}
                  className="bg-red-650 hover:bg-red-700 text-white border-none shadow-md"
                >
                  Permanently Delete
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* MODAL: Milestone Override Confirmation */}
      {milestoneOverrideModal.isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardBody className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck size={26} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {milestoneOverrideModal.action === 'released' ? 'Force Escrow Release' : 'Force Cancel & Refund'}
              </h3>
              <p className="text-sm text-gray-550 dark:text-gray-400 mb-6">
                {milestoneOverrideModal.action === 'released'
                  ? `Are you sure you want to force-release escrow funds of ${formatLocalCurrency(milestoneOverrideModal.amount)} for the milestone "${milestoneOverrideModal.title}"? This overrides investor approval and immediately releases funds to the startup wallet.`
                  : `Are you sure you want to force-cancel escrow milestone "${milestoneOverrideModal.title}"? The locked funds of ${formatLocalCurrency(milestoneOverrideModal.amount)} will be immediately returned to the investor's balance.`
                }
              </p>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setMilestoneOverrideModal({ isOpen: false, milestoneId: '', title: '', amount: 0, action: 'none' })} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  fullWidth 
                  onClick={handleMilestoneOverride}
                  isLoading={isSubmitting}
                  className={milestoneOverrideModal.action === 'released' ? 'bg-emerald-650 hover:bg-emerald-700 text-white border-none shadow-md' : 'bg-red-650 hover:bg-red-700 text-white border-none shadow-md'}
                >
                  Confirm Override
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* MODAL: Ticket Reply */}
      {ticketReplyModal.isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Reply to Support Ticket</h3>
                <p className="text-xs text-gray-500 mt-0.5">Response will be emailed to <strong>{ticketReplyModal.userEmail}</strong></p>
              </div>
              <button onClick={() => setTicketReplyModal({ ...ticketReplyModal, isOpen: false })} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleTicketReply} className="space-y-4">
                {/* Ticket info summary */}
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">User:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{ticketReplyModal.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subject:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{ticketReplyModal.subject}</span>
                  </div>
                </div>

                {/* Original message */}
                <div className="bg-amber-50 dark:bg-amber-950/15 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">User's Message</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticketReplyModal.message}</p>
                </div>

                {/* Reply textarea */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Reply</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3 text-sm"
                    rows={5}
                    placeholder="Type your reply here... This will be emailed to the user."
                    value={ticketReplyModal.reply}
                    onChange={(e) => setTicketReplyModal({ ...ticketReplyModal, reply: e.target.value })}
                    required
                  />
                </div>

                <div className="flex gap-3 border-t border-gray-150 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setTicketReplyModal({ ...ticketReplyModal, isOpen: false })} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md" leftIcon={<Send size={16} />}>
                    Send Reply & Email
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
