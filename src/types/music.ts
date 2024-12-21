export type MusicFileType = 'album' | 'artist' | 'track';

export interface MusicFile {
    key: string;
    size: number;
    lastModified: Date;
    type: MusicFileType;
    url?: string;
    name: string;
}

export class MusicServiceError extends Error {
    public statusCode: number;
    public code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.name = 'MusicServiceError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, MusicServiceError.prototype);
    }
}
