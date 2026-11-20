import mongoose, { Schema } from 'mongoose';

const SnapshotSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    tick: { type: Number, required: true, min: 0 },
    populationActive: { type: Number, required: true, min: 0 },
    avgWellbeing: { type: Number, required: true, min: 0, max: 100 },
    cooperationRate: { type: Number, required: true, min: 0, max: 1 },
    wealthGini: { type: Number, required: true, min: 0, max: 1 },
    decisionSuccessRate: { type: Number, required: true, min: 0, max: 1 },
    totalResources: {
      money: { type: Number, required: true, min: 0 },
      food: { type: Number, required: true, min: 0 },
      energy: { type: Number, required: true, min: 0 },
      materials: { type: Number, required: true, min: 0 },
      knowledge: { type: Number, required: true, min: 0 },
      healthcare: { type: Number, required: true, min: 0 },
    },
    marketPrices: {
      food: { type: Number, required: true },
      energy: { type: Number, required: true },
      materials: { type: Number, required: true },
      knowledge: { type: Number, required: true },
      healthcare: { type: Number, required: true },
    },
    communityStats: { type: [Schema.Types.Mixed], default: [] },
    activeEventCount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

SnapshotSchema.index({ worldId: 1, tick: 1 }, { unique: true });

export const SnapshotModel =
  mongoose.models.Snapshot || mongoose.model('Snapshot', SnapshotSchema);
