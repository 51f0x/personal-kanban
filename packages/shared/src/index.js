"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCaptureText = parseCaptureText;
const urlRegex = /(https?:\/\/[^\s]+)/i;
function parseCaptureText(text) {
    const urlMatch = text.match(urlRegex);
    const url = urlMatch?.[0];
    const title = (text.replace(urlRegex, '').trim() || url || 'Captured item').slice(0, 120);
    return {
        title,
        description: text.trim(),
        metadata: {
            url,
            raw: text,
            extractedAt: new Date().toISOString(),
        },
    };
}
