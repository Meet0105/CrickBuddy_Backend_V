import { Router } from 'express';
import { getPhotoById, getPhotoGallery } from '../controllers/photoController';

const router = Router();

router.get('/image/:id', getPhotoById);
router.get('/gallery/:id', getPhotoGallery);

export default router;