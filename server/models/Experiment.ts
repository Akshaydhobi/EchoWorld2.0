import mongoose, { Schema } from 'mongoose';

const ExperimentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    researchQuestion: {
      type: String,
      required: true,
      enum: [
        'cooperation_vs_independence',
        'memory_vs_nomemory',
        'resource_scarcity',
        'personality_diversity',
        'centralized_vs_decentralized',
        'event_adaptability',
      ],
    },
    ticksToRun: { type: Number, required: true, min: 10, max: 500 },
    seeds: { type: [Number], required: true },
    variants: { type: [Schema.Types.Mixed], required: true },
    results: { type: [Schema.Types.Mixed], default: [] },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  },
  { timestamps: true },
);

ExperimentSchema.index({ createdAt: -1 });

export const ExperimentModel =
  mongoose.models.Experiment || mongoose.model('Experiment', ExperimentSchema);
