import mongoose, { Document } from 'mongoose';

export interface IPhoto extends Document {
  photoId: string;
  url: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number; // in bytes
  tags?: string[];
  relatedNews?: string[];
  relatedMatches?: string[];
  relatedPlayers?: string[];
  relatedTeams?: string[];
  uploadedDate: Date;
  lastAccessed: Date;
  raw?: any;
}

const PhotoSchema = new mongoose.Schema({
  photoId: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  caption: String,
  credit: String,
  width: Number,
  height: Number,
  format: String,
  size: Number,
  tags: [String],
  relatedNews: [String],
  relatedMatches: [String],
  relatedPlayers: [String],
  relatedTeams: [String],
  uploadedDate: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now },
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Indexes for better performance
PhotoSchema.index({ tags: 1 });
PhotoSchema.index({ relatedNews: 1 });
PhotoSchema.index({ relatedMatches: 1 });
PhotoSchema.index({ relatedPlayers: 1 });
PhotoSchema.index({ relatedTeams: 1 });
PhotoSchema.index({ uploadedDate: -1 });

export default mongoose.model<IPhoto>('Photo', PhotoSchema);