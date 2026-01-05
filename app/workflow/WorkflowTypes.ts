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

export type ConditionDto = {
    id: number;
    edge_id: number;
    operator: string;
    compare_value: string;
    created_at?: string;
    updated_at?: string;
};

export type ConditionPropertyDto = {
    id: number;
    condition_id: number;
    property_id: number;
    created_at?: string;
    updated_at?: string;
};

export type PropertyDto = {
    id: number;
    company_id?: number;
    name: string;
    key?: string | null;
    type: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type NotificationDto = {
    id: number;
    trigger_node_id: number;
    company_id: number;
    subject: string;
    active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type NotificationRecipientDto = {
    id: number;
    notification_id: number;
    recipient_type: string;
    recipient_value: string;
    created_at?: string;
    updated_at?: string;
};
