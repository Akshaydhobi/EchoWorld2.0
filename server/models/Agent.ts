import mongoose, { Schema } from 'mongoose';

const AgentSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    agentCode: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    initialRole: {
      type: String,
      required: true,
      enum: ['entrepreneur', 'farmer', 'engineer', 'researcher', 'trader', 'healthcare', 'teacher', 'citizen'],
    },
    currentRole: {
      type: String,
      required: true,
      enum: ['entrepreneur', 'farmer', 'engineer', 'researcher', 'trader', 'healthcare', 'teacher', 'citizen'],
    },
    homeCommunity: {
      type: String,
      required: true,
      enum: ['greenfield', 'metrocore', 'novadistrict'],
    },
    personality: {
      cooperation: { type: Number, required: true, min: 0, max: 1 },
      riskTolerance: { type: Number, required: true, min: 0, max: 1 },
      curiosity: { type: Number, required: true, min: 0, max: 1 },
      adaptability: { type: Number, required: true, min: 0, max: 1 },
      resourceSaving: { type: Number, required: true, min: 0, max: 1 },
    },
    shortTermGoal: { type: String, required: true },
    longTermGoal: { type: String, required: true },
    strategyWeights: {
      produce: { type: Number, default: 1, min: 0.1, max: 3 },
      trade: { type: Number, default: 1, min: 0.1, max: 3 },
      cooperate: { type: Number, default: 1, min: 0.1, max: 3 },
      innovate: { type: Number, default: 1, min: 0.1, max: 3 },
      rest: { type: Number, default: 1, min: 0.1, max: 3 },
      migrate: { type: Number, default: 1, min: 0.1, max: 3 },
    },
  },
  { timestamps: true },
);

AgentSchema.index({ worldId: 1, agentCode: 1 }, { unique: true });

export const AgentModel = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
