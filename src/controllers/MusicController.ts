import { Request, Response } from 'express';
import { MusicService } from '../services/MusicService';
import { MusicServiceError } from '../types/music';

export class MusicController {
    private musicService: MusicService;
    private static instance: MusicController;

    private constructor() {
        this.musicService = MusicService.getInstance();
    }

    public static getInstance(): MusicController {
        if (!MusicController.instance) {
            MusicController.instance = new MusicController();
        }
        return MusicController.instance;
    }

    private handleError(res: Response, error: unknown) {
        console.error('Music Controller Error:', error);
        
        if (error instanceof MusicServiceError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                code: error.code
            });
        } else {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'An unexpected error occurred'
            });
        }
    }

    public getAllMusic = async (req: Request, res: Response): Promise<void> => {
        try {
            const musicFiles = await this.musicService.listFiles();
            res.json({ success: true, data: musicFiles });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    public getAlbums = async (req: Request, res: Response): Promise<void> => {
        try {
            const albums = await this.musicService.listAlbums();
            res.json({ success: true, data: albums });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    public getArtists = async (req: Request, res: Response): Promise<void> => {
        try {
            const artists = await this.musicService.listArtists();
            res.json({ success: true, data: artists });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    public getAlbumContents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { albumName } = req.params;
            const contents = await this.musicService.getAlbumContents(albumName);
            res.json({ success: true, data: contents });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    public getArtistContents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { artistName } = req.params;
            const contents = await this.musicService.getArtistContents(artistName);
            res.json({ success: true, data: contents });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    public getMusicFileUrl = async (req: Request, res: Response): Promise<void> => {
        try {
            const { key } = req.params;
            const url = await this.musicService.getFileUrl(key);
            res.json({ success: true, url });
        } catch (error) {
            this.handleError(res, error);
        }
    };
}
