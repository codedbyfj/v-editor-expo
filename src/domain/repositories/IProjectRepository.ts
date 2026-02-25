import { Project, CreateProjectInput } from '../entities/Project';

export interface IProjectRepository {
    initialize(): Promise<void>;
    create(input: CreateProjectInput): Promise<Project>;
    getById(id: string): Promise<Project | null>;
    getAll(): Promise<Project[]>;
    update(project: Project): Promise<void>;
    delete(id: string): Promise<void>;
}
