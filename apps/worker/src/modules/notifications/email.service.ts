import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { marked, type Token, type TokensList } from 'marked';

export interface EmailTask {
    id: string;
    title: string;
    description?: string | null;
    dueAt?: Date | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    duration?: string | null;
    boardName: string;
    columnName: string;
    taskUrl: string;
    completeUrl: string;
    priorityScore: number;
}

export interface WorkPackageEmail {
    userEmail: string;
    userName?: string | null;
    tasks: EmailTask[];
    totalTasks: number;
    urgentTasks: number;
    overdueTasks: number;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: Transporter | null = null;
    private readonly smtpHost: string;
    private readonly smtpPort: number;
    private readonly smtpSecure: boolean;
    private readonly smtpUsername: string;
    private readonly smtpPassword: string;
    private readonly smtpFrom: string;
    private readonly apiUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.smtpHost = this.configService.get<string>('SMTP_HOST', '');
        this.smtpPort = this.configService.get<number>('SMTP_PORT', 587);
        this.smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);
        this.smtpUsername = this.configService.get<string>('SMTP_USERNAME', '');
        this.smtpPassword = this.configService.get<string>('SMTP_PASSWORD', '');
        this.smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@localhost');
        this.apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');

        // Configure marked for email-safe HTML
        marked.setOptions({
            breaks: true, // Convert line breaks to <br>
            gfm: true, // GitHub Flavored Markdown
        });

        if (this.smtpHost) {
            this.initializeTransporter();
        } else {
            this.logger.warn('SMTP_HOST not configured, email service disabled');
        }
    }

    private initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: this.smtpHost,
                port: this.smtpPort,
                secure: this.smtpSecure,
                auth:
                    this.smtpUsername && this.smtpPassword
                        ? {
                              user: this.smtpUsername,
                              pass: this.smtpPassword,
                          }
                        : undefined,
            });

            this.logger.log(`Email service initialized with SMTP host: ${this.smtpHost}`);
        } catch (error) {
            this.logger.error('Failed to initialize email transporter', error);
            this.transporter = null;
        }
    }

    /**
     * Check if email service is available
     */
    isAvailable(): boolean {
        return this.transporter !== null;
    }

    /**
     * Send work package reminder email
     */
    async sendWorkPackageEmail(packageData: WorkPackageEmail): Promise<boolean> {
        if (!this.isAvailable()) {
            this.logger.warn('Email service not available, skipping email send');
            return false;
        }

        // Validate email address
        if (!packageData.userEmail || !packageData.userEmail.trim()) {
            this.logger.warn('No recipient email address provided, skipping email send');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(packageData.userEmail.trim())) {
            this.logger.warn(
                `Invalid email address format: ${packageData.userEmail}, skipping email send`,
            );
            return false;
        }

        try {
            const html = this.generateWorkPackageHtml(packageData);
            const text = this.generateWorkPackageText(packageData);

            if (!this.transporter) {
                return false;
            }

            const recipientEmail = packageData.userEmail.trim();

            const info = await this.transporter.sendMail({
                from: this.smtpFrom,
                to: recipientEmail,
                subject: this.generateSubject(packageData),
                text,
                html,
            });

            this.logger.log(
                `Work package email sent to ${packageData.userEmail}: ${info.messageId}`,
            );
            return true;
        } catch (error) {
            this.logger.error(
                `Failed to send work package email to ${packageData.userEmail}`,
                error,
            );
            return false;
        }
    }

    private generateSubject(packageData: WorkPackageEmail): string {
        const urgentCount = packageData.urgentTasks;
        const overdueCount = packageData.overdueTasks;

        if (overdueCount > 0) {
            return `🚨 ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} - Your prioritized work package`;
        }
        if (urgentCount > 0) {
            return `⚡ ${urgentCount} urgent task${urgentCount > 1 ? 's' : ''} - Your prioritized work package`;
        }
        return `📋 Your prioritized work package (${packageData.totalTasks} tasks)`;
    }

    private generateWorkPackageHtml(packageData: WorkPackageEmail): string {
        const userName = packageData.userName || 'there';
        const urgentTasks = packageData.tasks.filter((t) => t.priorityScore >= 80);
        const highPriorityTasks = packageData.tasks.filter(
            (t) => t.priorityScore >= 60 && t.priorityScore < 80,
        );
        const otherTasks = packageData.tasks.filter((t) => t.priorityScore < 60);

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Prioritized Work Package</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 24px;
    }
    .summary {
      background-color: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    .summary-item {
      display: inline-block;
      margin-right: 20px;
      font-weight: 500;
    }
    .task-section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
    }
    .task {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: #ffffff;
    }
    .task.urgent {
      border-left: 4px solid #ef4444;
      background-color: #fef2f2;
    }
    .task.high-priority {
      border-left: 4px solid #f59e0b;
      background-color: #fffbeb;
    }
    .task-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .task-meta {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .task-meta span {
      margin-right: 15px;
    }
    .task-description {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 15px;
      line-height: 1.5;
    }
    .task-description p {
      margin: 0 0 10px 0;
    }
    .task-description p:last-child {
      margin-bottom: 0;
    }
    .task-description ul, .task-description ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .task-description li {
      margin: 5px 0;
    }
    .task-description code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .task-description pre {
      background-color: #f3f4f6;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 10px 0;
    }
    .task-description pre code {
      background-color: transparent;
      padding: 0;
    }
    .task-description strong {
      font-weight: 600;
      color: #1f2937;
    }
    .task-description em {
      font-style: italic;
    }
    .task-description a {
      color: #3b82f6;
      text-decoration: underline;
    }
    .task-description h1, .task-description h2, .task-description h3 {
      margin: 15px 0 10px 0;
      font-weight: 600;
      color: #1f2937;
    }
    .task-description h1 {
      font-size: 18px;
    }
    .task-description h2 {
      font-size: 16px;
    }
    .task-description h3 {
      font-size: 15px;
    }
    .task-description blockquote {
      border-left: 3px solid #e5e7eb;
      padding-left: 15px;
      margin: 10px 0;
      color: #6b7280;
      font-style: italic;
    }
    .task-description hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 15px 0;
    }
    .task-actions {
      margin-top: 15px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      margin-right: 10px;
      transition: background-color 0.2s;
    }
    .btn-primary {
      background-color: #3b82f6;
      color: #ffffff;
    }
    .btn-primary:hover {
      background-color: #2563eb;
    }
    .btn-success {
      background-color: #10b981;
      color: #ffffff;
    }
    .btn-success:hover {
      background-color: #059669;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .priority-high {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .priority-medium {
      background-color: #fef3c7;
      color: #92400e;
    }
    .priority-low {
      background-color: #d1d5db;
      color: #374151;
    }
    .due-date {
      font-weight: 600;
    }
    .due-date.overdue {
      color: #dc2626;
    }
    .due-date.due-soon {
      color: #f59e0b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Your Prioritized Work Package</h1>
    </div>

    <div class="summary">
      <div class="summary-item">Total: ${packageData.totalTasks} tasks</div>
      ${packageData.urgentTasks > 0 ? `<div class="summary-item" style="color: #dc2626;">⚡ Urgent: ${packageData.urgentTasks}</div>` : ''}
      ${packageData.overdueTasks > 0 ? `<div class="summary-item" style="color: #dc2626;">🚨 Overdue: ${packageData.overdueTasks}</div>` : ''}
    </div>

    ${urgentTasks.length > 0 ? this.renderTaskSection('🚨 Urgent Tasks', urgentTasks) : ''}
    ${highPriorityTasks.length > 0 ? this.renderTaskSection('⚡ High Priority Tasks', highPriorityTasks) : ''}
    ${otherTasks.length > 0 ? this.renderTaskSection('📋 Other Tasks', otherTasks) : ''}

    <div class="footer">
      <p>This is an automated reminder from your Personal Kanban board.</p>
      <p>You can manage your notification preferences in your board settings.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    }

    private renderTaskSection(title: string, tasks: EmailTask[]): string {
        return `
    <div class="task-section">
      <div class="section-title">${title}</div>
      ${tasks.map((task) => this.renderTask(task)).join('')}
    </div>
    `;
    }

    private renderTask(task: EmailTask): string {
        const isUrgent = task.priorityScore >= 80;
        const isHighPriority = task.priorityScore >= 60 && task.priorityScore < 80;
        const taskClass = isUrgent ? 'urgent' : isHighPriority ? 'high-priority' : '';

        const priorityBadge = task.priority
            ? `<span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>`
            : '';

        const dueDateHtml = task.dueAt ? this.renderDueDate(task.dueAt) : '';

        const durationHtml = task.duration ? `<span>⏱️ ${task.duration}</span>` : '';

        return `
      <div class="task ${taskClass}">
        <div class="task-title">
          ${this.escapeHtml(task.title)}${priorityBadge}
        </div>
        <div class="task-meta">
          ${dueDateHtml}
          ${durationHtml}
          <span>📋 ${this.escapeHtml(task.boardName)}</span>
          <span>📁 ${this.escapeHtml(task.columnName)}</span>
        </div>
        ${task.description ? `<div class="task-description">${this.renderDescription(task.description)}</div>` : ''}
        <div class="task-actions">
          <a href="${task.taskUrl}" class="btn btn-primary">View Task</a>
          <a href="${task.completeUrl}" class="btn btn-success">Mark Complete</a>
        </div>
      </div>
    `;
    }

    private renderDueDate(dueAt: Date): string {
        const now = new Date();
        const due = new Date(dueAt);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let className = '';
        let label = '';

        if (diffDays < 0) {
            className = 'overdue';
            label = `🚨 Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
            className = 'due-soon';
            label = '⚠️ Due today';
        } else if (diffDays === 1) {
            className = 'due-soon';
            label = '⚠️ Due tomorrow';
        } else if (diffDays <= 7) {
            className = 'due-soon';
            label = `📅 Due in ${diffDays} days`;
        } else {
            label = `📅 Due ${due.toLocaleDateString()}`;
        }

        return `<span class="due-date ${className}">${label}</span>`;
    }

    private generateWorkPackageText(packageData: WorkPackageEmail): string {
        const userName = packageData.userName || 'there';
        let text = `Hi ${userName},\n\n`;
        text += `Here's your prioritized work package with ${packageData.totalTasks} tasks:\n\n`;

        if (packageData.overdueTasks > 0) {
            text += `🚨 ${packageData.overdueTasks} overdue task${packageData.overdueTasks > 1 ? 's' : ''}\n`;
        }
        if (packageData.urgentTasks > 0) {
            text += `⚡ ${packageData.urgentTasks} urgent task${packageData.urgentTasks > 1 ? 's' : ''}\n`;
        }

        text += '\n';

        for (const task of packageData.tasks) {
            text += `\n${task.title}\n`;
            if (task.description) {
                // Convert markdown to plain text for email
                const plainTextDescription = this.markdownToPlainText(task.description);
                text += `${plainTextDescription}\n`;
            }
            text += `Board: ${task.boardName}\n`;
            text += `Column: ${task.columnName}\n`;
            if (task.dueAt) {
                const due = new Date(task.dueAt);
                text += `Due: ${due.toLocaleDateString()}\n`;
            }
            if (task.duration) {
                text += `Duration: ${task.duration}\n`;
            }
            if (task.priority) {
                text += `Priority: ${task.priority}\n`;
            }
            text += `View: ${task.taskUrl}\n`;
            text += `Complete: ${task.completeUrl}\n`;
            text += '---\n';
        }

        text += '\nThis is an automated reminder from your Personal Kanban board.\n';
        return text;
    }

    /**
     * Render task description - converts markdown to HTML if detected, otherwise escapes HTML
     */
    private renderDescription(description: string): string {
        if (!description) {
            return '';
        }

        // Check if description contains markdown syntax
        if (this.isMarkdown(description)) {
            try {
                // Convert markdown to HTML
                const html = marked.parse(description) as string;
                // Sanitize the HTML for email (remove potentially unsafe elements)
                return this.sanitizeHtmlForEmail(html);
            } catch (error) {
                this.logger.warn('Failed to parse markdown, falling back to escaped text', error);
                // Fallback to escaped HTML if markdown parsing fails
                return this.escapeHtml(description);
            }
        }

        // Plain text - escape HTML
        return this.escapeHtml(description).replace(/\n/g, '<br>');
    }

    /**
     * Convert markdown to plain text for email text version
     */
    private markdownToPlainText(markdown: string): string {
        if (!markdown) {
            return '';
        }

        // If not markdown, return as-is
        if (!this.isMarkdown(markdown)) {
            return markdown;
        }

        try {
            // Parse markdown to get tokens
            const tokens = marked.lexer(markdown);
            return this.tokensToPlainText(tokens);
        } catch (error) {
            this.logger.warn('Failed to parse markdown to plain text, using original', error);
            // Fallback: strip markdown syntax manually
            return this.stripMarkdownSyntax(markdown);
        }
    }

    /**
     * Convert marked tokens to plain text
     */
    private tokensToPlainText(tokens: TokensList): string {
        let text = '';

        for (const token of tokens) {
            switch (token.type) {
                case 'heading':
                    text += `${token.text}\n`;
                    break;
                case 'paragraph':
                    text += `${this.inlineToPlainText(token.tokens ?? [])}\n\n`;
                    break;
                case 'list':
                    for (let i = 0; i < token.items.length; i++) {
                        const item = token.items[i];
                        const marker = token.ordered ? `${i + 1}. ` : '- ';
                        text += `${marker}${this.inlineToPlainText(item.tokens)}\n`;
                    }
                    text += '\n';
                    break;
                case 'blockquote':
                    text += `> ${this.inlineToPlainText(token.tokens ?? [])}\n\n`;
                    break;
                case 'code':
                    text += `${token.text}\n\n`;
                    break;
                case 'hr':
                    text += '---\n\n';
                    break;
                case 'table':
                    // Simple table representation
                    for (const row of token.rows) {
                        text += `${row.map((cell: Token) => {
                            if ('text' in cell && typeof cell.text === 'string') {
                                return cell.text;
                            }
                            if ('tokens' in cell && Array.isArray(cell.tokens)) {
                                return this.inlineToPlainText(cell.tokens);
                            }
                            return '';
                        }).join(' | ')}\n`;
                    }
                    text += '\n';
                    break;
                default:
                    // For unknown types, try to extract text
                    if ('tokens' in token && Array.isArray(token.tokens)) {
                        text += this.inlineToPlainText(token.tokens);
                    } else if ('text' in token) {
                        text += token.text;
                    }
                    break;
            }
        }

        return text.trim();
    }

    /**
     * Convert inline tokens to plain text
     */
    private inlineToPlainText(tokens: Token[]): string {
        let text = '';

        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                    text += token.text;
                    break;
                case 'strong':
                case 'em':
                    text += this.inlineToPlainText(token.tokens ?? []);
                    break;
                case 'code':
                    text += token.text;
                    break;
                case 'link':
                    text += token.text;
                    if (token.href && token.href !== token.text) {
                        text += ` (${token.href})`;
                    }
                    break;
                case 'image':
                    if (token.type === 'image') {
                        text += token.text || token.title || '[image]';
                    } else {
                        text += '[image]';
                    }
                    break;
                case 'br':
                    text += '\n';
                    break;
                default:
                    if ('tokens' in token && Array.isArray(token.tokens)) {
                        text += this.inlineToPlainText(token.tokens);
                    } else if ('text' in token) {
                        text += token.text;
                    }
                    break;
            }
        }

        return text;
    }

    /**
     * Fallback: Strip markdown syntax manually
     */
    private stripMarkdownSyntax(markdown: string): string {
        let text = markdown;

        // Remove headers
        text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');

        // Remove bold/italic
        text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
        text = text.replace(/\*([^*]+)\*/g, '$1');
        text = text.replace(/__([^_]+)__/g, '$1');
        text = text.replace(/_([^_]+)_/g, '$1');

        // Remove links but keep text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        // Remove images
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        text = text.replace(/`([^`]+)`/g, '$1');

        // Remove blockquotes
        text = text.replace(/^>\s+(.+)$/gm, '$1');

        // Remove horizontal rules
        text = text.replace(/^---$/gm, '');

        // Clean up multiple newlines
        text = text.replace(/\n{3,}/g, '\n\n');

        return text.trim();
    }

    /**
     * Detect if text contains markdown syntax
     */
    private isMarkdown(text: string): boolean {
        // Common markdown patterns
        const markdownPatterns = [
            /^#{1,6}\s/m, // Headers (# Header)
            /\*\*.*?\*\*/, // Bold (**text**)
            /\*.*?\*/, // Italic (*text*)
            /\[.*?\]\(.*?\)/, // Links [text](url)
            /^[-*+]\s/m, // Unordered lists
            /^\d+\.\s/m, // Ordered lists
            /^>\s/m, // Blockquotes
            /`[^`]+`/, // Inline code
            /^```[\s\S]*?```$/m, // Code blocks
            /^---$/m, // Horizontal rules
            /^\|.*\|$/m, // Tables
        ];

        return markdownPatterns.some((pattern) => pattern.test(text));
    }

    /**
     * Sanitize HTML for email clients (remove unsafe elements and attributes)
     */
    private sanitizeHtmlForEmail(html: string): string {
        // Remove script tags and their content
        let sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, '');

        // Remove event handlers and javascript: URLs
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');

        // Remove style tags (email clients may strip them anyway)
        sanitized = sanitized.replace(/<style[\s\S]*?<\/style>/gi, '');

        // Remove iframe tags
        sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

        // Remove object and embed tags
        sanitized = sanitized.replace(/<(object|embed)[\s\S]*?<\/(object|embed)>/gi, '');

        return sanitized;
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}
