/**
 * Saves a blob to the user's downloads under `filename`.
 *
 * Two details matter and are easy to get wrong. The anchor has to be in the
 * document for the click to register in Firefox, and the object URL must outlive
 * the click — the browser reads the blob asynchronously, so revoking it on the
 * next line can cancel the download before it starts. Deferring the revoke to a
 * macrotask lets the fetch begin first.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
