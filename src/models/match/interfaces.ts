import mongoose from 'mongoose';

export interface IScoreDetails {
  runs: number;
  wickets: number;
  overs: number;
  balls?: number;
  runRate?: number;
  requiredRunRate?: number;
}

export interface ITeamScore {
  teamId: string;
  teamName: string;
  teamShortName: string;
  score: IScoreDetails;
  isWinner?: boolean;
}

export interface IDelivery {
  over?: number;
  ballInOver?: number;
  batsman?: string;
  bowler?: string;
  nonStriker?: string;
  runs?: { batsman?: number; extras?: number; total?: number };
  wicket?: { isWicket?: boolean; description?: string };
  event?: string;
}

export interface IBatsman {
  batId?: string;
  batName?: string;
  name?: string;
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  strkrate?: number;
  outDesc?: string;
  outdesc?: string;
  isCaptain?: string | boolean;
  iscaptain?: boolean;
  isKeeper?: string | boolean;
  iskeeper?: boolean;
}

export interface IBowler {
  bowlerId?: string;
  bowlerName?: string;
  name?: string;
  overs?: number;
  maidens?: number;
  runs?: number;
  wickets?: number;
  economy?: number;
  isCaptain?: string | boolean;
  iscaptain?: boolean;
}

export interface IExtras {
  total?: number;
  byes?: number;
  legbyes?: number;
  wides?: number;
  noballs?: number;
  penalty?: number;
}

export interface IInnings {
  inningsId?: string;
  inningsid?: string;
  batTeam?: string;
  batteam?: string;
  bowlTeam?: string;
  bowlteam?: string;
  totalRuns?: number;
  total?: number;
  totalWickets?: number;
  wickets?: number;
  totalOvers?: number;
  overs?: number;
  batsmen?: IBatsman[];
  batsman?: IBatsman[];
  bowlers?: IBowler[];
  bowler?: IBowler[];
  extras?: IExtras;
  fallOfWickets?: string;
  deliveries?: IDelivery[];
  batTeamDetails?: {
    batTeamId?: string;
    batTeamName?: string;
    batsmenData?: { [key: string]: IBatsman };
  };
  bowlTeamDetails?: {
    bowlTeamId?: string;
    bowlTeamName?: string;
    bowlersData?: { [key: string]: IBowler };
  };
}