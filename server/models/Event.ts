import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema(
  {
    worldId: { type: Schema.Types.ObjectId, ref: 'World', required: true, index: true },
    tick: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      enum: ['environment', 'architect_intervention', 'agent_milestone'],
      required: true,
    },
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetCommunity: {
      type: String,
      enum: ['all', 'greenfield', 'metrocore', 'novadistrict'],
      required: true,
    },
    modifiers: { type: Schema.Types.Mixed, default: {} },
    durationTicks: { type: Number, required: true, min: 1 },
    remainingTicks: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

EventSchema.index({ worldId: 1, tick: -1 });

export const EventModel = mongoose.models.Event || mongoose.model('Event', EventSchema);
