export interface Clip {
    id: string;
    projectId: string;
    sourcePath: string;
    proxyPath?: string;
    thumbnailPath?: string;
    startTime: number;
    endTime: number;
    duration: number;
    order: number;
}

export interface CreateClipInput {
    projectId: string;
    sourcePath: string;
    startTime: number;
    endTime: number;
    duration: number;
    order: number;
}
