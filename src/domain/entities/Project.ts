export interface Project {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
}

export interface CreateProjectInput {
    name: string;
}
