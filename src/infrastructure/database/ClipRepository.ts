import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { Clip, CreateClipInput } from '../../domain/entities/Clip';
import { IClipRepository } from '../../domain/repositories/IClipRepository';

export class ClipRepository implements IClipRepository {
    async create(input: CreateClipInput): Promise<Clip> {
        const db = await getDatabase();
        const clip: Clip = {
            id: uuidv4(),
            projectId: input.projectId,
            sourcePath: input.sourcePath,
            startTime: input.startTime,
            endTime: input.endTime,
            duration: input.duration,
            order: input.order,
        };

        await db.runAsync(
            `INSERT INTO clips (id, project_id, source_path, start_time, end_time, duration, clip_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [clip.id, clip.projectId, clip.sourcePath, clip.startTime, clip.endTime, clip.duration, clip.order]
        );

        return clip;
    }

    async getByProjectId(projectId: string): Promise<Clip[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
            id: string;
            project_id: string;
            source_path: string;
            proxy_path: string | null;
            thumbnail_path: string | null;
            start_time: number;
            end_time: number;
            duration: number;
            clip_order: number;
        }>('SELECT * FROM clips WHERE project_id = ? ORDER BY clip_order ASC', [projectId]);

        return rows.map(this.mapRow);
    }

    async getById(id: string): Promise<Clip | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string;
            project_id: string;
            source_path: string;
            proxy_path: string | null;
            thumbnail_path: string | null;
            start_time: number;
            end_time: number;
            duration: number;
            clip_order: number;
        }>('SELECT * FROM clips WHERE id = ?', [id]);

        if (!row) return null;
        return this.mapRow(row);
    }

    async update(clip: Clip): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(
            `UPDATE clips SET
        source_path = ?, proxy_path = ?, thumbnail_path = ?,
        start_time = ?, end_time = ?, duration = ?, clip_order = ?
       WHERE id = ?`,
            [
                clip.sourcePath, clip.proxyPath ?? null, clip.thumbnailPath ?? null,
                clip.startTime, clip.endTime, clip.duration, clip.order, clip.id,
            ]
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM clips WHERE id = ?', [id]);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM clips WHERE project_id = ?', [projectId]);
    }

    async reorder(projectId: string, clipIds: string[]): Promise<void> {
        const db = await getDatabase();
        for (let i = 0; i < clipIds.length; i++) {
            await db.runAsync(
                'UPDATE clips SET clip_order = ? WHERE id = ? AND project_id = ?',
                [i, clipIds[i], projectId]
            );
        }
    }

    private mapRow(row: {
        id: string;
        project_id: string;
        source_path: string;
        proxy_path: string | null;
        thumbnail_path: string | null;
        start_time: number;
        end_time: number;
        duration: number;
        clip_order: number;
    }): Clip {
        return {
            id: row.id,
            projectId: row.project_id,
            sourcePath: row.source_path,
            proxyPath: row.proxy_path ?? undefined,
            thumbnailPath: row.thumbnail_path ?? undefined,
            startTime: row.start_time,
            endTime: row.end_time,
            duration: row.duration,
            order: row.clip_order,
        };
    }
}
