import { api } from './api.js';
import { extractPublicId } from '@staylark/contract';

interface SignatureData {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
    allowedFormats: string;
}

interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
}

export interface UploadedImage {
    url: string;
    publicId: string;
}

/**
 * Uploads a file directly to Cloudinary using a backend-signed request.
 * 1. Fetches signed params from backend
 * 2. POSTs file directly to Cloudinary
 * 3. Returns the secure URL and public ID
 */
export async function uploadToCloudinary(file: File, folder: string = 'properties'): Promise<UploadedImage> {
    // 1. Get signed params from backend
    const {
        data: { data: creds }
    } = await api.post<{ data: SignatureData }>('/api/upload/signature', { folder });

    // 2. Build FormData for Cloudinary direct upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', creds.apiKey);
    formData.append('timestamp', String(creds.timestamp));
    formData.append('signature', creds.signature);
    formData.append('folder', creds.folder);
    formData.append('allowed_formats', creds.allowedFormats);

    // 3. Upload directly to Cloudinary (not through our backend)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message ?? 'Upload failed');
    }

    const result: CloudinaryUploadResponse = await response.json();

    return {
        url: result.secure_url,
        publicId: result.public_id
    };
}

/**
 * Deletes an image from Cloudinary via the backend.
 * Extracts publicId from the Cloudinary URL automatically.
 */
export async function deleteFromCloudinary(imageUrl: string): Promise<void> {
    const publicId = extractPublicId(imageUrl);
    await api.delete('/api/upload', { data: { publicId } });
}
