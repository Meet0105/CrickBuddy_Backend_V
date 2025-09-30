import Photo from '../models/Photo';
import { Request, Response } from 'express';
import axios from 'axios';

// Function to get photo by ID - first check database, then API if needed
export const getPhotoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, try to get photo from database
    let photoFromDB = await Photo.findOne({ photoId: id });
    
    // If we have the photo in the database, return it and update last accessed
    if (photoFromDB) {
      // Update last accessed time
      photoFromDB.lastAccessed = new Date();
      await photoFromDB.save();
      
      return res.json(photoFromDB);
    }
    
    // If photo not in database, check if API key is available
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_IMAGE_URL = process.env.RAPIDAPI_IMAGE_URL;

    // If API key is not available, return a default photo object
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_IMAGE_URL) {
      // Return a default photo object so the frontend can handle it gracefully
      return res.json({
        photoId: id,
        url: '', // Empty URL means no image available
        caption: '',
        credit: '',
        width: 0,
        height: 0,
        format: 'jpg',
        size: 0,
        tags: [],
        raw: {}
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Construct the image URL
    const url = `${RAPIDAPI_IMAGE_URL}/${id}`;
    
    // Try to fetch photo from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Save photo to database
    const photoData = {
      photoId: id,
      url: response.data.url || url,
      caption: response.data.caption || '',
      credit: response.data.credit || '',
      width: response.data.width || 0,
      height: response.data.height || 0,
      format: response.data.format || 'jpg',
      size: response.data.size || 0,
      tags: response.data.tags || [],
      raw: response.data
    };

    const photo = new Photo(photoData);
    await photo.save();

    res.json(photo);
  } catch (error: any) {
    console.error('getPhotoById error:', error?.response?.data || error.message || error);
    
    // Handle rate limiting
    if (error?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    // If there's an error fetching the photo, return a default photo object
    res.status(200).json({
      photoId: req.params.id,
      url: '', // Empty URL means no image available
      caption: '',
      credit: '',
      width: 0,
      height: 0,
      format: 'jpg',
      size: 0,
      tags: [],
      raw: {}
    });
  }
};

// Function to get photo gallery - first check database, then API if needed
export const getPhotoGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // If API key is not available, return empty data
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PHOTOS_GALLERY_URL = process.env.RAPIDAPI_PHOTOS_GALLERY_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PHOTOS_GALLERY_URL) {
      // Return empty data when API key is not available
      return res.json({ photos: [] });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Replace the photo ID in the URL
    let url = RAPIDAPI_PHOTOS_GALLERY_URL;
    url = url.replace(/\/\d+$/, `/${id}`);
    
    // Try to fetch photo gallery from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error: any) {
    console.error('getPhotoGallery error:', error?.response?.data || error.message || error);
    
    // Handle rate limiting
    if (error?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    // Return empty data on error
    res.json({ photos: [] });
  }
};