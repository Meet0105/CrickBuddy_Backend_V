import mongoose, { Document } from 'mongoose';

export interface IVenue extends Document {
  venueId: string;
  name: string;
  location?: string;
  capacity?: number;
  raw?: any;
}

const VenueSchema = new mongoose.Schema({
  venueId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: String,
  capacity: Number,
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model<IVenue>('Venue', VenueSchema);