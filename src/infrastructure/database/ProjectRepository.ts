import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { Project, CreateProjectInput } from '../../domain/entities/Project';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';

export class ProjectRepository implements IProjectRepository {
    async initialize(): Promise<void> {
        await getDatabase();
    }

    async create(input: CreateProjectInput): Promise<Project> {
        const db = await getDatabase();
        const now = Date.now();
        const project: Project = {
            id: uuidv4(),
            name: input.name,
            createdAt: now,
            updatedAt: now,
        };

        await db.runAsync(
            'INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [project.id, project.name, project.createdAt, project.updatedAt]
        );

        return project;
    }

    async getById(id: string): Promise<Project | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string;
            name: string;
            created_at: number;
            updated_at: number;
        }>('SELECT * FROM projects WHERE id = ?', [id]);

        if (!row) return null;

        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async getAll(): Promise<Project[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
            id: string;
            name: string;
            created_at: number;
            updated_at: number;
        }>('SELECT * FROM projects ORDER BY updated_at DESC');

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }

    async update(project: Project): Promise<void> {
        const db = await getDatabase();
        project.updatedAt = Date.now();
        await db.runAsync(
            'UPDATE projects SET name = ?, updated_at = ? WHERE id = ?',
            [project.name, project.updatedAt, project.id]
        );
    }

    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
    }
}
