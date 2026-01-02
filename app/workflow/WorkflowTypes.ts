export type NodeDto = {
    id: number;
    company_id: number;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

export type EdgeDto = {
    id: number;
    source_node_id: number;
    destination_node_id: number;
    label: string;
    priority: number;
    created_at?: string;
    updated_at?: string;
};

export type Envelope<T> = {
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
};
