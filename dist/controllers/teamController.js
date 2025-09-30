"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamStats = exports.getTeamStatsFilters = exports.getTeamPlayers = exports.getTeamNews = exports.testTeamAPI = exports.getTeamResults = exports.getTeamSchedules = exports.syncTeamsFromRapidAPI = exports.getTeamById = exports.getAllTeams = void 0;
// Import all the component functions
const teamCore_1 = require("./team/teamCore");
Object.defineProperty(exports, "getAllTeams", { enumerable: true, get: function () { return teamCore_1.getAllTeams; } });
Object.defineProperty(exports, "getTeamById", { enumerable: true, get: function () { return teamCore_1.getTeamById; } });
const teamSync_1 = require("./team/teamSync");
Object.defineProperty(exports, "syncTeamsFromRapidAPI", { enumerable: true, get: function () { return teamSync_1.syncTeamsFromRapidAPI; } });
const teamSchedule_1 = require("./team/teamSchedule");
Object.defineProperty(exports, "getTeamSchedules", { enumerable: true, get: function () { return teamSchedule_1.getTeamSchedules; } });
Object.defineProperty(exports, "getTeamResults", { enumerable: true, get: function () { return teamSchedule_1.getTeamResults; } });
Object.defineProperty(exports, "testTeamAPI", { enumerable: true, get: function () { return teamSchedule_1.testTeamAPI; } });
const teamNews_1 = require("./team/teamNews");
Object.defineProperty(exports, "getTeamNews", { enumerable: true, get: function () { return teamNews_1.getTeamNews; } });
Object.defineProperty(exports, "getTeamPlayers", { enumerable: true, get: function () { return teamNews_1.getTeamPlayers; } });
const teamStats_1 = require("./team/teamStats");
Object.defineProperty(exports, "getTeamStatsFilters", { enumerable: true, get: function () { return teamStats_1.getTeamStatsFilters; } });
Object.defineProperty(exports, "getTeamStats", { enumerable: true, get: function () { return teamStats_1.getTeamStats; } });
