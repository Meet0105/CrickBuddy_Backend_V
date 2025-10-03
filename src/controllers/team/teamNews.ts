import { Request, Response } from 'express';
import axios from 'axios';
import { INews } from '../../models/News';

// Function to get team news
export const getTeamNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_TEAMS_NEWS_URL = process.env.RAPIDAPI_TEAMS_NEWS_URL;

    // If API keys are missing, serve from database
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_NEWS_URL) {
      console.log('RapidAPI config missing, serving team news from database');
      
      // Import News model
      const News = require('../../models/News').default;
      
      // Find news related to this team
      const news = await News.find({ 
        $or: [
          { relatedTeams: id },
          { relatedTeams: { $in: [id] } }
        ]
      })
      .sort({ publishedDate: -1 })
      .limit(20)
      .select('-content');
      
      return res.json({
        storyList: news.map((n: INews) => ({
          story: {
            id: n.newsId,
            hline: n.headline,
            intro: n.subHeadline,
            pubTime: n.publishedDate,
            imageId: n.featuredImage?.url || '',
            source: n.author?.name || 'CrickBuddy'
          }
        }))
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Build the URL directly using the working format
    const url = `https://${RAPIDAPI_HOST}/news/v1/team/${id}`;
    
    console.log(`Fetching team news for team ID ${id} from URL: ${url}`);
    
    // Try to fetch team news from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getTeamNews error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch team news', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get team players
export const getTeamPlayers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_TEAMS_PLAYERS_URL = process.env.RAPIDAPI_TEAMS_PLAYERS_URL;

    // If API keys are missing, serve from database
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_PLAYERS_URL) {
      console.log('RapidAPI config missing, serving team players from database');
      
      // Import Team model
      const Team = require('../../models/Team').default;
      
      // Find team and populate players
      const team = await Team.findOne({ teamId: id });
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Return team players in expected format
      return res.json({
        player: team.players || [],
        teamName: team.name,
        teamId: team.teamId
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Build the URL directly using the working format
    const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/players`;
    
    console.log(`Fetching team players for team ID ${id} from URL: ${url}`);
    
    // Try to fetch team players from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Store players data in database for future offline use
    try {
      const Team = require('../../models/Team').default;
      
      if (response.data && response.data.player) {
        await Team.findOneAndUpdate(
          { teamId: id },
          { 
            players: response.data.player,
            lastPlayersSync: new Date()
          },
          { upsert: false }
        );
        console.log(`Stored ${response.data.player.length} players for team ${id} in database`);
      }
    } catch (dbError) {
      console.error('Error storing team players in database:', dbError);
    }

    res.json(response.data);
  } catch (error) {
    console.error('getTeamPlayers error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch team players', error: (error as any)?.response?.data || (error as Error).message });
  }
};

