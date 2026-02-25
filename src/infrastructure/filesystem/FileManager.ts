import { Paths, File, Directory } from 'expo-file-system';

/**
 * File Manager
 *
 * Manages app directory structure, cache, and file operations.
 * Uses Expo SDK 54+ new File/Directory API (Paths.document, Paths.cache).
 * All paths are sandboxed within the app's document/cache directories.
 */

const APP_DIR = 'veditor';

export class FileManager {
    /**
     * Get the base app directory
     */
    static getBaseDir(): Directory {
        return new Directory(Paths.document, APP_DIR);
    }

    /**
     * Get the project directory
     */
    static getProjectDir(projectId: string): Directory {
        return new Directory(Paths.document, APP_DIR, 'projects', projectId);
    }

    /**
     * Get the cache directory for temporary files
     */
    static getCacheDir(): Directory {
        return new Directory(Paths.cache, APP_DIR);
    }

    /**
     * Initialize the app directory structure
     */
    static async initialize(): Promise<void> {
        const dirs = [
            FileManager.getBaseDir(),
            new Directory(Paths.document, APP_DIR, 'projects'),
            new Directory(Paths.document, APP_DIR, 'exports'),
            FileManager.getCacheDir(),
        ];

        for (const dir of dirs) {
            if (!dir.exists) {
                dir.create();
            }
        }
    }

    /**
     * Initialize project directory with subdirectories
     */
    static async initProjectDir(projectId: string): Promise<void> {
        const projectDir = FileManager.getProjectDir(projectId);
        const subdirs = ['sources', 'proxies', 'thumbnails', 'temp'];

        if (!projectDir.exists) {
            projectDir.create();
        }

        for (const sub of subdirs) {
            const dir = new Directory(projectDir, sub);
            if (!dir.exists) {
                dir.create();
            }
        }
    }

    /**
     * Copy a source file into the project directory
     */
    static async copySourceToProject(
        sourcePath: string,
        projectId: string
    ): Promise<string> {
        await FileManager.initProjectDir(projectId);
        const filename = sourcePath.split('/').pop() || `video_${Date.now()}.mp4`;
        const destDir = new Directory(FileManager.getProjectDir(projectId), 'sources');
        const sourceFile = new File(sourcePath);
        const destFile = new File(destDir, filename);

        sourceFile.copy(destFile);
        return destFile.uri;
    }

    /**
     * Get proxy output path for a source file
     */
    static async getProxyPath(projectId: string, sourcePath: string): Promise<string> {
        await FileManager.initProjectDir(projectId);
        const baseName = sourcePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'proxy';
        const proxyFile = new File(FileManager.getProjectDir(projectId), 'proxies', `${baseName}_proxy.mp4`);
        return proxyFile.uri;
    }

    /**
     * Get thumbnail output path
     */
    static async getThumbnailPath(projectId: string, sourcePath: string): Promise<string> {
        await FileManager.initProjectDir(projectId);
        const baseName = sourcePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'thumb';
        const thumbFile = new File(FileManager.getProjectDir(projectId), 'thumbnails', `${baseName}_thumb.jpg`);
        return thumbFile.uri;
    }

    /**
     * Get a temporary output path for processing
     */
    static async getTempOutputPath(
        projectId: string,
        prefix: string,
        extension: string = '.mp4'
    ): Promise<string> {
        await FileManager.initProjectDir(projectId);
        const tempFile = new File(FileManager.getProjectDir(projectId), 'temp', `${prefix}_${Date.now()}${extension}`);
        return tempFile.uri;
    }

    /**
     * Get export output path
     */
    static async getExportPath(projectId: string, format: string = 'mp4'): Promise<string> {
        const exportFile = new File(Paths.document, APP_DIR, 'exports', `export_${projectId}_${Date.now()}.${format}`);
        return exportFile.uri;
    }

    /**
     * Clean up temporary files for a project
     */
    static async cleanTempFiles(projectId: string): Promise<void> {
        const tempDir = new Directory(FileManager.getProjectDir(projectId), 'temp');
        if (tempDir.exists) {
            tempDir.delete();
            tempDir.create();
        }
    }

    /**
     * Delete all files for a project
     */
    static async deleteProjectFiles(projectId: string): Promise<void> {
        const projectDir = FileManager.getProjectDir(projectId);
        if (projectDir.exists) {
            projectDir.delete();
        }
    }

    /**
     * Clean the entire cache directory
     */
    static async cleanCache(): Promise<void> {
        const cacheDir = FileManager.getCacheDir();
        if (cacheDir.exists) {
            cacheDir.delete();
            cacheDir.create();
        }
    }

    /**
     * Check available disk space
     * Returns true if there's at least minBytes available
     */
    static async checkDiskSpace(minBytes: number): Promise<boolean> {
        try {
            const freeSpace = Paths.availableDiskSpace;
            return freeSpace >= minBytes;
        } catch {
            // If we can't check, assume there's space and let FFmpeg fail
            return true;
        }
    }

    /**
     * Get file size in bytes
     */
    static async getFileSize(filePath: string): Promise<number> {
        try {
            const file = new File(filePath);
            if (file.exists) {
                return file.size ?? 0;
            }
        } catch {
            // ignore
        }
        return 0;
    }

    /**
     * Validate that a file exists and is accessible
     */
    static async validatePath(filePath: string): Promise<boolean> {
        if (!filePath || filePath.includes('..')) return false;
        try {
            const file = new File(filePath);
            return file.exists;
        } catch {
            return false;
        }
    }
}
