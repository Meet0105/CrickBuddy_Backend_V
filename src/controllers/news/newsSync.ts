import News from '../../models/News';
import { Request, Response } from 'express';
import axios from 'axios';

// New function to sync news from RapidAPI using the proper endpoint
export const syncNewsFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_NEWS_LIST_URL = process.env.RAPIDAPI_NEWS_LIST_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_LIST_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_NEWS_LIST_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch news from Cricbuzz API
    const response = await axios.get(RAPIDAPI_NEWS_LIST_URL, { headers, timeout: 15000 });

    let newsList: any[] = [];
    
    console.log('News API Response structure:', Object.keys(response.data));
    
    // Handle the specific response structure from Cricbuzz news API
    if (response.data && response.data.storyList) {
      console.log('Found storyList with', response.data.storyList.length, 'items');
      // Extract news items from storyList
      for (const storyItem of response.data.storyList) {
        if (storyItem.story) {
          newsList.push(storyItem.story);
        } else if (storyItem) {
          // Sometimes the story data is directly in the storyItem
          newsList.push(storyItem);
        }
      }
    } else if (Array.isArray(response.data)) {
      newsList = response.data;
    } else if (response.data.news) {
      newsList = response.data.news;
    } else {
      // Try to find any array in the response
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) {
        console.log('Found array with', arr.length, 'items');
        newsList = arr;
      }
    }
    
    console.log('Processed news list length:', newsList.length);

    if (!newsList || !newsList.length) {
      return res.status(500).json({
        message: 'No news array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    const upsertPromises = newsList.map(async (n) => {
      const newsId = n.id || n.storyId || n.newsId || n.story?.id || JSON.stringify(n).slice(0, 40);
      
      // Handle nested story object if present
      const storyData = n.story || n;

      // Parse published date
      let publishedDate = new Date();
      if (storyData.pubTime) {
        publishedDate = new Date(parseInt(storyData.pubTime));
      } else if (storyData.publishedAt || storyData.date || storyData.publishedDate) {
        publishedDate = new Date(storyData.publishedAt || storyData.date || storyData.publishedDate);
      }

      const doc: any = {
        newsId: newsId?.toString(),
        headline: storyData.hline || storyData.title || storyData.headline || storyData.name || 'Untitled News',
        subHeadline: storyData.intro || storyData.subtitle || storyData.subHeadline || storyData.description || '',
        content: storyData.content || storyData.story || storyData.description || storyData.intro || 'Content not available',
        summary: storyData.summary || storyData.intro || storyData.excerpt || storyData.description || '',
        author: {
          name: storyData.author?.name || storyData.author || storyData.publisher || 'Cricket News',
          image: storyData.author?.image || storyData.authorImage || ''
        },
        publishedDate: publishedDate,
        lastModified: storyData.lastModified || storyData.updatedAt || new Date(),
        category: storyData.category || storyData.type || 'CRICKET',
        tags: Array.isArray(storyData.tags) ? storyData.tags : [],
        relatedMatches: Array.isArray(storyData.matchId) ? storyData.matchId : (storyData.matchId ? [storyData.matchId] : []),
        relatedPlayers: Array.isArray(storyData.playerId) ? storyData.playerId : (storyData.playerId ? [storyData.playerId] : []),
        relatedTeams: Array.isArray(storyData.teamId) ? storyData.teamId : (storyData.teamId ? [storyData.teamId] : []),
        featuredImage: {
          url: storyData.imageId || storyData.imageURL || storyData.featuredImage?.url || storyData.imageUrl || '',
          caption: storyData.imageCaption || storyData.featuredImage?.caption || '',
          credit: storyData.imageCredit || storyData.featuredImage?.credit || ''
        },
        isBreaking: storyData.isBreaking || storyData.breaking || false,
        isFeatured: storyData.isFeatured || storyData.featured || false,
        priority: storyData.priority || storyData.sortOrder || 0,
        readTime: storyData.readTime || storyData.estimatedReadingTime || 3,
        views: 0,
        likes: storyData.likes || 0,
        comments: storyData.comments || 0,
        seoMeta: {
          metaTitle: storyData.seoTitle || storyData.metaTitle || storyData.title || storyData.hline || '',
          metaDescription: storyData.seoDescription || storyData.metaDescription || storyData.description || storyData.intro || '',
          keywords: Array.isArray(storyData.keywords) ? storyData.keywords : []
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

    const results = await Promise.all(upsertPromises);
    res.json({ message: `Synced ${results.length} news items.`, count: results.length });
  } catch (error) {
    console.error('syncNewsFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'News sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};