import { Platform } from 'react-native';
import { ExportSettings, RESOLUTION_MAP } from '../../domain/entities';

/**
 * FFmpeg Command Builder
 *
 * Generates validated FFmpeg command strings for all video operations.
 * All paths are sanitized before use.
 */

function sanitizePath(path: string): string {
    // Escape single quotes and wrap in quotes for FFmpeg
    return path.replace(/'/g, "'\\''");
}

/**
 * Trim without re-encoding (fast, stream copy)
 */
export function buildTrimCopyCommand(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
): string {
    return `-ss ${startTime} -to ${endTime} -i "${sanitizePath(inputPath)}" -c copy -avoid_negative_ts make_zero "${sanitizePath(outputPath)}"`;
}

/**
 * Trim with re-encoding (precise frame-accurate)
 */
export function buildTrimEncodeCommand(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number,
    crf: number = 23
): string {
    return `-ss ${startTime} -to ${endTime} -i "${sanitizePath(inputPath)}" -c:v libx264 -crf ${crf} -preset medium -c:a aac -b:a 128k "${sanitizePath(outputPath)}"`;
}

/**
 * Merge multiple videos using concat demuxer
 * @param listFilePath - path to a text file containing: file 'path1'\nfile 'path2'\n...
 */
export function buildMergeCommand(
    listFilePath: string,
    outputPath: string
): string {
    return `-f concat -safe 0 -i "${sanitizePath(listFilePath)}" -c copy "${sanitizePath(outputPath)}"`;
}

/**
 * Generate a low-resolution proxy for timeline preview
 */
export function buildProxyCommand(
    inputPath: string,
    outputPath: string,
    maxHeight: number = 480
): string {
    return `-i "${sanitizePath(inputPath)}" -vf "scale=-2:${maxHeight}" -preset ultrafast -crf 35 -c:a aac -b:a 64k "${sanitizePath(outputPath)}"`;
}

/**
 * Extract a single thumbnail at a specific time
 */
export function buildThumbnailCommand(
    inputPath: string,
    outputPath: string,
    timeSeconds: number = 0
): string {
    return `-ss ${timeSeconds} -i "${sanitizePath(inputPath)}" -vframes 1 -q:v 2 "${sanitizePath(outputPath)}"`;
}

/**
 * Mix audio track into video with volume control
 */
export function buildAudioMixCommand(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    audioVolume: number = 0.3
): string {
    return `-i "${sanitizePath(videoPath)}" -i "${sanitizePath(audioPath)}" -filter_complex "[1:a]volume=${audioVolume}[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k "${sanitizePath(outputPath)}"`;
}

/**
 * Burn text overlay onto video
 */
export function buildTextBurnCommand(
    inputPath: string,
    outputPath: string,
    text: string,
    options: {
        x?: number;
        y?: number;
        fontSize?: number;
        fontColor?: string;
        fontFile?: string;
    } = {}
): string {
    const {
        x = 10,
        y = 10,
        fontSize = 24,
        fontColor = 'white',
        fontFile,
    } = options;

    const escapedText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const fontDirective = fontFile ? `:fontfile='${sanitizePath(fontFile)}'` : '';

    return `-i "${sanitizePath(inputPath)}" -vf "drawtext=text='${escapedText}'${fontDirective}:x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:shadowcolor=black:shadowx=2:shadowy=2" -c:a copy "${sanitizePath(outputPath)}"`;
}

/**
 * Hardware-accelerated export command
 */
export function buildExportCommand(
    inputPath: string,
    outputPath: string,
    settings: ExportSettings
): string {
    const resolution = RESOLUTION_MAP[settings.resolution];
    const bitrateMap: Record<string, string> = {
        low: '2M',
        medium: '5M',
        high: '10M',
    };
    const bitrate = bitrateMap[settings.quality];

    let videoCodec: string;
    if (settings.useHardwareAcceleration) {
        videoCodec = Platform.OS === 'android' ? 'h264_mediacodec' : 'h264_videotoolbox';
    } else {
        videoCodec = 'libx264';
    }

    const scale = `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`;

    return `-i "${sanitizePath(inputPath)}" -vf "${scale}" -c:v ${videoCodec} -b:v ${bitrate} -c:a aac -b:a 128k -movflags +faststart "${sanitizePath(outputPath)}"`;
}

/**
 * Build a concat list file content from an array of file paths
 */
export function buildConcatListContent(filePaths: string[]): string {
    return filePaths
        .map((p) => `file '${sanitizePath(p)}'`)
        .join('\n');
}
