import mongoose, { Document } from 'mongoose';

interface IPlayer {
  playerId: string;
  playerName: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isPlaying11?: boolean;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

interface ISquad {
  teamId: string;
  teamName: string;
  players: IPlayer[];
  lastUpdated: Date;
}

interface IVenue {
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  capacity?: number;
  pitchType?: string;
  matches: string[]; // Match IDs at this venue
}

interface IPointsTableEntry {
  teamId: string;
  teamName: string;
  teamShortName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate?: number;
  position: number;
  form?: string[]; // Recent form like ['W', 'L', 'W', 'W', 'L']
}

interface IScheduleMatch {
  matchId: string;
  matchDesc: string;
  team1: string;
  team2: string;
  startDate: Date;
  venue: string;
  status: string;
  format: string;
}

export interface ISeries extends Document {
  seriesId: string;
  name: string;
  shortName: string;
  description?: string;
  seriesType: 'INTERNATIONAL' | 'DOMESTIC' | 'LEAGUE' | 'WOMEN';
  startDate: Date;
  endDate: Date;
  venue: {
    country: string;
    cities: string[];
  };
  teams: Array<{
    teamId: string;
    teamName: string;
    teamShortName: string;
    isHost?: boolean;
  }>;
  matches: string[]; // Array of match IDs
  schedule?: IScheduleMatch[]; // Detailed schedule
  squads?: ISquad[]; // Team squads
  venues?: IVenue[]; // Series venues
  pointsTable?: IPointsTableEntry[]; // Points table/standings
  standings?: Array<{
    teamId: string;
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    points: number;
    netRunRate?: number;
    position: number;
  }>;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  format: 'T20' | 'ODI' | 'TEST' | 'MIXED';
  totalMatches: number;
  completedMatches: number;
  isActive: boolean;
  priority: number;
  featuredImage?: string;
  sponsors?: string[];
  stats?: {
    topRunScorers?: any[];
    topWicketTakers?: any[];
    lastUpdated?: Date;
  };
  raw?: any; // Store raw API response
  createdAt?: Date; // Added by timestamps: true
  updatedAt?: Date; // Added by timestamps: true
}

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  role: { type: String, required: true },
  battingStyle: String,
  bowlingStyle: String,
  isPlaying11: { type: Boolean, default: false },
  isCaptain: { type: Boolean, default: false },
  isWicketKeeper: { type: Boolean, default: false }
}, { _id: false });

const SquadSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  players: [PlayerSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const VenueSchema = new mongoose.Schema({
  venueId: { type: String, required: true },
  venueName: { type: String, required: true },
  city: String,
  country: String,
  capacity: Number,
  pitchType: String,
  matches: [String]
}, { _id: false });

const PointsTableSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  teamShortName: String,
  played: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  tied: { type: Number, default: 0 },
  noResult: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  netRunRate: Number,
  position: { type: Number, required: true },
  form: [String]
}, { _id: false });

const ScheduleMatchSchema = new mongoose.Schema({
  matchId: String,
  matchDesc: String,
  team1: String,
  team2: String,
  startDate: Date,
  venue: String,
  status: String,
  format: String
}, { _id: false });

const SeriesSchema = new mongoose.Schema({
  seriesId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  description: String,
  seriesType: {
    type: String,
    enum: ['INTERNATIONAL', 'DOMESTIC', 'LEAGUE', 'WOMEN'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  venue: {
    country: { type: String, required: true },
    cities: [String]
  },
  teams: [{
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamShortName: { type: String, required: true },
    isHost: { type: Boolean, default: false }
  }],
  matches: [String],
  schedule: [ScheduleMatchSchema],
  squads: [SquadSchema],
  venues: [VenueSchema],
  pointsTable: [PointsTableSchema],
  standings: [{
    teamId: String,
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    netRunRate: Number,
    position: Number
  }],
  status: {
    type: String,
    enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'POSTPONED', 'CANCELLED'],
    default: 'UPCOMING'
  },
  format: {
    type: String,
    enum: ['T20', 'ODI', 'TEST', 'MIXED'],
    required: true
  },
  totalMatches: { type: Number, required: true },
  completedMatches: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  featuredImage: String,
  sponsors: [String],
  stats: {
    topRunScorers: [mongoose.Schema.Types.Mixed],
    topWicketTakers: [mongoose.Schema.Types.Mixed],
    lastUpdated: Date
  },
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Indexes
SeriesSchema.index({ status: 1, startDate: -1 });
SeriesSchema.index({ seriesType: 1, isActive: 1 });
SeriesSchema.index({ priority: -1, startDate: -1 });

export default mongoose.model<ISeries>('Series', SeriesSchema);