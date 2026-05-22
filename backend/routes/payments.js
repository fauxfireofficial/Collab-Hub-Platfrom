import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/payments/deposit
// @desc    Deposit funds into wallet (simulates Stripe mockup checkout success)
router.post('/deposit', auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid deposit amount' });
  }

  try {
    const user = await User.findById(req.user.id);
    user.walletBalance += parseFloat(amount);
    await user.save();

    const tx = new Transaction({
      userId: req.user.id,
      type: 'deposit',
      amount: parseFloat(amount),
      status: 'Completed'
    });

    await tx.save();
    res.json({ balance: user.walletBalance, transaction: tx });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ message: 'Server error processing deposit' });
  }
});

// @route   POST /api/payments/withdraw
// @desc    Withdraw funds from wallet
router.post('/withdraw', auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid withdrawal amount' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient funds for withdrawal' });
    }

    user.walletBalance -= parseFloat(amount);
    await user.save();

    const tx = new Transaction({
      userId: req.user.id,
      type: 'withdraw',
      amount: parseFloat(amount),
      status: 'Completed'
    });

    await tx.save();
    res.json({ balance: user.walletBalance, transaction: tx });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error processing withdrawal' });
  }
});

// @route   POST /api/payments/transfer
// @desc    Transfer investment funds from Investor to Entrepreneur
router.post('/transfer', auth, async (req, res) => {
  const { recipientId, amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid transfer amount' });
  }

  try {
    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (sender.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient funds for transfer' });
    }

    // Deduct from sender, add to recipient
    sender.walletBalance -= parseFloat(amount);
    recipient.walletBalance += parseFloat(amount);

    // If investor transferring to entrepreneur, increment total investments
    if (sender.role === 'investor') {
      sender.totalInvestments += 1;
    }

    await sender.save();
    await recipient.save();

    const tx = new Transaction({
      userId: req.user.id,
      type: 'transfer',
      amount: parseFloat(amount),
      recipientId: recipientId,
      status: 'Completed'
    });

    await tx.save();
    res.json({ balance: sender.walletBalance, transaction: tx });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error processing transfer' });
  }
});

// @route   GET /api/payments/history
// @desc    Get transaction history for current user
router.get('/history', auth, async (req, res) => {
  try {
    const history = await Transaction.find({
      $or: [
        { userId: req.user.id },
        { recipientId: req.user.id }
      ]
    })
    .populate('userId', 'name email role')
    .populate('recipientId', 'name email role startupName')
    .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error retrieving transaction history' });
  }
});

export default router;
