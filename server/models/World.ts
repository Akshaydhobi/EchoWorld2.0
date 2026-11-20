import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const PositionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true },
  },
  { _id: false },
);

const BuildingSchema = new Schema(
  {
    buildingId: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'residential',
        'business_centre',
        'farm',
        'research_lab',
        'hospital',
        'school',
        'market',
        'energy_facility',
        'road_transit',
        'park',
      ],
    },
    communityId: {
      type: String,
      required: true,
      enum: ['greenfield', 'metrocore', 'novadistrict'],
    },
    position: { type: PositionSchema, required: true },
    capacity: { type: Number, required: true, min: 1 },
    condition: { type: Number, required: true, min: 0, max: 100, default: 100 },
    description: { type: String, required: true },
  },
  { _id: false },
);

const CommunitySchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      enum: ['greenfield', 'metrocore', 'novadistrict'],
    },
    name: { type: String, required: true },
    focus: {
      type: String,
      required: true,
      enum: ['residential_agricultural', 'business_commercial', 'tech_research'],
    },
    summary: { type: String, required: true },
    center: { type: PositionSchema, required: true },
    infrastructureLevel: { type: Number, required: true, min: 0, max: 100 },
    targetInitialPopulation: { type: Number, required: true, min: 0 },
    buildings: { type: [BuildingSchema], default: [] },
  },
  { _id: false },
);

const WorldSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, default: 'ECHO CITY' },
    seed: { type: Number, required: true, index: true },
    prngState: { type: Number, required: true },
    currentTick: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['idle', 'running', 'paused'],
      default: 'idle',
    },
    tickIntervalMs: { type: Number, required: true, min: 100, max: 10000, default: 1000 },
    communities: { type: [CommunitySchema], required: true },
    marketPrices: {
      food: { type: Number, required: true, min: 1 },
      energy: { type: Number, required: true, min: 1 },
      materials: { type: Number, required: true, min: 1 },
      knowledge: { type: Number, required: true, min: 1 },
      healthcare: { type: Number, required: true, min: 1 },
    },
    rules: {
      allowMigration: { type: Boolean, default: true },
      allowRoleChange: { type: Boolean, default: true },
      memoryEnabled: { type: Boolean, default: true },
      coordinationMode: {
        type: String,
        enum: ['decentralized', 'centralized'],
        default: 'decentralized',
      },
      taxRate: { type: Number, min: 0, max: 0.5, default: 0.08 },
      baseDecayRate: { type: Number, min: 0.5, max: 10, default: 2.5 },
      randomEventsEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

WorldSchema.index({ updatedAt: -1 });

export type WorldDocument = InferSchemaType<typeof WorldSchema>;

export const WorldModel =
  mongoose.models.World || mongoose.model('World', WorldSchema);
