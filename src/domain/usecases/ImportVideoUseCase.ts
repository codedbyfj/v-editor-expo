import * as ImagePicker from 'expo-image-picker';
import { ProjectRepository, ClipRepository } from '../../infrastructure/database';
import { FileManager } from '../../infrastructure/filesystem';
import * as VideoProcessor from '../../infrastructure/video-engine/VideoProcessor';
import { Project, Clip } from '../entities';
import { ProgressCallback } from '../../bridge/nativeVideoEngine';

const projectRepo = new ProjectRepository();
const clipRepo = new ClipRepository();

export interface ImportResult {
    project: Project;
    clip: Clip;
    proxyPath?: string;
    thumbnailPath?: string;
}

/**
 * Import Video Use Case
 *
 * Handles the full import flow:
 * 1. Pick video from gallery
 * 2. Copy to project directory
 * 3. Create clip record
 * 4. Generate proxy + thumbnail
 */
export async function importVideo(
    projectId: string,
    onProgress?: ProgressCallback
): Promise<ImportResult | null> {
    // 1. Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Media library permission is required to import videos.');
    }

    // 2. Pick video
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 600,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];

    // 3. Copy to project directory
    const localPath = await FileManager.copySourceToProject(asset.uri, projectId);

    // 4. Get media duration
    let duration = (asset.duration || 10000) / 1000;
    try {
        const info = await VideoProcessor.probeMedia(localPath);
        duration = info.duration;
    } catch {
        // FFmpegKit may not be installed yet
    }

    // 5. Get existing clips for ordering
    const existingClips = await clipRepo.getByProjectId(projectId);

    // 6. Create clip record
    const clip = await clipRepo.create({
        projectId,
        sourcePath: localPath,
        startTime: 0,
        endTime: duration,
        duration,
        order: existingClips.length,
    });

    // 7. Generate proxy and thumbnail (non-blocking errors)
    let proxyPath: string | undefined;
    let thumbnailPath: string | undefined;

    try {
        proxyPath = await VideoProcessor.generateProxy(localPath, projectId, onProgress);
        clip.proxyPath = proxyPath;
        await clipRepo.update(clip);
    } catch {
        console.warn('Proxy generation skipped');
    }

    try {
        thumbnailPath = await VideoProcessor.extractThumbnail(localPath, projectId);
        clip.thumbnailPath = thumbnailPath;
        await clipRepo.update(clip);
    } catch {
        console.warn('Thumbnail extraction skipped');
    }

    // 8. Update project timestamp
    const project = await projectRepo.getById(projectId);
    if (project) {
        await projectRepo.update(project);
    }

    return {
        project: project!,
        clip,
        proxyPath,
        thumbnailPath,
    };
}
