import { Layer, CreateLayerInput } from '../entities/Layer';

export interface ILayerRepository {
    create(input: CreateLayerInput): Promise<Layer>;
    getByProjectId(projectId: string): Promise<Layer[]>;
    getById(id: string): Promise<Layer | null>;
    update(layer: Layer): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
