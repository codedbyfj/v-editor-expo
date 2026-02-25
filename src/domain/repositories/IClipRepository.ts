import { Clip, CreateClipInput } from '../entities/Clip';

export interface IClipRepository {
    create(input: CreateClipInput): Promise<Clip>;
    getByProjectId(projectId: string): Promise<Clip[]>;
    getById(id: string): Promise<Clip | null>;
    update(clip: Clip): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    reorder(projectId: string, clipIds: string[]): Promise<void>;
}
