import News from '../../models/News';
import { Request, Response } from 'express';

export const getBreakingNews = async (req: Request, res: Response) => {
  try {
    const breakingNews = await News.find({ isBreaking: true })
      .sort({ priority: -1, publishedDate: -1 })
      .limit(5)
      .select('newsId headline subHeadline publishedDate featuredImage');

    res.json(breakingNews);
  } catch (error) {
    console.error('getBreakingNews error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getFeaturedNews = async (req: Request, res: Response) => {
  try {
    const featuredNews = await News.find({ isFeatured: true })
      .sort({ priority: -1, publishedDate: -1 })
      .limit(10)
      .select('newsId headline subHeadline summary publishedDate featuredImage author readTime');

    res.json(featuredNews);
  } catch (error) {
    console.error('getFeaturedNews error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getNewsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const news = await News.find({ category: category.toUpperCase() })
      .sort({ publishedDate: -1 })
      .limit(Number(limit))
      .skip(skip)
      .select('-content');

    const total = await News.countDocuments({ category: category.toUpperCase() });

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
    console.error('getNewsByCategory error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const searchNews = async (req: Request, res: Response) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const searchResults = await News.find({
      $or: [
        { headline: { $regex: q as string, $options: 'i' } },
        { subHeadline: { $regex: q as string, $options: 'i' } },
        { summary: { $regex: q as string, $options: 'i' } },
        { tags: { $in: [new RegExp(q as string, 'i')] } }
      ]
    })
    .sort({ publishedDate: -1 })
    .limit(Number(limit))
    .select('newsId headline subHeadline summary publishedDate featuredImage');

    res.json(searchResults);
  } catch (error) {
    console.error('searchNews error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};