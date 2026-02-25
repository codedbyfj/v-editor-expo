import { ClipRepository } from '../../infrastructure/database';
import * as VideoProcessor from '../../infrastructure/video-engine/VideoProcessor';
import { ExportSettings } from '../entities';
import { ProgressCallback } from '../../bridge/nativeVideoEngine';

const clipRepo = new ClipRepository();

/**
 * Export Video Use Case
 *
 * Handles the full export flow:
 * 1. Load project clips
 * 2. Merge if multiple clips
 * 3. Apply export settings (resolution, HW accel)
 * 4. Save to gallery
 */
export async function exportVideo(
    projectId: string,
    settings: ExportSettings,
    onProgress?: ProgressCallback
): Promise<string> {
    // 1. Load clips
    const clips = await clipRepo.getByProjectId(projectId);
    if (clips.length === 0) {
        throw new Error('No clips to export. Add at least one video clip.');
    }

    // 2. Determine input path
    let inputPath = clips[0].sourcePath;

    // 3. Merge if multiple clips
    if (clips.length > 1) {
        const paths = clips.map((c) => c.sourcePath);
        inputPath = await VideoProcessor.mergeClips(paths, projectId, (time) => {
            onProgress?.(time * 0.4); // 40% of total progress for merge
        });
    }

    // 4. Export with settings
    const outputPath = await VideoProcessor.exportVideo(
        inputPath,
        projectId,
        settings,
        (time) => {
            const mergeOffset = clips.length > 1 ? 0.4 : 0;
            onProgress?.(time * (1 - mergeOffset) + mergeOffset); // remaining progress for export
        }
    );

    return outputPath;
}
