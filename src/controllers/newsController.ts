import News from '../models/News';
import { Request, Response } from 'express';
import axios from 'axios';

// Import all the component functions
import { getAllNews, getNewsById } from './news/newsCore';
import { getBreakingNews, getFeaturedNews, getNewsByCategory, searchNews } from './news/newsDisplay';
import { syncNewsFromRapidAPI } from './news/newsSync';
import { getNewsByCategoryId, getNewsCategories } from './news/newsCategory';
import { getNewsTopics, getNewsByTopicId } from './news/newsTopic';
import { getNewsPhotoGallery } from './news/newsPhoto';

// Export all functions
export {
  // Core functions
  getAllNews,
  getNewsById,
  
  // Display functions
  getBreakingNews,
  getFeaturedNews,
  getNewsByCategory,
  searchNews,
  
  // Sync functions
  syncNewsFromRapidAPI,
  
  // Category functions
  getNewsByCategoryId,
  getNewsCategories,
  
  // Topic functions
  getNewsTopics,
  getNewsByTopicId,
  
  // Photo functions
  getNewsPhotoGallery
};