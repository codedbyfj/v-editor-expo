import { File as ExpoFile } from 'expo-file-system';
import { executeFFmpeg, getMediaInfo, ProgressCallback, cancelAllSessions } from '../../bridge/nativeVideoEngine';
import * as CommandBuilder from './CommandBuilder';
import { FileManager } from '../filesystem/FileManager';
import { ExportSettings, MediaInfo } from '../../domain/entities';

/**
 * Video Processor
 *
 * Manages video processing operations with a single-task execution queue.
 * Ensures only one FFmpeg operation runs at a time (mutex pattern).
 */

type ProcessingStatus = 'idle' | 'processing';

let currentStatus: ProcessingStatus = 'idle';
let isProcessingCancelled = false;

function assertIdle() {
    if (currentStatus === 'processing') {
        throw new Error('Another processing task is already running. Cancel it first.');
    }
}

function beginProcessing() {
    assertIdle();
    currentStatus = 'processing';
    isProcessingCancelled = false;
}

function endProcessing() {
    currentStatus = 'idle';
    isProcessingCancelled = false;
}

/**
 * Cancel the current processing operation
 */
export async function cancelProcessing(): Promise<void> {
    isProcessingCancelled = true;
    await cancelAllSessions();
    endProcessing();
}

/**
 * Get current processing status
 */
export function getProcessingStatus(): ProcessingStatus {
    return currentStatus;
}

/**
 * Generate a low-res proxy video for timeline preview
 */
export async function generateProxy(
    sourcePath: string,
    projectId: string,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        const outputPath = await FileManager.getProxyPath(projectId, sourcePath);

        // Check if proxy already exists
        const proxyFile = new ExpoFile(outputPath);
        if (proxyFile.exists) {
            endProcessing();
            return outputPath;
        }

        const command = CommandBuilder.buildProxyCommand(sourcePath, outputPath);
        await executeFFmpeg(command, onProgress);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Extract a thumbnail from a video
 */
export async function extractThumbnail(
    sourcePath: string,
    projectId: string,
    timeSeconds: number = 1
): Promise<string> {
    beginProcessing();
    try {
        const outputPath = await FileManager.getThumbnailPath(projectId, sourcePath);

        // Check if thumbnail already exists
        const thumbFile = new ExpoFile(outputPath);
        if (thumbFile.exists) {
            endProcessing();
            return outputPath;
        }

        const command = CommandBuilder.buildThumbnailCommand(sourcePath, outputPath, timeSeconds);
        await executeFFmpeg(command);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Trim a video clip (stream copy — fast)
 */
export async function trimClipCopy(
    sourcePath: string,
    projectId: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        const outputPath = await FileManager.getTempOutputPath(projectId, 'trim');
        const command = CommandBuilder.buildTrimCopyCommand(sourcePath, outputPath, startTime, endTime);
        await executeFFmpeg(command, onProgress);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Trim a video clip (re-encode — precise)
 */
export async function trimClipEncode(
    sourcePath: string,
    projectId: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        const outputPath = await FileManager.getTempOutputPath(projectId, 'trim');
        const command = CommandBuilder.buildTrimEncodeCommand(sourcePath, outputPath, startTime, endTime);
        await executeFFmpeg(command, onProgress);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Merge multiple clips into a single video
 */
export async function mergeClips(
    clipPaths: string[],
    projectId: string,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        // Create concat list file
        const listContent = CommandBuilder.buildConcatListContent(clipPaths);
        const listPath = await FileManager.getTempOutputPath(projectId, 'concat_list', '.txt');
        const listFile = new ExpoFile(listPath);
        listFile.write(listContent);

        const outputPath = await FileManager.getTempOutputPath(projectId, 'merge');
        const command = CommandBuilder.buildMergeCommand(listPath, outputPath);
        await executeFFmpeg(command, onProgress);

        // Clean up list file
        listFile.delete();

        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Mix an audio track into a video
 */
export async function mixAudio(
    videoPath: string,
    audioPath: string,
    projectId: string,
    volume: number = 0.3,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        const outputPath = await FileManager.getTempOutputPath(projectId, 'audiomix');
        const command = CommandBuilder.buildAudioMixCommand(videoPath, audioPath, outputPath, volume);
        await executeFFmpeg(command, onProgress);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Export final video with specified settings
 */
export async function exportVideo(
    inputPath: string,
    projectId: string,
    settings: ExportSettings,
    onProgress?: ProgressCallback
): Promise<string> {
    beginProcessing();
    try {
        // Check disk space
        const hasSpace = await FileManager.checkDiskSpace(500 * 1024 * 1024); // 500MB min
        if (!hasSpace) {
            throw new Error('Insufficient disk space for export. Free up at least 500MB.');
        }

        const outputPath = await FileManager.getExportPath(projectId, settings.format);
        const command = CommandBuilder.buildExportCommand(inputPath, outputPath, settings);
        await executeFFmpeg(command, onProgress);
        endProcessing();
        return outputPath;
    } catch (error) {
        endProcessing();
        throw error;
    }
}

/**
 * Get media information for a file
 */
export async function probeMedia(filePath: string): Promise<MediaInfo> {
    return getMediaInfo(filePath);
}
