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
  url: string;
  title?: string;
  textContent?: string;
  downloadedAt?: string;
}

/**
 * Web Content Agent (simplified version for Assistant module)
 * Downloads and extracts content from URLs
 */
@Injectable()
export class WebContentAgent extends BaseAgent implements OnModuleDestroy {
  readonly agentId = "web-content-agent";
  private browser: Browser | null = null;
  private readonly userAgent =
    "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";
  private readonly NETWORK_TIMEOUTS = {
    HEAD_REQUEST: 10000,
    STANDARD_FETCH: 30000,
    BROWSER_NAVIGATION: 60000,
    ASYNC_CONTENT_DELAY: 2000,
  };

  constructor(config: ConfigService) {
    super(config, WebContentAgent.name);
  }

  /**
   * Get or create a browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const launchOptions = { headless: true } as const;

      try {
        this.browser = await chromium.launch(launchOptions);
        this.logger.log("Launched Chromium browser via Playwright");
        return this.browser;
      } catch (chromiumError) {
        this.logger.debug(`Chromium not available: ${chromiumError instanceof Error ? chromiumError.message : "Unknown error"}`);
      }

      try {
        this.browser = await firefox.launch(launchOptions);
        this.logger.log("Launched Firefox browser via Playwright");
        return this.browser;
      } catch (firefoxError) {
        this.logger.debug(`Playwright Firefox not available: ${firefoxError instanceof Error ? firefoxError.message : "Unknown error"}`);
      }

      throw new Error(
        "No Playwright browsers available. Please run: pnpm exec playwright install",
      );
    }
    return this.browser;
  }

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
   * Download and extract content from a URL
   */
  async downloadContent(url: string): Promise<WebContentResult> {
    const startTime = Date.now();
    let page: Page | null = null;
    let browser: Browser | null = null;

    try {
      this.logger.log(`Downloading content from: ${url}`);

      // Quick HEAD request to check content type
      const headResponse = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(this.NETWORK_TIMEOUTS.HEAD_REQUEST),
      });

      if (!headResponse.ok) {
        throw new Error(
          `HTTP ${headResponse.status}: ${headResponse.statusText}`,
        );
      }

      const contentType = headResponse.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");

      // For non-HTML content, use simple fetch
      if (!isHtml) {
        const response = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "text/html,application/xhtml+xml,application/xml;text/plain,*/*",
          },
          signal: AbortSignal.timeout(this.NETWORK_TIMEOUTS.STANDARD_FETCH),
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
          textContent,
          downloadedAt,
        };
      }

      // For HTML content, use Playwright
      try {
        browser = await this.getBrowser();
        page = await browser.newPage({
          userAgent: this.userAgent,
          viewport: { width: 1280, height: 720 },
        });

        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: this.NETWORK_TIMEOUTS.BROWSER_NAVIGATION,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, this.NETWORK_TIMEOUTS.ASYNC_CONTENT_DELAY),
        );

        const htmlContent = await page.content();
        const title = await page.title().catch(() => undefined);

        // Extract content using Readability
        let textContent: string | null = null;
        try {
          textContent = await this.extractWithReadability(htmlContent, url);
        } catch (readabilityError) {
          this.logger.debug(
            `Readability extraction failed: ${readabilityError instanceof Error ? readabilityError.message : "Unknown error"}`,
          );
        }

        // Fallback to simple text extraction
        if (!textContent || textContent.trim().length < 200) {
          textContent = await page.evaluate(() => {
            const scripts = document.querySelectorAll("script, style, noscript");
            for (const el of scripts) {
              el.remove();
            }
            return (
              document.body?.innerText ||
              document.documentElement.innerText ||
              ""
            );
          });
        }

        await page.close();
        page = null;

        const downloadedAt = new Date().toISOString();

        this.logger.log(
          `Downloaded ${textContent.length} characters from ${url} (${Date.now() - startTime}ms)`,
        );

        return {
          agentId: this.agentId,
          success: true,
          confidence: textContent.length > 0 ? 0.95 : 0.5,
          url,
          title: title || undefined,
          textContent,
          downloadedAt,
        };
      } catch (browserError) {
        // Fallback to simple fetch
        this.logger.debug(
          `Playwright failed, falling back to simple fetch: ${browserError instanceof Error ? browserError.message : "Unknown error"}`,
        );

        const response = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "text/html,application/xhtml+xml,application/xml;text/plain,*/*",
          },
          signal: AbortSignal.timeout(this.NETWORK_TIMEOUTS.STANDARD_FETCH),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const htmlContent = await response.text();
        const textContent = this.extractTextFromHtml(htmlContent);
        const title = this.extractTitleFromHtml(htmlContent);
        const downloadedAt = new Date().toISOString();

        this.logger.log(
          `Downloaded ${textContent.length} characters (fallback) from ${url} (${Date.now() - startTime}ms)`,
        );

        return {
          agentId: this.agentId,
          success: true,
          confidence: textContent.length > 0 ? 0.8 : 0.5,
          url,
          title: title || undefined,
          textContent,
          downloadedAt,
        };
      }
    } catch (error) {
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore close errors
        }
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
      };
    }
  }

  /**
   * Extract content using Mozilla Readability
   */
  private async extractWithReadability(
    html: string,
    url: string,
  ): Promise<string> {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Readability failed to parse article");
    }

    return article.textContent || "";
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract title from HTML content
   */
  private extractTitleFromHtml(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
      return this.extractTextFromHtml(titleMatch[1]).trim().slice(0, 200);
    }

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match?.[1]) {
      return this.extractTextFromHtml(h1Match[1]).trim().slice(0, 200);
    }

    return undefined;
  }
}

