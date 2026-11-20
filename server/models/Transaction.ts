import mongoose, { Schema } from 'mongoose';

const TransactionSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    tick: { type: Number, required: true, min: 0 },
    txType: {
      type: String,
      enum: [
        'production',
        'consumption',
        'trade',
        'wage',
        'business_create',
        'construction',
        'research',
        'healthcare_service',
        'tax',
      ],
      required: true,
    },
    fromAgentId: { type: String, default: null },
    toAgentId: { type: String, default: null },
    resource: {
      type: String,
      enum: ['money', 'food', 'energy', 'materials', 'knowledge', 'healthcare'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    unitPriceEC: { type: Number, required: true, min: 0 },
    communityId: {
      type: String,
      enum: ['greenfield', 'metrocore', 'novadistrict'],
      required: true,
    },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

TransactionSchema.index({ worldId: 1, tick: -1 });
TransactionSchema.index({ worldId: 1, fromAgentId: 1 });

export const TransactionModel =
  mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
