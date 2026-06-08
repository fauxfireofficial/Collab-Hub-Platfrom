import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  History,
  CreditCard,
  ShieldCheck,
  X,
  Calendar,
  Layers,
  Plus,
  CheckCircle,
  Lock,
  Unlock,
  Briefcase,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface StripeDepositFormProps {
  exchangeRate: number;
  currency: string;
  formatLocalCurrency: (amount: number) => string;
  onClose: () => void;
  onSuccess: (newBalance: number, tx: any) => void;
}

const StripeDepositForm: React.FC<StripeDepositFormProps> = ({
  exchangeRate,
  currency,
  formatLocalCurrency,
  onClose,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stripe fee calculation (2.9% + $0.30) — deducted from entered amount
  const parsedAmount = parseFloat(amount) || 0;
  const amountInUSD = parsedAmount / exchangeRate;
  const stripeFeeUSD = amountInUSD > 0 ? (amountInUSD * 0.029) + 0.30 : 0;
  const netAmountUSD = amountInUSD - stripeFeeUSD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create Payment Intent on the backend
      const response = await api.post('/payments/create-payment-intent', {
        amount: amountInUSD,
        currency: 'usd',
      });

      const { clientSecret } = response.data;

      // 2. Confirm the payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card input element not found.');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment confirmation failed.');
      }

      if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // 3. Record net amount (after Stripe fees) in wallet
        const idempotencyKey = 'dep_' + Math.random().toString(36).substring(2, 11) + Date.now();
        const depositResponse = await api.post('/payments/deposit', {
          amount: netAmountUSD,
          idempotencyKey,
        });

        onSuccess(depositResponse.data.balance, depositResponse.data.transaction);
      } else {
        throw new Error('Payment status did not succeed.');
      }
    } catch (err: any) {
      console.error('Stripe deposit error:', err);
      setErrorMessage(err.message || 'An error occurred during payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-lg flex items-center gap-2 text-xs text-indigo-800 dark:text-indigo-300">
        <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0" />
        <span>You are operating in Stripe Sandbox mode. Use `4242 4242...` dummy cards.</span>
      </div>

      <Input
        label={`Amount to Deposit (${currency})`}
        type="number"
        placeholder={`e.g. ${Math.ceil(100 * exchangeRate)}`}
        min={Math.ceil(5 * exchangeRate)}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        fullWidth
        disabled={isProcessing}
      />

      {/* Stripe Fee Breakdown */}
      {parsedAmount > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>You Pay</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatLocalCurrency(amountInUSD)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Stripe Processing Fee <span className="text-gray-400 dark:text-gray-500">(2.9% + $0.30)</span></span>
            <span className="font-medium text-red-500 dark:text-red-400">−{formatLocalCurrency(stripeFeeUSD)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold text-sm">
            <span className="text-gray-900 dark:text-white">Wallet Credit</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatLocalCurrency(netAmountUSD > 0 ? netAmountUSD : 0)}</span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
            Stripe service charges are deducted. Your wallet will receive the net amount shown above.
          </p>
        </div>
      )}

      <div className="space-y-2 border-t border-gray-150 dark:border-gray-800 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-950 rounded-md focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all relative">
          {!stripe && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-950 rounded-md z-10">
              <span className="text-xs text-gray-500 animate-pulse">Loading secure payment element... (Please ensure Stripe is not blocked)</span>
            </div>
          )}
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: isDark ? '#f3f4f6' : '#1f2937',
                  fontFamily: 'Inter, sans-serif',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3 border-t border-gray-150 dark:border-gray-800 pt-4">
        <Button variant="outline" type="button" fullWidth onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" fullWidth isLoading={isProcessing} disabled={!stripe || isProcessing}>
          Deposit Funds
        </Button>
      </div>
    </form>
  );
};


interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'escrow' | 'escrow_release';
  amount: number;
  status: string;
  createdAt: string;
  userId: {
    id: string;
    name: string;
    role: string;
  };
  recipientId?: {
    id: string;
    name: string;
    role: string;
    startupName?: string;
  };
  milestoneId?: {
    title: string;
    status: string;
  };
}

interface ConnectionUser {
  id: string;
  name: string;
  startupName?: string;
  avatarUrl?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'released';
  deadline?: string;
  startupId: {
    id: string;
    name: string;
    startupName?: string;
    avatarUrl?: string;
  };
  investorId?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  transactionId?: {
    id: string;
    amount: number;
    status: string;
  };
  createdAt: string;
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatLocalCurrency, formatLocalDate, currency, exchangeRate } = useLocale();
  const [balance, setBalance] = useState(user?.walletBalance || 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<ConnectionUser[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'milestones'>('history');

  // Admin & Payout Simulation states
  const [iban, setIban] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const fetchPendingWithdrawals = async () => {
    setIsAdminLoading(true);
    try {
      const response = await api.get('/payments/withdraw/pending');
      setPendingWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to fetch pending withdrawals:', error);
    } finally {
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminView) {
      fetchPendingWithdrawals();
    }
  }, [isAdminView]);

  const handleApproveWithdrawal = async (txId: string) => {
    try {
      const response = await api.post(`/payments/withdraw/approve/${txId}`);
      toast.success(response.data.message || 'Withdrawal approved successfully!');
      if (response.data.stripeWarning) {
        toast(response.data.stripeWarning, { icon: '⚠️', duration: 5000 });
      }
      fetchPendingWithdrawals();
      fetchHistory(); // refresh history and balance
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal.');
    }
  };

  const handleRejectWithdrawal = async (txId: string) => {
    try {
      const response = await api.post(`/payments/withdraw/reject/${txId}`);
      toast.success(response.data.message || 'Withdrawal request rejected.');
      fetchPendingWithdrawals();
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal.');
    }
  };

  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'deposit' | 'withdraw' | 'transfer' | 'propose' | 'fund'>('none');
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escrow & Terms States
  const [isEscrow, setIsEscrow] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  // Custom dropdown & Receipt states
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    type: 'deposit' | 'withdraw' | 'transfer' | 'escrow';
    amount: number;
    recipientName?: string;
    senderName?: string;
    date: string;
    status: string;
  } | null>(null);

  // Propose Milestone States
  const [proposeTitle, setProposeTitle] = useState('');
  const [proposeDescription, setProposeDescription] = useState('');
  const [proposeAmount, setProposeAmount] = useState('');
  const [proposeDeadline, setProposeDeadline] = useState('');

  // Fund Milestone State
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'complete' | 'release' | 'none';
    milestoneId: string;
    title?: string;
    amount?: number;
  }>({
    isOpen: false,
    type: 'none',
    milestoneId: '',
  });

  // Selected Startup for Investors to explore
  const [exploreStartupId, setExploreStartupId] = useState<string>('');
  const [exploreMilestones, setExploreMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchPartners();
    fetchMilestones();
  }, [user]);

  // Real-time socket updates
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('register-user', user.id);
    });

    socket.on('payment-received', (data: any) => {
      toast.success(data.message, {
        icon: '💰',
        duration: 6000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #3b82f6',
        }
      });
      fetchHistory();
      fetchMilestones();
      if (exploreStartupId) {
        fetchStartupMilestones(exploreStartupId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, exploreStartupId]);

  useEffect(() => {
    if (exploreStartupId) {
      fetchStartupMilestones(exploreStartupId);
    } else {
      setExploreMilestones([]);
    }
  }, [exploreStartupId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/payments/history');
      setTransactions(response.data);

      // Update balance to reflect the latest on the server
      const meResponse = await api.get('/auth/me');
      setBalance(meResponse.data.walletBalance);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const targetRole = user?.role === 'entrepreneur' ? 'investors' : 'entrepreneurs';
      const response = await api.get(`/users/${targetRole}`);
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to load transfer recipients:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await api.get('/milestones');
      setMilestones(response.data);
    } catch (error) {
      console.error('Failed to load milestones:', error);
    }
  };

  const fetchStartupMilestones = async (startupId: string) => {
    try {
      const response = await api.get(`/milestones/${startupId}`);
      setExploreMilestones(response.data);
    } catch (error) {
      console.error('Failed to load startup milestones:', error);
    }
  };

  const downloadReceiptImage = () => {
    if (!receiptData) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check theme
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

    // Theme variables
    const bgGradStart = isDark ? '#1e1b4b' : '#f5f3ff';
    const bgGradEnd = isDark ? '#0f172a' : '#eff6ff';
    const outerBorder = isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.1)';
    const brandColor = isDark ? '#6366f1' : '#4f46e5';
    const brandText = isDark ? '#ffffff' : '#1e1b4b';
    const taglineText = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(30, 27, 75, 0.5)';
    const successBg = isDark ? '#10b981' : '#059669';
    const amountText = isDark ? '#ffffff' : '#0f172a';
    const labelText = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)';
    const valueText = isDark ? '#ffffff' : '#1e293b';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
    const footerText = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.4)';

    // 1. Draw modern gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 800);
    gradient.addColorStop(0, bgGradStart);
    gradient.addColorStop(1, bgGradEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 800);

    // 2. Draw outer border/decorations
    ctx.strokeStyle = outerBorder;
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, 570, 770);

    // 3. Draw Branding Logo
    ctx.fillStyle = brandColor;
    ctx.beginPath();
    ctx.arc(300, 85, 25, 0, Math.PI * 2);
    ctx.fill();

    // Letter inside logo mark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 300, 93);

    ctx.fillStyle = brandText;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('NEXUS', 300, 150);

    ctx.fillStyle = taglineText;
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('SECURE PAYMENTS & ESCROW', 300, 172);

    // 4. Draw Receipt Box card background
    ctx.fillStyle = cardBg;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(50, 200, 500, 480, 20);
    } else {
      ctx.rect(50, 200, 500, 480);
    }
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Draw Success Checkmark
    ctx.fillStyle = successBg;
    ctx.beginPath();
    ctx.arc(300, 250, 30, 0, Math.PI * 2);
    ctx.fill();

    // draw white check mark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(288, 250);
    ctx.lineTo(297, 259);
    ctx.lineTo(314, 241);
    ctx.stroke();

    ctx.fillStyle = successBg;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSACTION SUCCESSFUL', 300, 305);

    // 6. Draw Transaction Amount
    ctx.fillStyle = amountText;
    ctx.font = 'bold 36px Inter, sans-serif';
    const formattedAmt = formatLocalCurrency(receiptData.amount);
    ctx.fillText(formattedAmt, 300, 355);

    // 7. Draw Divider
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 385);
    ctx.lineTo(520, 385);
    ctx.stroke();

    // 8. Draw Details
    const details = [
      { label: 'TRANSACTION ID', value: receiptData.id },
      { label: 'DATE & TIME', value: receiptData.date },
      { label: 'TYPE', value: receiptData.type.toUpperCase() },
      { label: 'SENDER', value: receiptData.senderName || 'N/A' },
      { label: 'RECIPIENT', value: receiptData.recipientName || 'N/A' },
      { label: 'STATUS', value: receiptData.status.toUpperCase() }
    ];

    ctx.textAlign = 'left';
    let y = 430;
    details.forEach(item => {
      ctx.fillStyle = labelText;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(item.label, 90, y);

      ctx.fillStyle = valueText;
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.value, 510, y);
      ctx.textAlign = 'left';

      y += 42;
    });

    // 9. Draw Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = footerText;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Thank you for using Nexus. This receipt is automatically generated.', 300, 745);

    // 10. Download
    const link = document.createElement('a');
    link.download = `receipt_${receiptData.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amountInUSD = parseFloat(amount) / exchangeRate;
      const idempotencyKey = 'wth_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const response = await api.post('/payments/withdraw', {
        amount: amountInUSD,
        iban,
        idempotencyKey
      });
      setBalance(response.data.balance);
      toast.success(`Withdrawal request for ${formatLocalCurrency(parseFloat(amount))} submitted successfully! Status: Pending Admin Approval.`);

      const tx = response.data.transaction;
      setReceiptData({
        id: tx?.id || tx?._id || 'wth_' + Math.random().toString(36).substring(2, 6),
        type: 'withdraw',
        amount: parseFloat(amount),
        recipientName: `Bank IBAN: ${iban}`,
        senderName: 'Your Nexus Wallet',
        date: format(new Date(tx?.createdAt || Date.now()), 'dd MMM yyyy, hh:mm a'),
        status: tx?.status || 'pending'
      });

      setActiveModal('none');
      setAmount('');
      setIban('');
      fetchHistory();
      setShowReceipt(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'investor' && !agreementAccepted) {
      toast.error('You must accept the Terms of Investment.');
      return;
    }
    setIsSubmitting(true);
    try {
      const amountInUSD = parseFloat(amount) / exchangeRate;
      const idempotencyKey = 'txf_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const sendEscrow = user?.role === 'investor' ? isEscrow : false;
      const sendAgreement = user?.role === 'investor' ? agreementAccepted : true;

      const response = await api.post('/payments/transfer', {
        recipientId,
        amount: amountInUSD,
        isEscrow: sendEscrow,
        agreementAccepted: sendAgreement,
        milestoneTitle: sendEscrow ? milestoneTitle || undefined : undefined,
        idempotencyKey
      });
      setBalance(response.data.balance);

      if (sendEscrow) {
        toast.success(`Escrow initialized: held ${formatLocalCurrency(parseFloat(amount))} until milestone release.`);
      } else {
        toast.success(`Successfully transferred ${formatLocalCurrency(parseFloat(amount))}!`);
      }

      const tx = response.data.transaction;
      const partner = partners.find(p => p.id === recipientId);
      const recipientName = partner
        ? (partner.startupName ? `${partner.name} (${partner.startupName})` : partner.name)
        : 'Investment Partner';

      setReceiptData({
        id: tx?.id || tx?._id || 'txf_' + Math.random().toString(36).substring(2, 6),
        type: tx?.type || (sendEscrow ? 'escrow' : 'transfer'),
        amount: parseFloat(amount),
        recipientName,
        senderName: user?.name || 'Nexus User',
        date: format(new Date(tx?.createdAt || Date.now()), 'dd MMM yyyy, hh:mm a'),
        status: tx?.status || 'completed'
      });

      setActiveModal('none');
      setAmount('');
      setRecipientId('');
      setIsEscrow(false);
      setAgreementAccepted(false);
      setMilestoneTitle('');
      fetchHistory();
      fetchMilestones();
      setShowReceipt(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Investment transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProposeMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amountInUSD = parseFloat(proposeAmount) / exchangeRate;
      await api.post('/milestones', {
        title: proposeTitle,
        description: proposeDescription,
        targetAmount: amountInUSD,
        deadline: proposeDeadline || undefined
      });
      toast.success('Roadmap milestone proposed successfully!');
      setActiveModal('none');
      setProposeTitle('');
      setProposeDescription('');
      setProposeAmount('');
      setProposeDeadline('');
      fetchMilestones();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to propose milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerMarkComplete = (milestoneId: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'complete',
      milestoneId
    });
  };

  const handleFundMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    if (!agreementAccepted) {
      toast.error('You must accept the Terms of Investment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = 'fund_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const response = await api.post(`/milestones/${selectedMilestone.id}/fund`, {
        agreementAccepted,
        idempotencyKey
      });
      setBalance(response.data.balance);
      toast.success(`Milestone funded! $${selectedMilestone.targetAmount.toLocaleString()} is now held in Escrow.`);
      setActiveModal('none');
      setSelectedMilestone(null);
      setAgreementAccepted(false);
      fetchHistory();
      fetchMilestones();
      if (exploreStartupId) {
        fetchStartupMilestones(exploreStartupId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fund milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerReleaseEscrow = (milestoneId: string, title: string, amount: number) => {
    setConfirmModal({
      isOpen: true,
      type: 'release',
      milestoneId,
      title,
      amount
    });
  };


  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 dark:text-gray-150">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet & Payments</h1>
          <p className="text-gray-600 dark:text-gray-400">Simulate investments, make deposits via Stripe sandbox, and manage escrow milestones</p>
        </div>
        {user.role === 'admin' && (
          <button
            onClick={() => setIsAdminView(!isAdminView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm ${isAdminView
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-905 dark:text-gray-350 dark:border-gray-800 dark:hover:bg-gray-800'
              }`}
          >
            <span>🔧</span>
            {isAdminView ? 'Switch to User View' : 'Developer Admin Portal'}
          </button>
        )}
      </div>

      {isAdminView ? (
        <Card className="shadow-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-600 to-indigo-650 text-white p-5">
            <h3 className="font-bold text-lg">🔧 Developer Admin Review Panel</h3>
            <p className="text-xs opacity-90 mt-1">Review pending wallet withdrawals, simulate bank verification, and trigger Stripe sandbox payouts.</p>
          </CardHeader>
          <CardBody className="p-0">
            {isAdminLoading ? (
              <p className="text-center py-12 text-gray-500">Loading pending requests...</p>
            ) : pendingWithdrawals.length > 0 ? (
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
                        <td className="px-6 py-4 text-error-600 dark:text-error-400 font-medium">
                          {formatLocalCurrency(tx.fee || 0)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {formatLocalDate(new Date(tx.createdAt))}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
                            onClick={() => handleApproveWithdrawal(tx.id)}
                          >
                            Approve & Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20"
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
                <CircleDollarSign size={48} className="mx-auto text-gray-300 mb-3 animate-pulse" />
                <p className="font-medium">No pending withdrawal requests.</p>
                <p className="text-xs text-gray-400 mt-1">When users request a withdrawal from their wallet, it will appear here for review.</p>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sleek Credit Card / Wallet Dashboard */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden h-52 flex flex-col justify-between">
              {/* Background elements */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute left-10 bottom-0 w-24 h-24 bg-purple-500/30 rounded-full blur-xl" />

              <div className="flex justify-between items-center z-10">
                <span className="text-sm font-semibold tracking-wider opacity-90">NEXUS WALLET</span>
                <CreditCard size={28} className="opacity-95" />
              </div>

              <div className="my-2 z-10">
                <span className="text-xs uppercase opacity-75 font-semibold">Available Balance</span>
                <h2 className="text-3xl font-bold tracking-tight mt-1">
                  {formatLocalCurrency(balance)}
                </h2>
              </div>

              <div className="flex justify-between items-center mt-4 z-10 text-xs">
                <div>
                  <p className="opacity-75 font-semibold">CARD HOLDER</p>
                  <p className="font-bold tracking-wider mt-0.5">{user.name.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="opacity-75 font-semibold">ROLE</p>
                  <p className="font-bold tracking-wider mt-0.5 uppercase">{user.role}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <Card>
              <CardBody className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setAmount('');
                    setActiveModal('deposit');
                  }}
                  className="flex flex-col items-center justify-center py-4 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <ArrowDownLeft size={20} className="mb-1" />
                  <span className="text-xs font-semibold">Deposit</span>
                </button>

                <button
                  onClick={() => {
                    setAmount('');
                    setActiveModal('withdraw');
                  }}
                  className="flex flex-col items-center justify-center py-4 bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 rounded-lg hover:bg-error-100 dark:hover:bg-error-900/50 transition-colors"
                >
                  <ArrowUpRight size={20} className="mb-1" />
                  <span className="text-xs font-semibold">Withdraw</span>
                </button>

                <button
                  onClick={() => {
                    setAmount('');
                    setRecipientId('');
                    setIsEscrow(false);
                    setAgreementAccepted(false);
                    setMilestoneTitle('');
                    setActiveModal('transfer');
                  }}
                  className="flex flex-col items-center justify-center py-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Send size={20} className="mb-1" />
                  <span className="text-xs font-semibold">Transfer</span>
                </button>
              </CardBody>
            </Card>
          </div>

          {/* Dashboard Tabs & Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row justify-between items-center border-b border-gray-100 dark:border-gray-700/60 p-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-all ${activeTab === 'history'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <History size={16} />
                    Transaction History
                  </button>
                  <button
                    onClick={() => setActiveTab('milestones')}
                    className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-all ${activeTab === 'milestones'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <Layers size={16} />
                    Escrow Milestones
                  </button>
                </div>

                {activeTab === 'milestones' && user.role === 'entrepreneur' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setProposeTitle('');
                      setProposeDescription('');
                      setProposeAmount('');
                      setProposeDeadline('');
                      setActiveModal('propose');
                    }}
                    leftIcon={<Plus size={14} />}
                  >
                    Propose Milestone
                  </Button>
                )}
              </CardHeader>
              <CardBody className="p-0 flex-1">

                {/* TAB 1: Transaction History */}
                {activeTab === 'history' && (
                  isLoading ? (
                    <p className="text-center py-8 text-gray-500">Loading transactions...</p>
                  ) : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Details</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {transactions.map(tx => {
                            const isIncome = (tx.type === 'deposit') ||
                              (tx.type === 'transfer' && tx.recipientId?.id === user.id) ||
                              (tx.type === 'escrow_release' && tx.recipientId?.id === user.id);

                            const isIncomingEscrow = (tx.type === 'escrow' && tx.recipientId?.id === user.id);
                            const isPendingWithdraw = (tx.type === 'withdraw' && tx.status === 'pending');

                            // Compute description
                            let description = '';
                            if (tx.type === 'deposit') {
                              description = 'Funds Deposit (Stripe)';
                            } else if (tx.type === 'withdraw') {
                              description = 'Bank Account Withdrawal';
                            } else if (tx.type === 'transfer') {
                              if (tx.userId.id === user.id) {
                                description = `Investment to ${tx.recipientId?.startupName || tx.recipientId?.name}`;
                              } else {
                                description = `Investment received from ${tx.userId.name}`;
                              }
                            } else if (tx.type === 'escrow') {
                              if (tx.userId.id === user.id) {
                                description = `Escrow Hold for ${tx.recipientId?.startupName || tx.recipientId?.name}`;
                              } else {
                                description = `Escrow Hold received from ${tx.userId.name}`;
                              }
                            } else if (tx.type === 'escrow_release') {
                              if (tx.userId.id === user.id) {
                                description = `Escrow Released to ${tx.recipientId?.startupName || tx.recipientId?.name}`;
                              } else {
                                description = `Escrow Released by ${tx.userId.name}`;
                              }
                            }

                            // If milestone reference is present, append milestone title
                            if (tx.milestoneId?.title) {
                              description += ` (${tx.milestoneId.title})`;
                            }

                            return (
                              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                  {formatLocalDate(new Date(tx.createdAt))}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                  {description}
                                </td>
                                <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">
                                  {tx.type.replace('_', ' ')}
                                </td>
                                <td className={`px-6 py-4 font-semibold ${isIncomingEscrow
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : isPendingWithdraw
                                      ? 'text-amber-600 dark:text-amber-500'
                                      : isIncome
                                        ? 'text-success-600'
                                        : 'text-error-600'
                                  }`}>
                                  {isIncomingEscrow
                                    ? '• '
                                    : isPendingWithdraw
                                      ? '• '
                                      : isIncome
                                        ? '+'
                                        : '-'
                                  }
                                  {formatLocalCurrency(tx.amount)}
                                  {isIncomingEscrow && <span className="text-[10px] block font-normal text-indigo-500 dark:text-indigo-400">(Held in Escrow)</span>}
                                  {isPendingWithdraw && <span className="text-[10px] block font-normal text-amber-500">(Pending Review)</span>}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${tx.status === 'completed'
                                      ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-300'
                                      : tx.status === 'held'
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                        : tx.status === 'pending'
                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                                          : 'bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-300'
                                    }`}>
                                    {tx.status === 'pending' ? 'pending approval' : tx.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <CircleDollarSign size={40} className="mx-auto text-gray-400 mb-2" />
                      <p>No transactions found in this wallet.</p>
                    </div>
                  )
                )}

                {/* TAB 2: Escrow Milestones */}
                {activeTab === 'milestones' && (
                  <div className="p-4 space-y-6">

                    {/* FOR INVESTOR: Explore/Fund Partner Milestones */}
                    {user.role === 'investor' && (
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 mb-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Explore Startup Roadmaps</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">View proposed milestones from connected startups and fund them directly.</p>
                          </div>
                          <select
                            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500 max-w-xs w-full"
                            value={exploreStartupId}
                            onChange={(e) => setExploreStartupId(e.target.value)}
                          >
                            <option value="">-- Choose Connection --</option>
                            {partners.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.startupName || p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {exploreStartupId && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {exploreMilestones.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {exploreMilestones.filter(m => m.status === 'pending').map(m => (
                                  <div key={m.id} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col justify-between shadow-sm">
                                    <div>
                                      <div className="flex justify-between items-start gap-2">
                                        <h5 className="font-semibold text-sm text-gray-900 dark:text-white">{m.title}</h5>
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
                                          Proposed
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{m.description || 'No description provided.'}</p>
                                      <div className="mt-3 flex items-center justify-between text-xs font-medium">
                                        <span className="text-gray-500">Target:</span>
                                        <span className="text-gray-900 dark:text-white font-bold">{formatLocalCurrency(m.targetAmount)}</span>
                                      </div>
                                      {m.deadline && (
                                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                                          <span>Deadline:</span>
                                          <span>{formatLocalDate(new Date(m.deadline))}</span>
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      className="mt-4"
                                      onClick={() => {
                                        setSelectedMilestone(m);
                                        setAgreementAccepted(false);
                                        setActiveModal('fund');
                                      }}
                                    >
                                      Fund via Escrow
                                    </Button>
                                  </div>
                                ))}
                                {exploreMilestones.filter(m => m.status === 'pending').length === 0 && (
                                  <p className="text-center py-4 text-xs text-gray-500 col-span-2">No proposed roadmaps waiting for funding for this startup.</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-center py-4 text-xs text-gray-500">No milestones registered for this startup.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACTIVE MILESTONES TIMELINE */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        {user.role === 'investor' ? 'Your Funded Escrow Agreements' : 'Startup Roadmap & Milestones'}
                      </h4>

                      {milestones.length > 0 ? (
                        <div className="space-y-4">
                          {milestones.map(m => {
                            const isPendingProposed = m.status === 'pending';
                            const isInProgress = m.status === 'in_progress';
                            const isCompleted = m.status === 'completed';
                            const isReleased = m.status === 'released';

                            return (
                              <div
                                key={m.id}
                                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 shadow-sm ${isReleased
                                    ? 'border-gray-100 dark:border-gray-800 opacity-80'
                                    : isCompleted
                                      ? 'border-green-200 dark:border-green-900/30 bg-green-50/5 dark:bg-green-950/5'
                                      : 'border-indigo-100 dark:border-indigo-950/50'
                                  }`}
                              >
                                <div className="flex gap-3 items-start">
                                  <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${isReleased
                                      ? 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                      : isCompleted
                                        ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 animate-pulse'
                                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                                    }`}>
                                    {isReleased ? <Unlock size={18} /> : <Lock size={18} />}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{m.title}</h5>

                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider ${isReleased
                                          ? 'bg-gray-150 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                          : isCompleted
                                            ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-300'
                                            : isInProgress
                                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                                        }`}>
                                        {m.status.replace('_', ' ')}
                                      </span>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium pt-1">
                                      {user.role === 'investor' ? (
                                        <span>Startup: <span className="text-gray-600 dark:text-gray-300">{m.startupId?.startupName || m.startupId?.name}</span></span>
                                      ) : (
                                        <span>Funder: <span className="text-gray-600 dark:text-gray-300">{m.investorId?.name || 'Unfunded Roadmap'}</span></span>
                                      )}

                                      {m.deadline && (
                                        <span className="flex items-center gap-1">
                                          <Calendar size={12} />
                                          Due {formatLocalDate(new Date(m.deadline))}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 self-stretch sm:self-center justify-between shrink-0">
                                  <div className="text-right">
                                    <span className="text-xs text-gray-500 block">Funds Escrowed</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                      {formatLocalCurrency(m.targetAmount)}
                                    </span>
                                  </div>

                                  {/* ACTIONS BASED ON ROLE AND STATUS */}
                                  {user.role === 'entrepreneur' && (isPendingProposed || isInProgress) && (
                                    <Button
                                      size="sm"
                                      onClick={() => triggerMarkComplete(m.id)}
                                    >
                                      Mark as Complete
                                    </Button>
                                  )}

                                  {user.role === 'investor' && isCompleted && (
                                    <Button
                                      size="sm"
                                      onClick={() => triggerReleaseEscrow(m.id, m.title, m.targetAmount)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      Approve & Release
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Layers size={36} className="mx-auto text-gray-400 mb-2" />
                          <p>No escrow milestones registered.</p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Deposit (Stripe Checkout) */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="bg-indigo-600 text-white rounded-t-lg flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={20} />
                <h3 className="font-semibold text-lg">Stripe Secure Checkout</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <Elements stripe={stripePromise}>
                <StripeDepositForm
                  exchangeRate={exchangeRate}
                  currency={currency}
                  formatLocalCurrency={formatLocalCurrency}
                  onClose={() => setActiveModal('none')}
                  onSuccess={(newBalance, tx) => {
                    setBalance(newBalance);
                    setReceiptData({
                      id: tx?.id || tx?._id || 'dep_' + Math.random().toString(36).substring(2, 6),
                      type: 'deposit',
                      amount: tx.amount * exchangeRate, // Convert back to local currency for receipt
                      recipientName: 'Your Nexus Wallet',
                      senderName: 'Stripe Sandbox',
                      date: format(new Date(tx?.createdAt || Date.now()), 'dd MMM yyyy, hh:mm a'),
                      status: tx?.status || 'completed'
                    });
                    setActiveModal('none');
                    setAmount('');
                    fetchHistory();
                    setShowReceipt(true);
                  }}
                />
              </Elements>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 2. Withdraw */}
      {activeModal === 'withdraw' && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Withdrawal Request</h3>
              <button onClick={() => setActiveModal('none')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleWithdraw} className="space-y-4">
                <Input
                  label={`Amount to Withdraw (${currency})`}
                  type="number"
                  placeholder={`e.g. ${Math.ceil(50 * exchangeRate)}`}
                  min={Math.ceil(10 * exchangeRate)}
                  max={balance * exchangeRate}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  fullWidth
                />

                <Input
                  label="Bank Account Routing/IBAN"
                  placeholder="US12345678901234"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  required
                  fullWidth
                />

                {/* Professional fee and limits summary */}
                <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Minimum Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatLocalCurrency(10 * exchangeRate)} ($10.00 USD)</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Processing Fee</span>
                    <span className="font-semibold text-error-600 dark:text-error-400">+{formatLocalCurrency(1 * exchangeRate)} ($1.00 USD)</span>
                  </div>
                  {parseFloat(amount) > 0 && (
                    <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700 font-semibold text-xs">
                      <span className="text-gray-900 dark:text-white font-medium">Total Reserved From Balance</span>
                      <span className="text-gray-900 dark:text-white font-bold">{formatLocalCurrency((parseFloat(amount) || 0) + 1 * exchangeRate)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting} className="bg-error-650 hover:bg-error-700 text-white">
                    Request Withdrawal
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 3. Transfer / Invest */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {user.role === 'investor' ? 'Send Startup Investment' : 'Transfer Funds'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-1">
                    Select Recipient
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-200 h-[50px] transition-all"
                      onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
                    >
                      {recipientId ? (
                        (() => {
                          const partner = partners.find(p => p.id === recipientId);
                          if (partner) {
                            return (
                              <div className="flex items-center gap-3">
                                <Avatar src={partner.avatarUrl} alt={partner.name} size="sm" />
                                <div className="text-left leading-tight">
                                  <div className="font-semibold text-gray-955 dark:text-white text-sm">{partner.name}</div>
                                  {partner.startupName && <div className="text-xs text-gray-500">{partner.startupName}</div>}
                                </div>
                              </div>
                            );
                          }
                          return <span className="text-gray-500">-- Choose Recipient --</span>;
                        })()
                      ) : (
                        <span className="text-gray-500">-- Choose Recipient --</span>
                      )}
                      <span className="text-gray-400 text-xs">▼</span>
                    </button>

                    {isPartnerDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-xl max-h-60 overflow-y-auto">
                        {partners.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center">No connection partners found</div>
                        ) : (
                          partners.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-colors border-b border-gray-150 dark:border-gray-900 last:border-0"
                              onClick={() => {
                                setRecipientId(p.id);
                                setIsPartnerDropdownOpen(false);
                              }}
                            >
                              <Avatar src={p.avatarUrl} alt={p.name} size="sm" />
                              <div className="leading-tight">
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">{p.name}</div>
                                {p.startupName && <div className="text-xs text-gray-500">{p.startupName}</div>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Input
                  label={`Amount to Transfer (${currency})`}
                  type="number"
                  placeholder={`e.g. ${Math.ceil(5000 * exchangeRate)}`}
                  max={balance * exchangeRate}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  fullWidth
                />

                {/* Escrow and Terms Section for Investors */}
                {user.role === 'investor' && (
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">Hold in Escrow</label>
                        <p className="text-xs text-gray-500">Lock funds until proposed milestone completion.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEscrow}
                        onChange={(e) => setIsEscrow(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-gray-100 border-gray-300 focus:ring-indigo-500 focus:ring-2 focus:ring-offset-2"
                      />
                    </div>

                    {isEscrow && (
                      <Input
                        label="Milestone/Escrow Agreement Title"
                        placeholder="e.g. Prototype Development Milestone"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        required
                        fullWidth
                      />
                    )}

                    <div className="flex gap-2 items-start bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={agreementAccepted}
                        onChange={(e) => setAgreementAccepted(e.target.checked)}
                        className="w-3.5 h-3.5 rounded mt-0.5 shrink-0 accent-indigo-600"
                        required
                      />
                      <label>
                        I agree to the <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline cursor-pointer">Terms of Startup Investment & Escrow Placement Policy</span>.
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={user.role === 'investor' && !agreementAccepted}
                  >
                    Execute Transfer
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 4. Propose Milestone (Entrepreneur only) */}
      {activeModal === 'propose' && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Propose Roadmap Milestone</h3>
              <button onClick={() => setActiveModal('none')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleProposeMilestone} className="space-y-4">
                <Input
                  label="Milestone Title"
                  placeholder="e.g. Beta MVP Launch"
                  value={proposeTitle}
                  onChange={(e) => setProposeTitle(e.target.value)}
                  required
                  fullWidth
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description & Deliverables
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details on what outputs will define the completion of this milestone."
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-200"
                    value={proposeDescription}
                    onChange={(e) => setProposeDescription(e.target.value)}
                  />
                </div>

                <Input
                  label={`Funding Target (${currency})`}
                  type="number"
                  placeholder={`e.g. ${Math.ceil(15000 * exchangeRate)}`}
                  value={proposeAmount}
                  onChange={(e) => setProposeAmount(e.target.value)}
                  required
                  fullWidth
                />

                <Input
                  label="Target Deadline"
                  type="date"
                  value={proposeDeadline}
                  onChange={(e) => setProposeDeadline(e.target.value)}
                  fullWidth
                />

                <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Propose Milestone
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 5. Fund Proposed Milestone Modal (Investor only) */}
      {activeModal === 'fund' && selectedMilestone && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Fund Escrow Agreement</h3>
              <button onClick={() => {
                setActiveModal('none');
                setSelectedMilestone(null);
              }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleFundMilestone} className="space-y-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300">{selectedMilestone.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{selectedMilestone.description}</p>

                  <div className="flex justify-between text-xs font-semibold pt-2 border-t border-indigo-100/50 dark:border-indigo-900/20">
                    <span className="text-gray-500">Escrow Amount:</span>
                    <span className="text-indigo-800 dark:text-indigo-300 font-bold">{formatLocalCurrency(selectedMilestone.targetAmount)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 items-start bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={agreementAccepted}
                      onChange={(e) => setAgreementAccepted(e.target.checked)}
                      className="w-3.5 h-3.5 rounded mt-0.5 shrink-0 accent-indigo-600"
                      required
                    />
                    <label>
                      I agree to the <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline cursor-pointer">Terms of Startup Investment & Escrow Placement Policy</span>.
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => {
                    setActiveModal('none');
                    setSelectedMilestone(null);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={!agreementAccepted}
                  >
                    Fund & Escrow
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
      {/* 5. Payment Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border border-gray-100 dark:border-none bg-gradient-to-br from-white to-gray-50 dark:from-indigo-950 dark:to-slate-900 text-gray-900 dark:text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <CardBody className="p-8 text-center flex flex-col items-center">
              {/* Branding */}
              <div className="mb-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm dark:shadow-lg">
                  <span className="font-bold text-indigo-600 dark:text-white text-xl">N</span>
                </div>
                <h4 className="font-bold text-lg tracking-wider text-gray-900 dark:text-white">NEXUS</h4>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-300 font-medium tracking-widest uppercase">Secure Payments & Escrow</p>
              </div>

              {/* Status icon */}
              {receiptData.status === 'pending' ? (
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-full flex items-center justify-center mb-4 mt-2">
                  <History size={32} className="animate-spin animate-infinite" style={{ animationDuration: '3s' }} />
                </div>
              ) : (
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full flex items-center justify-center mb-4 mt-2">
                  <CheckCircle size={32} className="animate-bounce" />
                </div>
              )}

              <span className={receiptData.status === 'pending'
                ? "text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wider uppercase mb-1"
                : "text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-1"
              }>
                {receiptData.status === 'pending' ? 'Withdrawal Pending Approval' : 'Transaction Successful'}
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
                {formatLocalCurrency(receiptData.amount)}
              </h2>

              {/* Receipt Details Box */}
              <div className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-left space-y-3 mb-6 shadow-sm dark:shadow-none">
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white select-all">{receiptData.id}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Date & Time</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.date}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Type</span>
                  <span className="text-gray-900 dark:text-white font-semibold text-xs uppercase">{receiptData.type}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Sender</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.senderName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Recipient</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.recipientName || 'N/A'}</span>
                </div>
              </div>

              <div className="w-full flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowReceipt(false)}
                  className="border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Close
                </Button>
                <Button
                  fullWidth
                  onClick={downloadReceiptImage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                >
                  Download Receipt
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 6. Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-2xl overflow-hidden animate-scale-up">
            <CardBody className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck size={26} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {confirmModal.type === 'complete' ? 'Confirm Completion' : 'Approve & Release Funds'}
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {confirmModal.type === 'complete'
                  ? 'Are you sure you want to mark this milestone as completed? This will notify the investor to release the locked funds.'
                  : `Are you sure you want to approve and release ${formatLocalCurrency(confirmModal.amount || 0)} for the milestone "${confirmModal.title}"? This action is irreversible.`}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setConfirmModal({ isOpen: false, type: 'none', milestoneId: '' })}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      if (confirmModal.type === 'complete') {
                        await api.put(`/milestones/${confirmModal.milestoneId}/complete`);
                        toast.success('Milestone marked completed. Investor has been notified.');
                        fetchMilestones();
                      } else {
                        const response = await api.post(`/milestones/${confirmModal.milestoneId}/release`);
                        setBalance(response.data.balance);
                        toast.success('Escrow funds successfully released to startup wallet!');
                        fetchHistory();
                        fetchMilestones();
                      }
                      setConfirmModal({ isOpen: false, type: 'none', milestoneId: '' });
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Operation failed.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  isLoading={isSubmitting}
                  className={confirmModal.type === 'complete' ? 'bg-indigo-600 hover:bg-indigo-750 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                >
                  Confirm
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
