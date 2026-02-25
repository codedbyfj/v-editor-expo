export * from './Project';
export * from './Clip';
export * from './Layer';

export interface MediaInfo {
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    codec: string;
    fps: number;
    fileSize: number;
}

export interface ExportSettings {
    resolution: '480p' | '720p' | '1080p' | '4k';
    quality: 'low' | 'medium' | 'high';
    useHardwareAcceleration: boolean;
    format: 'mp4' | 'mov';
}

export const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
};
