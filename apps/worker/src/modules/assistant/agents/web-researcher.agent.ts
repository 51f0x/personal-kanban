import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import { WebContentAgent } from "./web-content.agent";
import type { WebResearcherResult, LocalBrain } from "../types/assistant.types";

/**
 * Web Researcher Agent (D1)
 * Performs web research according to research plan
 * Reuses WebContentAgent for actual content downloading
 */
@Injectable()
export class WebResearcherAgent extends BaseAgent {
  readonly agentId = "web-researcher";

  constructor(
    config: ConfigService,
    private readonly webContentAgent: WebContentAgent,
  ) {
    super(config, WebResearcherAgent.name);
  }

  /**
   * Perform web research based on research plan
   */
  async research(
    researchPlan: LocalBrain["researchPlan"],
    _objective: string,
  ): Promise<WebResearcherResult> {
    try {
      this.logOperation("Performing web research", {
        searchTermsCount: researchPlan?.searchTerms?.length || 0,
      });

      if (!researchPlan?.searchTerms || researchPlan.searchTerms.length === 0) {
        return {
          agentId: this.agentId,
          success: true,
          confidence: 1.0,
          sources: [],
          topFindings: [],
          facts: [],
          controversies: [],
        };
      }

      // Extract URLs from search terms (if any are URLs)
      const urls = researchPlan.searchTerms.filter((term) =>
        term.match(/^https?:\/\//),
      );

      // Download content from URLs (in parallel per URL)
      const sources: WebResearcherResult["sources"] = [];
      const facts: WebResearcherResult["facts"] = [];
      const topFindings: string[] = [];

      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const result = await this.webContentAgent.downloadContent(url);
            if (result.success && result.textContent) {
              sources.push({
                url,
                title: result.title,
                trustLevel: this.estimateTrustLevel(url),
                keyTakeaways: this.extractKeyTakeaways(result.textContent),
              });

              // Extract facts from content
              const extractedFacts = this.extractFacts(result.textContent);
              facts.push(
                ...extractedFacts.map((fact) => ({ fact, source: url })),
              );

              // Add to top findings
              topFindings.push(
                `${result.title || url}: ${result.textContent.substring(0, 200)}...`,
              );
            }
          } catch (error) {
            this.logError(
              `Failed to download content from ${url}`,
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        }),
      );

      // TODO: In a full implementation, you might want to use a search API here
      // For now, we only process explicit URLs from the research plan

      return {
        agentId: this.agentId,
        success: true,
        confidence: sources.length > 0 ? 0.8 : 0.5,
        sources,
        topFindings: topFindings.slice(0, 10), // Limit to top 10
        facts: facts.slice(0, 20), // Limit to top 20 facts
        controversies: [], // Would need more sophisticated analysis
      };
    } catch (error) {
      this.logError(
        "Web research failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return this.createErrorResult<WebResearcherResult>(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Estimate trust level of a source based on URL
   */
  private estimateTrustLevel(url: string): number {
    const domain = new URL(url).hostname.toLowerCase();

    // Official documentation and trusted sources
    if (
      domain.includes("docs.") ||
      domain.includes("github.com") ||
      domain.includes("stackoverflow.com") ||
      domain.includes("mdn.") ||
      domain.includes("w3.org")
    ) {
      return 0.9;
    }

    // Medium trust
    if (
      domain.includes("medium.com") ||
      domain.includes("dev.to") ||
      domain.includes("blog.")
    ) {
      return 0.7;
    }

    // Default trust level
    return 0.5;
  }

  /**
   * Extract key takeaways from content
   */
  private extractKeyTakeaways(content: string): string[] {
    // Simple extraction - take first few sentences
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 50 && s.length < 300)
      .slice(0, 5);

    return sentences;
  }

  /**
   * Extract facts from content (simple implementation)
   */
  private extractFacts(content: string): string[] {
    // Simple fact extraction - look for sentences with numbers or specific patterns
    const sentences = content.split(/[.!?]+/).map((s) => s.trim());
    const facts = sentences.filter(
      (s) =>
        s.length > 30 &&
        s.length < 200 &&
        (/\d/.test(s) || // Contains numbers
          s.toLowerCase().includes("is ") ||
          s.toLowerCase().includes("are ") ||
          s.toLowerCase().includes("can ") ||
          s.toLowerCase().includes("must ")),
    );

    return facts.slice(0, 10); // Limit to 10 facts
  }
}
