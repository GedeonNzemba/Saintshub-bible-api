import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import config from '../config';
import { MusicFile, MusicFileType, MusicServiceError } from '../types/music';

export class MusicService {
    private s3Client: S3Client;
    private static instance: MusicService;

    private constructor() {
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: config.r2.endpoint,
            credentials: {
                accessKeyId: config.r2.accessKeyId,
                secretAccessKey: config.r2.secretAccessKey,
            },
        });
    }

    public static getInstance(): MusicService {
        if (!MusicService.instance) {
            MusicService.instance = new MusicService();
        }
        return MusicService.instance;
    }

    private determineFileType(key: string): MusicFileType {
        if (key.startsWith('album/')) return 'album';
        if (key.startsWith('artist/')) return 'artist';
        return 'track';
    }

    private handleError(error: any): never {
        const message = error.message || 'An error occurred in the music service';
        const statusCode = error.statusCode || 500;
        const code = error.Code || error.code;
        
        throw new MusicServiceError(message, statusCode, code);
    }

    private async listFilesWithPrefix(prefix: string): Promise<MusicFile[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: config.r2.bucketName,
                Prefix: prefix,
                Delimiter: '/',
            });

            const response = await this.s3Client.send(command);
            const items: MusicFile[] = [];

            // Add directories (CommonPrefixes)
            if (response.CommonPrefixes) {
                for (const prefix of response.CommonPrefixes) {
                    if (prefix.Prefix) {
                        const name = prefix.Prefix.split('/').filter(p => p).pop() || '';
                        items.push({
                            key: prefix.Prefix,
                            size: 0,
                            lastModified: new Date(),
                            type: this.determineFileType(prefix.Prefix),
                            name
                        });
                    }
                }
            }

            // Add files
            if (response.Contents) {
                for (const item of response.Contents) {
                    if (item.Key && !item.Key.endsWith('/')) {
                        const name = item.Key.split('/').filter(p => p).pop() || '';
                        items.push({
                            key: item.Key,
                            size: item.Size || 0,
                            lastModified: item.LastModified || new Date(),
                            type: this.determineFileType(item.Key),
                            name
                        });
                    }
                }
            }

            return items;
        } catch (error) {
            this.handleError(error);
        }
    }

    public async listFiles(): Promise<MusicFile[]> {
        return this.listFilesWithPrefix('');
    }

    public async listAlbums(): Promise<MusicFile[]> {
        const albums = await this.listFilesWithPrefix('album/');
        return albums.filter(item => item.type === 'album');
    }

    public async listArtists(): Promise<MusicFile[]> {
        const artists = await this.listFilesWithPrefix('artist/');
        return artists.filter(item => item.type === 'artist');
    }

    public async getAlbumContents(albumName: string): Promise<MusicFile[]> {
        return this.listFilesWithPrefix(`album/${albumName}/`);
    }

    public async getArtistContents(artistName: string): Promise<MusicFile[]> {
        return this.listFilesWithPrefix(`artist/${artistName}/`);
    }

    public async getFileUrl(key: string): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: config.r2.bucketName,
                Key: key,
            });

            const url = await this.s3Client.send(command);
            return url.toString();
        } catch (error) {
            this.handleError(error);
        }
    }
}
