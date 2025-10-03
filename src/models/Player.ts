import mongoose, { Document } from 'mongoose';

interface IStats {
  matches?: number;
  runs?: number;
  wickets?: number;
}

export interface IPlayer extends Document {
  playerId: string;
  name: string;
  role?: string;
  country?: string;
  stats?: { T20?: IStats; ODI?: IStats; Test?: IStats; All?: IStats };
  raw?: any;
}

const StatsSchema = new mongoose.Schema({
  matches: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 }
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: String,
  country: String,
  stats: {
    T20: StatsSchema,
    ODI: StatsSchema,
    Test: StatsSchema,
    All: StatsSchema
  },
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model<IPlayer>('Player', PlayerSchema);
