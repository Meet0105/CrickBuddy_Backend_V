import mongoose, { Document } from 'mongoose';
import { 
  ITeamScore, 
  IInnings 
} from './interfaces';
import { 
  TeamScoreSchema, 
  InningsSchema 
} from './schemas';

export interface IMatch extends Document {
  matchId: string;
  title: string;
  shortTitle?: string;
  subTitle?: string;
  format: 'T20' | 'ODI' | 'TEST' | 'T10' | 'HUNDRED' | 'OTHER';
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED';
  tossResults?: {
    tossWinnerTeam: string;
    decision: 'BAT' | 'BOWL';
  };
  venue: {
    name: string;
    city: string;
    country: string;
  };
  startDate: Date;
  endDate?: Date;
  series: {
    id: string;
    name: string;
    seriesType: 'INTERNATIONAL' | 'DOMESTIC' | 'LEAGUE' | 'WOMEN';
  };
  teams: ITeamScore[];
  currentlyPlaying?: {
    teamId: string;
    innings: number;
  };
  result?: {
    winnerTeam?: string;
    winType?: 'RUNS' | 'WICKETS' | 'BALLS' | 'INNINGS';
    winMargin?: number;
    resultText: string;
  };
  weather?: {
    condition: string;
    temperature?: number;
  };
  isLive: boolean;
  priority: number;
  innings?: IInnings[];
  scorecard?: {
    scorecard?: IInnings[];
  };
  historicalScorecard?: {
    scoreCard?: IInnings[];
  };
  // Kept the detailed commentary definition
  commentary?: {
    commentaryList?: any[];
    matchHeader?: any;
    lastUpdated?: Date;
    liveText?: string; // Added this property to maintain compatibility
  };
  historicalCommentary?: {
    commentaryList?: any[];
    matchHeader?: any;
    lastUpdated?: Date;
  };
  overs?: {
    overs?: any[];
    matchHeader?: any;
    lastUpdated?: Date;
  };
  raw?: any;
}

const MatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  shortTitle: String,
  subTitle: String,
  format: {
    type: String,
    enum: ['T20', 'ODI', 'TEST', 'T10', 'HUNDRED', 'OTHER'],
    default: 'OTHER'
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED', 'CANCELLED'],
    default: 'UPCOMING'
  },
  tossResults: {
    tossWinnerTeam: String,
    decision: { type: String, enum: ['BAT', 'BOWL'] }
  },
  venue: {
    name: { type: String, required: true },
    city: String,
    country: String
  },
  startDate: { type: Date, required: true },
  endDate: Date,
  series: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    seriesType: {
      type: String,
      enum: ['INTERNATIONAL', 'DOMESTIC', 'LEAGUE', 'WOMEN'],
      default: 'DOMESTIC'
    }
  },
  teams: [TeamScoreSchema],
  currentlyPlaying: {
    teamId: String,
    innings: Number
  },
  result: {
    winnerTeam: String,
    winType: { type: String, enum: ['RUNS', 'WICKETS', 'BALLS', 'INNINGS'] },
    winMargin: Number,
    resultText: String
  },
  // Removed the basic commentary schema definition and kept only the detailed one
  weather: {
    condition: String,
    temperature: Number
  },
  isLive: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
  innings: [InningsSchema],
  scorecard: {
    scorecard: [InningsSchema]
  },
  historicalScorecard: {
    scoreCard: [InningsSchema]
  },
  // Kept the detailed commentary schema definition
  commentary: {
    commentaryList: [mongoose.Schema.Types.Mixed],
    matchHeader: mongoose.Schema.Types.Mixed,
    lastUpdated: Date,
    liveText: String // Added this property to maintain compatibility
  },
  historicalCommentary: {
    commentaryList: [mongoose.Schema.Types.Mixed],
    matchHeader: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
  },
  overs: {
    overs: [mongoose.Schema.Types.Mixed],
    matchHeader: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
  },
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model<IMatch>('Match', MatchSchema);