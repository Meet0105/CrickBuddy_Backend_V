import mongoose, { Document } from 'mongoose';

export interface ITeam extends Document {
  teamId: string;
  name: string;
  country?: string;
  flagImage?: {
    url: string;
    alt: string;
  };
  players?: mongoose.Types.ObjectId[];
  raw?: any;
  createdAt?: Date; // Added by timestamps: true
  updatedAt?: Date; // Added by timestamps: true
}

const TeamSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  country: String,
  flagImage: {
    url: String,
    alt: String
  },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model<ITeam>('Team', TeamSchema);