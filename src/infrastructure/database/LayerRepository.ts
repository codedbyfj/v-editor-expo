import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { Layer, CreateLayerInput, LayerMetadata } from '../../domain/entities/Layer';
import { ILayerRepository } from '../../domain/repositories/ILayerRepository';

export class LayerRepository implements ILayerRepository {
    async create(input: CreateLayerInput): Promise<Layer> {
        const db = await getDatabase();
        const layer: Layer = {
            id: uuidv4(),
            projectId: input.projectId,
            type: input.type,
            metadata: JSON.stringify(input.metadata),
            order: input.order,
        };

        await db.runAsync(
            `INSERT INTO layers (id, project_id, type, metadata, layer_order)
       VALUES (?, ?, ?, ?, ?)`,
            [layer.id, layer.projectId, layer.type, layer.metadata, layer.order]
        );

        return layer;
    }

    async getByProjectId(projectId: string): Promise<Layer[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
            id: string;
            project_id: string;
            type: string;
            metadata: string;
            layer_order: number;
        }>('SELECT * FROM layers WHERE project_id = ? ORDER BY layer_order ASC', [projectId]);

        return rows.map(this.mapRow);
    }

    async getById(id: string): Promise<Layer | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string;
            project_id: string;
            type: string;
            metadata: string;
            layer_order: number;
        }>('SELECT * FROM layers WHERE id = ?', [id]);

        if (!row) return null;
        return this.mapRow(row);
    }

    async update(layer: Layer): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(
            'UPDATE layers SET type = ?, metadata = ?, layer_order = ? WHERE id = ?',
            [layer.type, layer.metadata, layer.order, layer.id]
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM layers WHERE id = ?', [id]);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM layers WHERE project_id = ?', [projectId]);
    }

    parseMetadata(layer: Layer): LayerMetadata {
        return JSON.parse(layer.metadata) as LayerMetadata;
    }

    private mapRow(row: {
        id: string;
        project_id: string;
        type: string;
        metadata: string;
        layer_order: number;
    }): Layer {
        return {
            id: row.id,
            projectId: row.project_id,
            type: row.type as Layer['type'],
            metadata: row.metadata,
            order: row.layer_order,
        };
    }
}
