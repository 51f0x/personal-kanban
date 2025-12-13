import { Injectable, Logger } from '@nestjs/common';

export interface WebContentResult {
    agentId: string;
    success: boolean;
    confidence?: number;
    error?: string;
    metadata?: Record<string, unknown>;
    url: string;
    title?: string;
    content?: string;
    textContent?: string;
    htmlContent?: string;
    contentType?: string;
    downloadedAt?: string;
}

/**
 * Web Content Agent
 * Downloads and extracts content from URLs found in tasks
 * Only works on actual data - downloads and parses web content
 */
@Injectable()
export class WebContentAgent {
    private readonly logger = new Logger(WebContentAgent.name);
    readonly agentId = 'web-content-agent';

    /**
     * Extract URL from text or metadata
     */
    extractUrl(text: string, metadata?: Record<string, unknown>): string | null {
        // Check metadata first
        if (metadata?.url && typeof metadata.url === 'string') {
            return metadata.url;
        }

        // Extract URL from text using regex
        const urlRegex = /(https?:\/\/[^\s]+)/i;
        const match = text.match(urlRegex);
        return match?.[0] || null;
    }

    /**
     * Download and extract content from a URL
     * Only works on actual data from the website
     */
    async downloadContent(url: string): Promise<WebContentResult> {
        const startTime = Date.now();

        try {
            this.logger.log(`Downloading content from: ${url}`);

            // Fetch the URL
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; PersonalKanban/1.0)',
                    Accept: 'text/html,application/xhtml+xml,application/xml;text/plain,*/*',
                },
                signal: AbortSignal.timeout(30000), // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            const isHtml = contentType.includes('text/html');
            const isText = contentType.includes('text/plain');

            let textContent: string | undefined;
            let htmlContent: string | undefined;
            let title: string | undefined;

            if (isHtml) {
                htmlContent = await response.text();
                textContent = this.extractTextFromHtml(htmlContent);
                title = this.extractTitleFromHtml(htmlContent);
            } else if (isText || contentType.includes('application/json')) {
                textContent = await response.text();
            } else {
                // For other content types, try to read as text but with limited length
                const content = await response.text();
                if (content.length < 100000) {
                    // Only if reasonable size
                    textContent = content;
                }
            }

            const downloadedAt = new Date().toISOString();
            const content = textContent || htmlContent || '';

            this.logger.log(
                `Downloaded ${content.length} characters from ${url} (${Date.now() - startTime}ms)`,
            );

            return {
                agentId: this.agentId,
                success: true,
                confidence: content.length > 0 ? 0.9 : 0.5,
                url,
                title: title || undefined,
                content: content.substring(0, 500000), // Limit to 500k chars
                textContent,
                htmlContent: isHtml ? htmlContent : undefined,
                contentType,
                downloadedAt,
                metadata: {
                    contentLength: content.length,
                    isHtml,
                    isText,
                    downloadTimeMs: Date.now() - startTime,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to download content from ${url}: ${errorMessage}`);

            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: errorMessage,
                url,
                metadata: {
                    downloadTimeMs: Date.now() - startTime,
                },
            };
        }
    }

    /**
     * Extract plain text from HTML content
     */
    private extractTextFromHtml(html: string): string {
        // Simple HTML tag removal - works on actual data without inventing content
        const text = html
            // Remove script and style tags and their content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Remove HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    }

    /**
     * Extract title from HTML content
     */
    private extractTitleFromHtml(html: string): string | undefined {
        // Try to find title tag
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch?.[1]) {
            return this.extractTextFromHtml(titleMatch[1]).trim().slice(0, 200);
        }

        // Try to find h1 tag
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match?.[1]) {
            return this.extractTextFromHtml(h1Match[1]).trim().slice(0, 200);
        }

        return undefined;
    }
}
