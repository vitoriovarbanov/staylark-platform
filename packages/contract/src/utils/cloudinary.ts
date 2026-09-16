/**
 * Builds an optimized Cloudinary URL with transformations.
 *
 * Input:  https://res.cloudinary.com/demo/image/upload/v1234/properties/abc.jpg
 * Output: https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1234/properties/abc.jpg
 *
 * f_auto — serves WebP/AVIF based on browser support
 * q_auto — automatic quality optimization
 * w_N / h_N — optional resize
 */
export function cloudinaryUrl(url: string, options: { width?: number; height?: number; crop?: string } = {}): string {
    const transforms = ['f_auto', 'q_auto'];
    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.crop) transforms.push(`c_${options.crop}`);

    const transformStr = transforms.join(',');

    // Insert transforms after "upload/"
    return url.replace('/image/upload/', `/image/upload/${transformStr}/`);
}

/**
 * Extracts the public ID from a Cloudinary URL.
 *
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/properties/abc123.jpg
 * Returns: "properties/abc123"
 */
export function extractPublicId(cloudinaryUrl: string): string {
    const url = new URL(cloudinaryUrl);
    // Path: /demo/image/upload/v1234567890/properties/abc123.jpg
    const parts = url.pathname.split('/');
    // Find the "upload" segment, skip version (v*), take the rest without extension
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) {
        throw new Error(`Invalid Cloudinary URL: ${cloudinaryUrl}`);
    }
    // Skip "upload" and version segment (v1234...)
    const startIndex = parts[uploadIndex + 1]?.startsWith('v') ? uploadIndex + 2 : uploadIndex + 1;
    const publicIdWithExt = parts.slice(startIndex).join('/');
    // Remove file extension
    return publicIdWithExt.replace(/\.[^/.]+$/, '');
}
