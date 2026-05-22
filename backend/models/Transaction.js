import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdraw', 'transfer'], required: true },
  amount: { type: Number, required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, for transfers
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Completed' }
}, { timestamps: true });

transactionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
