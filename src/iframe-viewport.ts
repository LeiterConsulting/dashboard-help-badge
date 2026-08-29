/** Clamp Splunk's generated iframe body to the dimensions delivered by the extension API. */
export function sizeIframeBody(width: number, height: number): void {
    const safeWidth = Math.max(0, Math.round(width));
    const safeHeight = Math.max(0, Math.round(height));
    const body = document.body;

    body.style.setProperty('width', `${safeWidth}px`, 'important');
    body.style.setProperty('max-width', `${safeWidth}px`, 'important');
    body.style.setProperty('min-width', '0', 'important');
    body.style.setProperty('height', `${safeHeight}px`, 'important');
    body.style.setProperty('max-height', `${safeHeight}px`, 'important');
    body.style.setProperty('min-height', '0', 'important');
}
