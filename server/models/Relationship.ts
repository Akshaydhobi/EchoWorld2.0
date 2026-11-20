import mongoose, { Schema } from 'mongoose';

const RelationshipSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    agentA: { type: String, required: true },
    agentB: { type: String, required: true },
    trust: { type: Number, required: true, min: -1, max: 1, default: 0.1 },
    affinity: { type: Number, required: true, min: 0, max: 1, default: 0.4 },
    interactionCount: { type: Number, required: true, min: 0, default: 0 },
    successfulTrades: { type: Number, required: true, min: 0, default: 0 },
    conflicts: { type: Number, required: true, min: 0, default: 0 },
    lastInteractionTick: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

RelationshipSchema.index({ worldId: 1, agentA: 1, agentB: 1 }, { unique: true });

export const RelationshipModel =
  mongoose.models.Relationship || mongoose.model('Relationship', RelationshipSchema);
