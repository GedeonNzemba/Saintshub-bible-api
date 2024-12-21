import { Router } from 'express';
import { MusicController } from '../controllers/MusicController';

const router = Router();
const musicController = MusicController.getInstance();

// List all music files
router.get('/', musicController.getAllMusic);

// List albums and artists
router.get('/albums', musicController.getAlbums);
router.get('/artists', musicController.getArtists);

// Get contents of specific album or artist
router.get('/albums/:albumName', musicController.getAlbumContents);
router.get('/artists/:artistName', musicController.getArtistContents);

// Get file URL
router.get('/file/:key(*)', musicController.getMusicFileUrl);

export default router;
