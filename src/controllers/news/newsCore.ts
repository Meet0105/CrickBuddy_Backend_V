import News from '../../models/News';
import { Request, Response } from 'express';
import axios from 'axios';

// Function to get all news - first check database, then API if needed
export const getAllNews = async (req: Request, res: Response) => {
  try {
    const { limit = '20', page = '1' } = req.query as { [key: string]: string | undefined };
    
    // First, try to get news from database
    const skip = (Number(page) - 1) * Number(limit);
    const newsFromDB = await News.find({})
      .sort({ publishedDate: -1 })
      .limit(Number(limit))
      .skip(skip)
      .select('-content'); // Exclude full content for list view

    const total = await News.countDocuments({});
    
    // Return news with pagination info
    const response = {
      news: newsFromDB,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };
    
    // If we have news in the database, return them
    if (newsFromDB && newsFromDB.length > 0) {
      return res.json(response);
    }
    
    // If no news in database, return empty response
    res.json({
      news: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    console.error('getAllNews error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch news', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get news by ID - first check database, then API if needed
export const getNewsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, try to get news from database
    const newsFromDB = await News.findOne({ newsId: id });
    
    // If we have the news in the database, return it
    if (newsFromDB) {
      return res.json(newsFromDB);
    }
    
    // If news not in database, return 404
    res.status(404).json({ message: 'News not found' });
  } catch (error) {
    console.error('getNewsById error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch news', error: (error as any)?.response?.data || (error as Error).message });
  }
};