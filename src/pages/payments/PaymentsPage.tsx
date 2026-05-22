import React, { useState, useEffect } from 'react';
import { CircleDollarSign, ArrowUpRight, ArrowDownLeft, Send, History, CreditCard, ShieldCheck, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
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
}

interface ConnectionUser {
  id: string;
  name: string;
  startupName?: string;
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(user?.walletBalance || 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<ConnectionUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'deposit' | 'withdraw' | 'transfer'>('none');
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stripe mockup states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('•••');

  useEffect(() => {
    fetchHistory();
    fetchPartners();
  }, [user]);

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
      // Find list of active partners to transfer to
      const targetRole = user?.role === 'entrepreneur' ? 'investors' : 'entrepreneurs';
      const response = await api.get(`/users/${targetRole}`);
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to load transfer recipients:', error);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post('/payments/deposit', { amount: parseFloat(amount) });
      setBalance(response.data.balance);
      toast.success(`Successfully deposited $${amount} via Stripe Sandbox!`);
      setActiveModal('none');
      setAmount('');
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post('/payments/withdraw', { amount: parseFloat(amount) });
      setBalance(response.data.balance);
      toast.success(`Withdrawal of $${amount} requested. Funds are being sent to your bank.`);
      setActiveModal('none');
      setAmount('');
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post('/payments/transfer', { 
        recipientId, 
        amount: parseFloat(amount) 
      });
      setBalance(response.data.balance);
      toast.success(`Successfully invested $${amount} into startup!`);
      setActiveModal('none');
      setAmount('');
      setRecipientId('');
      fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Investment transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
        <p className="text-gray-600">Simulate investments, make deposits via Stripe sandbox, and review transaction histories</p>
      </div>

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
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                onClick={() => setActiveModal('deposit')}
                className="flex flex-col items-center justify-center py-4 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ArrowDownLeft size={20} className="mb-1" />
                <span className="text-xs font-semibold">Deposit</span>
              </button>
              
              <button 
                onClick={() => setActiveModal('withdraw')}
                className="flex flex-col items-center justify-center py-4 bg-error-50 text-error-700 rounded-lg hover:bg-error-100 transition-colors"
              >
                <ArrowUpRight size={20} className="mb-1" />
                <span className="text-xs font-semibold">Withdraw</span>
              </button>
              
              <button 
                onClick={() => setActiveModal('transfer')}
                className="flex flex-col items-center justify-center py-4 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Send size={20} className="mb-1" />
                <span className="text-xs font-semibold">Transfer</span>
              </button>
            </CardBody>
          </Card>
        </div>

        {/* Transaction History Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-2">
                <History size={18} className="text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {isLoading ? (
                <p className="text-center py-8 text-gray-500">Loading transactions...</p>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Details</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map(tx => {
                        const isIncome = (tx.type === 'deposit') || (tx.type === 'transfer' && tx.recipientId?.id === user.id);
                        
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
                        }

                        return (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                              {format(new Date(tx.createdAt), 'PPp')}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {description}
                            </td>
                            <td className="px-6 py-4 capitalize text-gray-500">
                              {tx.type}
                            </td>
                            <td className={`px-6 py-4 font-semibold ${isIncome ? 'text-success-600' : 'text-error-600'}`}>
                              {isIncome ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success-50 text-success-700">
                                {tx.status}
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
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Deposit (Stripe Checkout mockup) */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2 text-xs text-indigo-800">
                  <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0" />
                  <span>You are operating in Stripe Sandbox mode. Dummy cards will work automatically.</span>
                </div>

                <Input
                  label="Amount to Deposit ($)"
                  type="number"
                  placeholder="e.g. 100"
                  min="5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  fullWidth
                />

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</h4>
                  <Input
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    fullWidth
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiry Date"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                    />
                    <Input
                      label="CVC"
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Deposit Funds
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 2. Withdraw */}
      {activeModal === 'withdraw' && (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 p-4">
              <h3 className="font-semibold text-lg text-gray-900">Withdrawal Request</h3>
              <button onClick={() => setActiveModal('none')} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleWithdraw} className="space-y-4">
                <Input
                  label="Amount to Withdraw ($)"
                  type="number"
                  placeholder="e.g. 50"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  fullWidth
                />
                
                <Input
                  label="Bank Account Routing/IBAN"
                  placeholder="US12345678901234"
                  required
                  fullWidth
                />

                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting} className="bg-error-600 hover:bg-error-700 text-white">
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
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 p-4">
              <h3 className="font-semibold text-lg text-gray-900">
                {user.role === 'investor' ? 'Send Startup Investment' : 'Transfer Funds'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Recipient
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Recipient --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.startupName ? `(${p.startupName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Amount to Transfer ($)"
                  type="number"
                  placeholder="e.g. 5000"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  fullWidth
                />

                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setActiveModal('none')}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Execute Transfer
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
