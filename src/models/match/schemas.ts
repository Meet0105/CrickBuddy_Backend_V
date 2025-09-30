import mongoose from 'mongoose';
import { 
  IScoreDetails, 
  ITeamScore, 
  IDelivery, 
  IBatsman, 
  IBowler, 
  IExtras, 
  IInnings 
} from './interfaces';

export const TeamScoreSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  teamShortName: { type: String, required: true },
  score: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: Number,
    runRate: Number,
    requiredRunRate: Number
  },
  isWinner: { type: Boolean, default: false }
}, { _id: false });

export const DeliverySchema = new mongoose.Schema({
  over: Number,
  ballInOver: Number,
  batsman: String,
  bowler: String,
  nonStriker: String,
  runs: {
    batsman: Number,
    extras: Number,
    total: Number
  },
  wicket: {
    isWicket: { type: Boolean, default: false },
    description: String
  },
  event: String
}, { _id: false });

export const BatsmanSchema = new mongoose.Schema({
  batId: String,
  batName: String,
  name: String,
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: Number,
  strkrate: Number,
  outDesc: String,
  outdesc: String,
  isCaptain: mongoose.Schema.Types.Mixed,
  iscaptain: Boolean,
  isKeeper: mongoose.Schema.Types.Mixed,
  iskeeper: Boolean
}, { _id: false });

export const BowlerSchema = new mongoose.Schema({
  bowlerId: String,
  bowlerName: String,
  name: String,
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  economy: Number,
  isCaptain: mongoose.Schema.Types.Mixed,
  iscaptain: Boolean
}, { _id: false });

export const ExtrasSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  byes: { type: Number, default: 0 },
  legbyes: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noballs: { type: Number, default: 0 },
  penalty: { type: Number, default: 0 }
}, { _id: false });

export const InningsSchema = new mongoose.Schema({
  inningsId: String,
  inningsid: String,
  batTeam: String,
  batteam: String,
  bowlTeam: String,
  bowlteam: String,
  totalRuns: Number,
  total: Number,
  totalWickets: Number,
  wickets: Number,
  totalOvers: Number,
  overs: Number,
  batsmen: [BatsmanSchema],
  batsman: [BatsmanSchema],
  bowlers: [BowlerSchema],
  bowler: [BowlerSchema],
  extras: ExtrasSchema,
  fallOfWickets: String,
  deliveries: [DeliverySchema],
  batTeamDetails: {
    batTeamId: String,
    batTeamName: String,
    batsmenData: mongoose.Schema.Types.Mixed
  },
  bowlTeamDetails: {
    bowlTeamId: String,
    bowlTeamName: String,
    bowlersData: mongoose.Schema.Types.Mixed
  }
}, { _id: false });