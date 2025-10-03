import News from '../../models/News';
import { Request, Response } from 'express';
import axios from 'axios';

// New function to get news by category ID using the proper endpoint
export const getNewsByCategoryId = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { limit = '20', page = '1' } = req.query as { [key: string]: string | undefined };

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_NEWS_CATEGORY_LIST_URL = process.env.RAPIDAPI_NEWS_CATEGORY_LIST_URL;

    // If API keys are missing, serve from database
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_CATEGORY_LIST_URL) {
      console.log('RapidAPI config missing, serving news from database');
      
      const skip = (Number(page) - 1) * Number(limit);
      const news = await News.find({ category: categoryId })
        .sort({ publishedDate: -1 })
        .limit(Number(limit))
        .skip(skip)
        .select('-content');

      const total = await News.countDocuments({ category: categoryId });

      return res.json({
        news,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch news by category from Cricbuzz API
    const url = `${RAPIDAPI_NEWS_CATEGORY_LIST_URL}/${categoryId}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    let newsList: any[] = [];
    
    // Handle the specific response structure from Cricbuzz news API
    if (response.data && response.data.storyList) {
      // Extract news items from storyList
      for (const storyItem of response.data.storyList) {
        if (storyItem.story) {
          newsList.push(storyItem.story);
        }
      }
    } else if (Array.isArray(response.data)) {
      newsList = response.data;
    } else {
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) newsList = arr;
    }

    if (!newsList || !newsList.length) {
      return res.status(500).json({
        message: 'No news array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    // Save to database
    const upsertPromises = newsList.map(async (n) => {
      const newsId = n.id || n.storyId || n.newsId || JSON.stringify(n).slice(0, 40);

      const doc: any = {
        newsId: newsId?.toString(),
        headline: n.hline || n.title || n.headline || n.name || 'Untitled News',
        subHeadline: n.intro || n.subtitle || n.subHeadline || n.description || '',
        content: n.content || n.story || n.description || '',
        summary: n.summary || n.intro || n.excerpt || n.description || '',
        author: {
          name: n.author?.name || n.author || n.publisher || 'Unknown Author',
          image: n.author?.image || n.authorImage || ''
        },
        publishedDate: n.pubTime || n.publishedAt || n.date || n.publishedDate || new Date(),
        lastModified: n.lastModified || n.updatedAt || new Date(),
        category: n.category || n.type || 'OTHER',
        tags: Array.isArray(n.tags) ? n.tags : [],
        relatedMatches: Array.isArray(n.matchId) ? n.matchId : (n.matchId ? [n.matchId] : []),
        relatedPlayers: Array.isArray(n.playerId) ? n.playerId : (n.playerId ? [n.playerId] : []),
        relatedTeams: Array.isArray(n.teamId) ? n.teamId : (n.teamId ? [n.teamId] : []),
        featuredImage: {
          url: n.imageId || n.imageURL || n.featuredImage?.url || n.imageUrl || '',
          caption: n.imageCaption || n.featuredImage?.caption || '',
          credit: n.imageCredit || n.featuredImage?.credit || ''
        },
        isBreaking: n.isBreaking || n.breaking || false,
        isFeatured: n.isFeatured || n.featured || false,
        priority: n.priority || n.sortOrder || 0,
        readTime: n.readTime || n.estimatedReadingTime || 5,
        views: 0,
        likes: n.likes || 0,
        comments: n.comments || 0,
        seoMeta: {
          metaTitle: n.seoTitle || n.metaTitle || n.title || '',
          metaDescription: n.seoDescription || n.metaDescription || n.description || '',
          keywords: Array.isArray(n.keywords) ? n.keywords : []
        },
        raw: n
      };

      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      return News.findOneAndUpdate(
        { newsId: doc.newsId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    await Promise.all(upsertPromises);

    // Return from database
    const skip = (Number(page) - 1) * Number(limit);
    const news = await News.find({ category: categoryId })
      .sort({ publishedDate: -1 })
      .limit(Number(limit))
      .skip(skip)
      .select('-content');

    const total = await News.countDocuments({ category: categoryId });

    res.json({
      news,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('getNewsByCategoryId error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle different types of errors
    if ((error as any)?.response?.status === 429) {
      // Fallback to database if API rate limit exceeded
      try {
        const { limit = '20', page = '1' } = req.query as { [key: string]: string | undefined };
        const skip = (Number(page) - 1) * Number(limit);
        const news = await News.find({ category: req.params.categoryId })
          .sort({ publishedDate: -1 })
          .limit(Number(limit))
          .skip(skip)
          .select('-content');

        const total = await News.countDocuments({ category: req.params.categoryId });

        return res.json({
          news,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        });
      } catch (dbError) {
        return res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
      }
    }
    
    // Handle subscription/authorization errors
    if ((error as any)?.response?.status === 403) {
      return res.status(403).json({ 
        message: 'API subscription error. Please check your RapidAPI subscription to Cricbuzz Cricket API.', 
        error: 'Forbidden - Not subscribed to API' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch news by category', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// New function to get news categories
export const getNewsCategories = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_NEWS_CATEGORIES_URL = process.env.RAPIDAPI_NEWS_CATEGORIES_URL;

    // If API keys are missing, return static categories from database
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_CATEGORIES_URL) {
      console.log('RapidAPI config missing, returning static news categories');
      
      // Get unique categories from existing news in database
      const categories = await News.distinct('category');
      
      // Return static categories with some common ones if database is empty
      const staticCategories = categories.length > 0 ? categories : [
        'CRICKET',
        'INTERNATIONAL',
        'DOMESTIC',
        'IPL',
        'T20',
        'ODI',
        'TEST',
        'WOMEN',
        'OTHER'
      ];
      
      return res.json(
        staticCategories.map(cat => ({
          id: cat,
          name: cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(),
          displayName: cat.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        }))
      );
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch news categories from Cricbuzz API
    const response = await axios.get(RAPIDAPI_NEWS_CATEGORIES_URL, { headers, timeout: 15000 });

    // Extract categories from the response
    let categories = [];
    if (response.data && response.data.storyType) {
      categories = response.data.storyType.map((cat: any) => ({
        id: cat.id?.toString() || cat.name,
        name: cat.name,
        description: cat.description,
        displayName: cat.name
      }));
    }

    res.json(categories);
  } catch (error) {
    console.error('getNewsCategories error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle different types of errors
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    // Handle subscription/authorization errors
    if ((error as any)?.response?.status === 403) {
      return res.status(403).json({ 
        message: 'API subscription error. Please check your RapidAPI subscription to Cricbuzz Cricket API.', 
        error: 'Forbidden - Not subscribed to API' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch news categories', error: (error as any)?.response?.data || (error as Error).message });
  }
};