import mongoose, { Schema } from 'mongoose';

const DecisionLogSchema = new Schema(
  {
    tick: { type: Number, required: true },
    actionType: { type: String, required: true },
    target: { type: String, required: true },
    utilityScore: { type: Number, required: true },
    outcome: { type: String, enum: ['success', 'failed', 'blocked'], required: true },
    reason: { type: String, required: true },
    moneyAfter: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const AgentStateSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    tick: { type: Number, required: true, min: 0 },
    currentCommunity: {
      type: String,
      required: true,
      enum: ['greenfield', 'metrocore', 'novadistrict'],
    },
    currentBuildingId: { type: String, required: true },
    position: {
      x: { type: Number, required: true },
      z: { type: Number, required: true },
    },
    needs: {
      hunger: { type: Number, required: true, min: 0, max: 100 },
      rest: { type: Number, required: true, min: 0, max: 100 },
      health: { type: Number, required: true, min: 0, max: 100 },
      social: { type: Number, required: true, min: 0, max: 100 },
      purpose: { type: Number, required: true, min: 0, max: 100 },
    },
    energy: { type: Number, required: true, min: 0, max: 100 },
    wellbeing: { type: Number, required: true, min: 0, max: 100 },
    inventory: {
      money: { type: Number, required: true, min: 0 },
      food: { type: Number, required: true, min: 0 },
      energy: { type: Number, required: true, min: 0 },
      materials: { type: Number, required: true, min: 0 },
      knowledge: { type: Number, required: true, min: 0 },
      healthcare: { type: Number, required: true, min: 0 },
    },
    lastAction: { type: DecisionLogSchema, default: null },
    decisionHistory: { type: [DecisionLogSchema], default: [] },
  },
  { timestamps: true },
);

AgentStateSchema.index({ worldId: 1, agentId: 1 }, { unique: true });
AgentStateSchema.index({ worldId: 1, currentCommunity: 1 });

export const AgentStateModel =
  mongoose.models.AgentState || mongoose.model('AgentState', AgentStateSchema);
