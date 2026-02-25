/**
 * Native Video Engine Bridge
 *
 * This module wraps ffmpeg-kit-react-native for JS consumption.
 * It provides promise-based FFmpeg execution with throttled progress events.
 *
 * NOTE: This requires ffmpeg-kit-react-native to be installed.
 * For Expo Development Build, you must run `npx expo prebuild` after installing.
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// FFmpegKit types
export interface FFmpegSession {
    getReturnCode: () => Promise<{ isValueSuccess: () => boolean; getValue: () => number }>;
    getOutput: () => Promise<string>;
    cancel: () => void;
}

export interface MediaInfoResult {
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    codec: string;
    fps: number;
    fileSize: number;
}

export type ProgressCallback = (progress: number) => void;

// Throttle interval for progress events (ms)
const PROGRESS_THROTTLE_MS = 250;

let FFmpegKit: any = null;
let FFprobeKit: any = null;

/**
 * Lazy-load FFmpegKit to avoid crashes when the native module isn't available
 */
async function loadFFmpegKit() {
    if (!FFmpegKit) {
        try {
            const module = require('ffmpeg-kit-react-native');
            FFmpegKit = module.FFmpegKit;
            FFprobeKit = module.FFprobeKit;
        } catch (error) {
            console.warn(
                '[VideoEngine] ffmpeg-kit-react-native not available. Install it and run npx expo prebuild.'
            );
            throw new Error('FFmpegKit is not installed. Run: npm install ffmpeg-kit-react-native');
        }
    }
}

/**
 * Execute an FFmpeg command
 */
export async function executeFFmpeg(
    command: string,
    onProgress?: ProgressCallback
): Promise<{ returnCode: number; output: string }> {
    await loadFFmpegKit();

    return new Promise((resolve, reject) => {
        let lastProgressTime = 0;

        FFmpegKit.executeAsync(
            command,
            // Completion callback
            async (session: any) => {
                const returnCode = await session.getReturnCode();
                const output = await session.getOutput();
                const code = returnCode.getValue();

                if (returnCode.isValueSuccess()) {
                    resolve({ returnCode: code, output });
                } else {
                    reject(
                        new Error(`FFmpeg failed with code ${code}: ${output.slice(-500)}`)
                    );
                }
            },
            // Log callback (no-op to reduce overhead)
            undefined,
            // Statistics callback (progress)
            (statistics: any) => {
                if (!onProgress) return;
                const now = Date.now();
                if (now - lastProgressTime < PROGRESS_THROTTLE_MS) return;
                lastProgressTime = now;

                const time = statistics.getTime();
                if (time > 0 && onProgress) {
                    onProgress(time);
                }
            }
        );
    });
}

/**
 * Cancel all running FFmpeg sessions
 */
export async function cancelAllSessions(): Promise<void> {
    await loadFFmpegKit();
    FFmpegKit.cancel();
}

/**
 * Get media info for a file using FFprobe
 */
export async function getMediaInfo(filePath: string): Promise<MediaInfoResult> {
    await loadFFmpegKit();

    return new Promise((resolve, reject) => {
        FFprobeKit.executeAsync(
            `-v quiet -print_format json -show_format -show_streams "${filePath}"`,
            async (session: any) => {
                try {
                    const output = await session.getOutput();
                    const data = JSON.parse(output);
                    const videoStream = data.streams?.find(
                        (s: any) => s.codec_type === 'video'
                    );
                    const format = data.format || {};

                    resolve({
                        duration: parseFloat(format.duration || '0'),
                        width: parseInt(videoStream?.width || '0', 10),
                        height: parseInt(videoStream?.height || '0', 10),
                        bitrate: parseInt(format.bit_rate || '0', 10),
                        codec: videoStream?.codec_name || 'unknown',
                        fps: evalFraction(videoStream?.r_frame_rate || '0/1'),
                        fileSize: parseInt(format.size || '0', 10),
                    });
                } catch (error) {
                    reject(new Error(`Failed to parse media info: ${error}`));
                }
            }
        );
    });
}

/**
 * Evaluate a fraction string like "30/1" to a number
 */
function evalFraction(fraction: string): number {
    const parts = fraction.split('/');
    if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        return den > 0 ? num / den : 0;
    }
    return parseFloat(fraction) || 0;
}
