import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

// Debug environment variables
console.log('R2 Configuration:', {
    accountId: process.env.R2_ACCOUNT_ID ? '✓' : '✗',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ? '✓' : '✗',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ? '✓' : '✗',
    bucketName: process.env.R2_BUCKET_NAME ? '✓' : '✗',
});

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    const missing = [];
    if (!process.env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
    if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
    throw new Error(`Missing required R2 environment variables: ${missing.join(', ')}`);
}

// Initialize the S3 client for R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export interface MusicFile {
    key: string;
    size: number;
    lastModified: Date;
    type: 'album' | 'artist' | 'track';
    url?: string;
}

export async function listAllMusicFiles(prefix?: string): Promise<MusicFile[]> {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix || '', // If no prefix is provided, list everything
        });

        const response = await s3Client.send(command);
        
        if (!response.Contents) {
            return [];
        }

        return response.Contents.map(item => {
            const key = item.Key || '';
            let type: 'album' | 'artist' | 'track' = 'track';
            
            if (key.startsWith('album/')) {
                type = 'album';
            } else if (key.startsWith('artist/')) {
                type = 'artist';
            }

            return {
                key,
                size: item.Size || 0,
                lastModified: item.LastModified || new Date(),
                type,
            };
        });
    } catch (error) {
        console.error('Error listing music files from R2:', error);
        throw error;
    }
}

export async function listAlbums(): Promise<MusicFile[]> {
    return listAllMusicFiles('album/');
}

export async function listArtists(): Promise<MusicFile[]> {
    return listAllMusicFiles('artist/');
}

export async function getMusicFileUrl(key: string): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        // Get a presigned URL that's valid for 1 hour
        const url = await s3Client.send(command);
        return url.toString();
    } catch (error) {
        console.error('Error getting music file URL:', error);
        throw error;
    }
}
