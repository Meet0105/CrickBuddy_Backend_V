import News from '../../models/News';
import { Request, Response } from 'express';
import axios from 'axios';

// New function to get news topics
export const getNewsTopics = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_NEWS_TOPICS_URL = process.env.RAPIDAPI_NEWS_TOPICS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_TOPICS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_NEWS_TOPICS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch news topics from Cricbuzz API
    const response = await axios.get(RAPIDAPI_NEWS_TOPICS_URL, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getNewsTopics error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch news topics', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// New function to get news by topic ID
export const getNewsByTopicId = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_NEWS_TOPIC_LIST_URL = process.env.RAPIDAPI_NEWS_TOPIC_LIST_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_TOPIC_LIST_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_NEWS_TOPIC_LIST_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch news by topic from Cricbuzz API
    const url = `${RAPIDAPI_NEWS_TOPIC_LIST_URL}/${topicId}`;
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
    const news = await News.find({ tags: topicId })
      .sort({ publishedDate: -1 })
      .limit(Number(limit))
      .skip(skip)
      .select('-content');

    const total = await News.countDocuments({ tags: topicId });

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
    console.error('getNewsByTopicId error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      // Fallback to database if API rate limit exceeded
      try {
        const { limit = 20, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const news = await News.find({ tags: req.params.topicId })
          .sort({ publishedDate: -1 })
          .limit(Number(limit))
          .skip(skip)
          .select('-content');

        const total = await News.countDocuments({ tags: req.params.topicId });

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
    
    res.status(500).json({ message: 'Failed to fetch news by topic', error: (error as any)?.response?.data || (error as Error).message });
  }
};