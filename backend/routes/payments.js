import express from 'express';
import Transaction from '../models/Transaction.js';
import Milestone from '../models/Milestone.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from './notifications.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// ── Input Validation Helper ──────────────────────────────────────────────────
const validateAmount = (amount) => {
  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0 || parsed > 10_000_000) {
    return null;
  }
  return parsed;
};

// ── Idempotency Check Helper ─────────────────────────────────────────────────
const checkIdempotency = async (key) => {
  if (!key) return null;
  const existing = await Transaction.findOne({ idempotencyKey: key });
  return existing;
};

// @route   POST /api/payments/deposit
// @desc    Deposit funds into wallet (simulates Stripe mockup checkout success)
router.post('/deposit', auth, async (req, res) => {
  const { amount, idempotencyKey } = req.body;
  const parsedAmount = validateAmount(amount);
  if (!parsedAmount) {
    return res.status(400).json({ message: 'Invalid deposit amount. Must be a positive number.' });
  }

  try {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey);
      if (existing) {
        return res.json({ balance: (await User.findById(req.user.id)).walletBalance, transaction: existing, duplicate: true });
      }
    }

    const user = await User.findById(req.user.id);
    user.walletBalance += parsedAmount;
    await user.save();

    const tx = new Transaction({
      userId: req.user.id,
      type: 'deposit',
      amount: parsedAmount,
      status: 'completed',
      idempotencyKey: idempotencyKey || undefined
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
  const { amount, idempotencyKey } = req.body;
  const parsedAmount = validateAmount(amount);
  if (!parsedAmount) {
    return res.status(400).json({ message: 'Invalid withdrawal amount. Must be a positive number.' });
  }

  try {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey);
      if (existing) {
        return res.json({ balance: (await User.findById(req.user.id)).walletBalance, transaction: existing, duplicate: true });
      }
    }

    const user = await User.findById(req.user.id);
    if (user.walletBalance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient funds for withdrawal' });
    }

    user.walletBalance -= parsedAmount;
    await user.save();

    const tx = new Transaction({
      userId: req.user.id,
      type: 'withdraw',
      amount: parsedAmount,
      status: 'completed',
      idempotencyKey: idempotencyKey || undefined
    });

    await tx.save();
    res.json({ balance: user.walletBalance, transaction: tx });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error processing withdrawal' });
  }
});

// @route   POST /api/payments/transfer
// @desc    Transfer investment funds – either directly or via escrow hold
router.post('/transfer', auth, async (req, res) => {
  const { recipientId, amount, isEscrow, agreementAccepted, idempotencyKey, milestoneTitle } = req.body;
  const parsedAmount = validateAmount(amount);
  if (!parsedAmount) {
    return res.status(400).json({ message: 'Invalid transfer amount. Must be a positive number.' });
  }

  if (!agreementAccepted) {
    return res.status(400).json({ message: 'You must accept the Terms of Investment before proceeding.' });
  }

  try {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey);
      if (existing) {
        return res.json({ balance: (await User.findById(req.user.id)).walletBalance, transaction: existing, duplicate: true });
      }
    }

    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (sender.walletBalance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient funds for transfer' });
    }

    // Always deduct from sender
    sender.walletBalance -= parsedAmount;

    let milestone = null;

    if (isEscrow) {
      // ── ESCROW MODE ──────────────────────────────────────────────────────────
      // Funds are held – NOT added to recipient until milestone release

      const tx = new Transaction({
        userId: req.user.id,
        type: 'escrow',
        amount: parsedAmount,
        recipientId: recipientId,
        status: 'held',
        agreementAccepted: true,
        idempotencyKey: idempotencyKey || undefined
      });

      await tx.save();

      // Create an associated Milestone
      milestone = new Milestone({
        title: milestoneTitle || `Investment Milestone – ${recipient.startupName || recipient.name}`,
        description: `Escrow of $${parsedAmount.toLocaleString()} held until milestone completion.`,
        startupId: recipientId,
        investorId: req.user.id,
        targetAmount: parsedAmount,
        status: 'pending',
        transactionId: tx._id
      });

      await milestone.save();

      // Update TX with milestone reference
      tx.milestoneId = milestone._id;
      await tx.save();

      // If investor transferring to entrepreneur, increment total investments
      if (sender.role === 'investor') {
        sender.totalInvestments += 1;
      }
      await sender.save();

      // ── Real-time Notification ──────────────────────────────────────────────
      const io = req.app.get('io');
      if (io) {
        io.to(recipientId).emit('payment-received', {
          type: 'escrow',
          amount: parsedAmount,
          senderName: sender.name,
          message: `${sender.name} has placed $${parsedAmount.toLocaleString()} in escrow for your startup!`
        });
      }

      // Save DB notification & Emit real-time notification
      await createNotification(io, {
        recipientId,
        senderId: req.user.id,
        type: 'investment',
        content: `${sender.name} has placed $${parsedAmount.toLocaleString()} in escrow for your startup!`,
        link: '/payments'
      });

      return res.json({ balance: sender.walletBalance, transaction: tx, milestone });

    } else {
      // ── DIRECT TRANSFER MODE ─────────────────────────────────────────────────
      recipient.walletBalance += parsedAmount;

      if (sender.role === 'investor') {
        sender.totalInvestments += 1;
      }

      await sender.save();
      await recipient.save();

      const tx = new Transaction({
        userId: req.user.id,
        type: 'transfer',
        amount: parsedAmount,
        recipientId: recipientId,
        status: 'completed',
        agreementAccepted: true,
        idempotencyKey: idempotencyKey || undefined
      });

      await tx.save();

      // ── Real-time Notification ──────────────────────────────────────────────
      const io = req.app.get('io');
      if (io) {
        io.to(recipientId).emit('payment-received', {
          type: 'transfer',
          amount: parsedAmount,
          senderName: sender.name,
          message: `${sender.name} invested $${parsedAmount.toLocaleString()} in your startup!`
        });
      }

      // Save DB notification & Emit real-time notification
      await createNotification(io, {
        recipientId,
        senderId: req.user.id,
        type: 'investment',
        content: `${sender.name} invested $${parsedAmount.toLocaleString()} in your startup.`,
        link: '/payments'
      });

      return res.json({ balance: sender.walletBalance, transaction: tx });
    }

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error processing transfer' });
  }
});

// @route   POST /api/payments/escrow/release/:milestoneId
// @desc    Release escrowed funds when milestone is approved
router.post('/escrow/release/:milestoneId', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Only the investor who created the escrow can release
    if (milestone.investorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the investor who created this escrow can release funds.' });
    }

    if (milestone.status === 'released') {
      return res.status(400).json({ message: 'Funds have already been released for this milestone.' });
    }

    // Find the held transaction
    const escrowTx = await Transaction.findById(milestone.transactionId);
    if (!escrowTx || escrowTx.status !== 'held') {
      return res.status(400).json({ message: 'No held funds found for this milestone.' });
    }

    // Release funds to recipient
    const recipient = await User.findById(escrowTx.recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found.' });
    }

    recipient.walletBalance += escrowTx.amount;
    await recipient.save();

    // Update transaction status
    escrowTx.status = 'completed';
    await escrowTx.save();

    // Create a release record
    const releaseTx = new Transaction({
      userId: req.user.id,
      type: 'escrow_release',
      amount: escrowTx.amount,
      recipientId: escrowTx.recipientId,
      status: 'completed',
      milestoneId: milestone._id
    });
    await releaseTx.save();

    // Update milestone
    milestone.status = 'released';
    milestone.releasedAt = new Date();
    await milestone.save();

    // ── Real-time Notification ──────────────────────────────────────────────
    const io = req.app.get('io');
    if (io) {
      io.to(escrowTx.recipientId.toString()).emit('payment-received', {
        type: 'escrow_release',
        amount: escrowTx.amount,
        senderName: (await User.findById(req.user.id)).name,
        message: `Escrow funds of $${escrowTx.amount.toLocaleString()} have been released to your wallet!`
      });
    }

    // Save DB notification & Emit real-time notification
    const investor = await User.findById(req.user.id);
    await createNotification(io, {
      recipientId: escrowTx.recipientId,
      senderId: req.user.id,
      type: 'escrow_release',
      content: `$${escrowTx.amount.toLocaleString()} escrow funds have been released to your wallet.`,
      link: '/payments'
    });

    res.json({ 
      balance: investor.walletBalance, 
      milestone, 
      transaction: releaseTx 
    });
  } catch (error) {
    console.error('Escrow release error:', error);
    res.status(500).json({ message: 'Server error releasing escrow funds' });
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
    .populate('milestoneId', 'title status')
    .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error retrieving transaction history' });
  }
});

// @route   GET /api/payments/escrow
// @desc    Get all escrow milestones for the current user (investor or startup)
router.get('/escrow', auth, async (req, res) => {
  try {
    const milestones = await Milestone.find({
      $or: [
        { investorId: req.user.id },
        { startupId: req.user.id }
      ]
    })
    .populate('startupId', 'name startupName avatarUrl')
    .populate('investorId', 'name avatarUrl')
    .populate('transactionId', 'amount status')
    .sort({ createdAt: -1 });

    res.json(milestones);
  } catch (error) {
    console.error('Get escrow milestones error:', error);
    res.status(500).json({ message: 'Server error retrieving escrow data' });
  }
});

export default router;
