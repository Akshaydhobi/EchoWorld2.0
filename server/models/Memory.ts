import mongoose, { Schema } from 'mongoose';

const MemorySchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    tick: { type: Number, required: true, min: 0 },
    tier: { type: String, enum: ['short_term', 'long_term'], required: true },
    category: {
      type: String,
      enum: ['trade', 'cooperation', 'conflict', 'event', 'learning', 'migration', 'economy'],
      required: true,
    },
    summary: { type: String, required: true },
    relatedAgentId: { type: Schema.Types.ObjectId, ref: 'Agent', default: null },
    emotionalValence: { type: Number, required: true, min: -1, max: 1 },
    importance: { type: Number, required: true, min: 0, max: 1 },
    decayWeight: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true },
);

MemorySchema.index({ worldId: 1, agentId: 1, tier: 1, tick: -1 });

export const MemoryModel = mongoose.models.Memory || mongoose.model('Memory', MemorySchema);
