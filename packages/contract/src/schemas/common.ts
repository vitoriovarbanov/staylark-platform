// Generic API response wrappers — plain interfaces, not Zod schemas
// These are structural types for consistent API responses

export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiError {
    error: string;
    message: string;
    statusCode: number;
    errorCode?: string;
    details?: unknown;
}
