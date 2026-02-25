export type LayerType = 'text' | 'audio' | 'effect';

export interface TextMetadata {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
    startTime: number;
    endTime: number;
}

export interface AudioMetadata {
    sourcePath: string;
    volume: number;
    startTime: number;
    endTime: number;
    fadeIn: number;
    fadeOut: number;
}

export interface EffectMetadata {
    type: string;
    params: Record<string, unknown>;
    startTime: number;
    endTime: number;
}

export type LayerMetadata = TextMetadata | AudioMetadata | EffectMetadata;

export interface Layer {
    id: string;
    projectId: string;
    type: LayerType;
    metadata: string; // JSON-serialized LayerMetadata
    order: number;
}

export interface CreateLayerInput {
    projectId: string;
    type: LayerType;
    metadata: LayerMetadata;
    order: number;
}
