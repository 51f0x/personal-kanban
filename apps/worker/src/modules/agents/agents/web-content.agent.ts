import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { chromium, firefox, Browser, Page } from "playwright";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { BaseAgent } from "../core/base-agent";
import { INPUT_LIMITS } from "../../../shared/utils/input-validator.util";

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
 * Extraction strategy:
 * 1. Playwright (render page)
 * 2. Readability (main article extraction)
 * 3. Fallback: DOM density (if Readability fails)
 * 4. LLM cleanup / summarization
 */
@Injectable()
export class WebContentAgent extends BaseAgent implements OnModuleDestroy {
  readonly agentId = "web-content-agent";
  private browser: Browser | null = null;
  // Modern Firefox User-Agent
  private readonly userAgent =
    "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";

  constructor(config: ConfigService) {
    super(config, WebContentAgent.name);
  }

  /**
   * Get or create a browser instance (singleton pattern for efficiency)
   * Tries multiple browsers in order: Chromium, Firefox, system Firefox
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const launchOptions = {
        headless: true,
      } as const;

      // Try Chromium first (most commonly available via Playwright)
      try {
        this.browser = await chromium.launch(launchOptions);
        this.logger.log("Launched Chromium browser via Playwright");
        return this.browser;
      } catch (chromiumError) {
        this.logger.debug(
          `Chromium not available: ${chromiumError instanceof Error ? chromiumError.message : "Unknown error"}`,
        );
      }

      // Try Playwright's Firefox
      try {
        this.browser = await firefox.launch(launchOptions);
        this.logger.log("Launched Firefox browser via Playwright");
        return this.browser;
      } catch (firefoxError) {
        this.logger.debug(
          `Playwright Firefox not available: ${firefoxError instanceof Error ? firefoxError.message : "Unknown error"}`,
        );
      }

      // Try system Firefox if available (e.g., in Docker)
      const firefoxPath =
        process.env.FIREFOX_EXECUTABLE_PATH || "/usr/bin/firefox";
      if (process.env.FIREFOX_EXECUTABLE_PATH || firefoxPath) {
        try {
          this.browser = await firefox.launch({
            ...launchOptions,
            executablePath: firefoxPath,
          });
          this.logger.log(`Launched system Firefox at: ${firefoxPath}`);
          return this.browser;
        } catch (systemFirefoxError) {
          this.logger.debug(
            `System Firefox not available at ${firefoxPath}: ${systemFirefoxError instanceof Error ? systemFirefoxError.message : "Unknown error"}`,
          );
        }
      }

      // If all browsers fail, throw an error
      throw new Error(
        "No Playwright browsers available. Please run: pnpm exec playwright install",
      );
    }
    return this.browser;
  }

  /**
   * Cleanup browser instance when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        this.logger.error(
          `Error closing browser: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        this.browser = null;
      }
    }
  }

  /**
   * Extract URL from text or metadata
   */
  extractUrl(text: string, metadata?: Record<string, unknown>): string | null {
    // Check metadata first
    if (metadata?.url && typeof metadata.url === "string") {
      return metadata.url;
    }

    // Extract URL from text using regex
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = text.match(urlRegex);
    return match?.[0] || null;
  }

  /**
   * Download and extract content from a URL using Puppeteer for full rendering
   * Only works on actual data from the website - renders JavaScript and waits for async content
   */
  async downloadContent(url: string): Promise<WebContentResult> {
    const startTime = Date.now();
    let page: Page | null = null;
    let browser: Browser | null = null;

    try {
      this.logger.log(`Downloading content from: ${url}`);

      // First, check if URL is HTML using a quick HEAD request
      const headResponse = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": this.userAgent,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!headResponse.ok) {
        throw new Error(
          `HTTP ${headResponse.status}: ${headResponse.statusText}`,
        );
      }

      const contentType = headResponse.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");
      const isText = contentType.includes("text/plain");
      const isJson = contentType.includes("application/json");

      // For non-HTML content, use simple fetch
      if (!isHtml) {
        const response = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;text/plain,*/*",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const textContent = await response.text();
        const downloadedAt = new Date().toISOString();

        this.logger.log(
          `Downloaded ${textContent.length} characters from ${url} (${Date.now() - startTime}ms)`,
        );

        return {
          agentId: this.agentId,
          success: true,
          confidence: textContent.length > 0 ? 0.9 : 0.5,
          url,
          content: textContent,
          textContent,
          contentType,
          downloadedAt,
          metadata: {
            contentLength: textContent.length,
            isHtml: false,
            isText: isText || isJson,
            downloadTimeMs: Date.now() - startTime,
          },
        };
      }

      // For HTML content, use Playwright with Firefox to render JavaScript and wait for async content
      try {
        browser = await this.getBrowser();
        page = await browser.newPage({
          userAgent: this.userAgent,
          viewport: { width: 1280, height: 720 },
        });

        // Navigate to the page with timeout
        await page.goto(url, {
          waitUntil: "networkidle", // Wait until network is idle
          timeout: 60000, // 60 second timeout
        });

        // Additional wait for any lazy-loaded content or dynamic rendering
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds for async content to load

        // Get the fully rendered HTML
        const htmlContent = await page.content();
        const pageUrl = page.url();

        // Extract title from the rendered page
        const title = await page.title().catch(() => undefined);

        // Step 1: Try Readability extraction (main article)
        let extractedContent: string | null = null;
        let extractionMethod = "none";
        const extractionMetadata: Record<string, unknown> = {};

        try {
          extractedContent = await this.extractWithReadability(
            htmlContent,
            pageUrl,
          );
          if (extractedContent && extractedContent.trim().length > 0) {
            extractionMethod = "readability";
            extractionMetadata.readability = {
              success: true,
              contentLength: extractedContent.length,
            };
            this.logger.log(
              `Successfully extracted content using Readability (${extractedContent.length} chars)`,
            );
          }
        } catch (readabilityError) {
          this.logger.debug(
            `Readability extraction failed: ${readabilityError instanceof Error ? readabilityError.message : "Unknown error"}`,
          );
          extractionMetadata.readability = {
            success: false,
            error:
              readabilityError instanceof Error
                ? readabilityError.message
                : "Unknown error",
          };
        }

        // Step 2: Fallback to DOM density if Readability failed or produced poor results
        if (
          !extractedContent ||
          extractedContent.trim().length < 200 ||
          extractionMethod === "none"
        ) {
          try {
            const domDensityContent = await this.extractWithDomDensity(page);
            const currentLength = extractedContent?.trim().length ?? 0;
            if (
              domDensityContent &&
              domDensityContent.trim().length > currentLength
            ) {
              extractedContent = domDensityContent;
              extractionMethod =
                extractionMethod === "readability"
                  ? "readability+dom-density"
                  : "dom-density";
              extractionMetadata.domDensity = {
                success: true,
                contentLength: domDensityContent.length,
              };
              this.logger.log(
                `Using DOM density extraction (${domDensityContent.length} chars)`,
              );
            }
          } catch (domDensityError) {
            this.logger.debug(
              `DOM density extraction failed: ${domDensityError instanceof Error ? domDensityError.message : "Unknown error"}`,
            );
            extractionMetadata.domDensity = {
              success: false,
              error:
                domDensityError instanceof Error
                  ? domDensityError.message
                  : "Unknown error",
            };
          }
        }

        // Step 3: Final fallback to simple text extraction if both methods failed
        if (!extractedContent || extractedContent.trim().length === 0) {
          extractedContent = await page.evaluate(() => {
            // Remove script and style elements
            const scripts = document.querySelectorAll(
              "script, style, noscript",
            );
            for (const el of scripts) {
              el.remove();
            }

            // Get text content from body
            return (
              document.body?.innerText ||
              document.documentElement.innerText ||
              ""
            );
          });
          extractionMethod = "simple-text";
          extractionMetadata.simpleText = {
            contentLength: extractedContent.length,
          };
          this.logger.log(
            `Using simple text extraction (${extractedContent.length} chars)`,
          );
        }

        await page.close();
        page = null;

        // Step 4: LLM cleanup / summarization
        let cleanedContent = extractedContent;
        const llmMetadata: Record<string, unknown> = {};
        try {
          const llmCleaned = await this.cleanupWithLlm(extractedContent);
          if (llmCleaned && llmCleaned.trim().length > 0) {
            cleanedContent = llmCleaned;
            llmMetadata.cleaned = true;
            llmMetadata.originalLength = extractedContent.length;
            llmMetadata.cleanedLength = llmCleaned.length;
            this.logger.log(
              `LLM cleaned content: ${extractedContent.length} -> ${llmCleaned.length} chars`,
            );
          } else {
            llmMetadata.cleaned = false;
            llmMetadata.error = "LLM returned empty result";
          }
        } catch (llmError) {
          this.logger.debug(
            `LLM cleanup failed: ${llmError instanceof Error ? llmError.message : "Unknown error"}`,
          );
          llmMetadata.cleaned = false;
          llmMetadata.error =
            llmError instanceof Error ? llmError.message : "Unknown error";
          // Continue with original content if LLM fails
        }

        const downloadedAt = new Date().toISOString();
        const content = cleanedContent || htmlContent || "";

        this.logger.log(
          `Downloaded ${content.length} characters (rendered, ${extractionMethod}) from ${url} (${Date.now() - startTime}ms)`,
        );

        return {
          agentId: this.agentId,
          success: true,
          confidence: content.length > 0 ? 0.95 : 0.5,
          url,
          title: title || undefined,
          content: content,
          textContent: content,
          htmlContent,
          contentType,
          downloadedAt,
          metadata: {
            contentLength: content.length,
            htmlLength: htmlContent.length,
            textLength: content.length,
            isHtml: true,
            isText: false,
            downloadTimeMs: Date.now() - startTime,
            rendered: true,
            extractionMethod,
            extraction: extractionMetadata,
            llm: llmMetadata,
          },
        };
      } catch (browserError) {
        // If Playwright browsers can't be launched (e.g., browsers not installed),
        // fall back to simple fetch without JavaScript rendering
        const errorMessage =
          browserError instanceof Error
            ? browserError.message
            : "Unknown error";
        this.logger.debug(
          `Playwright browsers not available: ${errorMessage}. ` +
            "Falling back to simple fetch (no JavaScript rendering).",
        );

        // Fallback to simple fetch for HTML
        const response = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;text/plain,*/*",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const htmlContent = await response.text();
        const textContent = this.extractTextFromHtml(htmlContent);
        const title = this.extractTitleFromHtml(htmlContent);
        const downloadedAt = new Date().toISOString();
        const content = textContent || htmlContent || "";

        this.logger.log(
          `Downloaded ${content.length} characters (simple fetch, no JS rendering) from ${url} (${Date.now() - startTime}ms)`,
        );

        return {
          agentId: this.agentId,
          success: true,
          confidence: content.length > 0 ? 0.8 : 0.5,
          url,
          title: title || undefined,
          content: content,
          textContent,
          htmlContent,
          contentType,
          downloadedAt,
          metadata: {
            contentLength: content.length,
            htmlLength: htmlContent.length,
            textLength: textContent.length,
            isHtml: true,
            isText: false,
            downloadTimeMs: Date.now() - startTime,
            rendered: false,
            fallback: true,
          },
        };
      }
    } catch (error) {
      // Clean up page if it exists (may be null if browser launch failed)
      if (page !== null && page !== undefined) {
        try {
          await (page as Page).close();
        } catch {
          // Ignore close errors
        }
        page = null;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to download content from ${url}: ${errorMessage}`,
      );

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
   * Extract content using Mozilla Readability (main article extraction)
   */
  private async extractWithReadability(
    html: string,
    url: string,
  ): Promise<string> {
    const dom = new JSDOM(html, {
      url,
    });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Readability failed to parse article");
    }

    return article.textContent || "";
  }

  /**
   * Extract content using DOM density scoring (fallback method)
   */
  private async extractWithDomDensity(page: Page): Promise<string> {
    const blocks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("section, div, article"))
        .map((el) => {
          const htmlEl = el as HTMLElement;
          const text = htmlEl.innerText.trim();
          const links = el.querySelectorAll("a").length;
          return {
            text,
            score: text.length - links * 50,
          };
        })
        .filter((b) => b.score > 200)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((b) => b.text);
    });

    return blocks.join("\n\n");
  }

  /**
   * Clean up and summarize extracted content using LLM
   */
  private async cleanupWithLlm(content: string): Promise<string> {
    if (!content || content.trim().length === 0) {
      return content;
    }

    try {
      await this.ensureModel();

      // Truncate if too long for LLM processing
      const contentToClean = this.validateAndTruncateContent(
        content,
        INPUT_LIMITS.CONTENT_MAX_LENGTH,
      );

      const prompt = `You are a content cleanup assistant. Clean up and improve the extracted web content below while preserving all important information.

Rules:
- Remove navigation elements, headers, footers, and repetitive content
- Fix formatting issues and remove excessive whitespace
- Preserve all important information, facts, and details
- Maintain the structure and readability
- Do not add any information that wasn't in the original content
- Return only the cleaned content, no explanations or metadata

Return only the cleaned content. Do not add any information that wasn't in the original content. Do not add any explanations or metadata. Content to clean:
${contentToClean}
`;

      this.logOperation("Cleaning content with LLM", {
        originalLength: content.length,
        truncated: content.length !== contentToClean.length,
      });

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            options: {
              temperature: 0.2, // Low temperature for factual cleanup
            },
          }),
        "content cleanup",
      );

      const cleaned = (response.response || "").trim();
      return cleaned.length > 0 ? cleaned : content; // Fallback to original if LLM returns empty
    } catch (error) {
      this.logError("LLM cleanup failed", error);
      return content; // Return original content on error
    }
  }

  /**
   * Extract plain text from HTML content (used in fallback mode)
   */
  private extractTextFromHtml(html: string): string {
    const text = html
      // Remove script and style tags and their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    return text;
  }

  /**
   * Extract title from HTML content (used in fallback mode)
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
