import { Router } from 'express';
import { 
  getAllNews, 
  getNewsById, 
  getBreakingNews, 
  getFeaturedNews,
  searchNews,
  getNewsByCategory,
  syncNewsFromRapidAPI,
  getNewsByCategoryId,
  getNewsCategories,
  getNewsTopics,
  getNewsByTopicId,
  getNewsPhotoGallery
} from '../controllers/newsController';

const router = Router();

router.get('/', getAllNews);
router.get('/breaking', getBreakingNews);
router.get('/featured', getFeaturedNews);
router.get('/search', searchNews);
router.get('/category/:category', getNewsByCategory);
router.get('/categories', getNewsCategories);
router.get('/category-id/:categoryId', getNewsByCategoryId);
router.get('/topics', getNewsTopics);
router.get('/topic/:topicId', getNewsByTopicId);
router.get('/photo-gallery/:id', getNewsPhotoGallery);
router.get('/:id', getNewsById);
router.post('/sync', syncNewsFromRapidAPI);

export default router;