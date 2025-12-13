import  { PrismaService } from "@personal-kanban/shared";
import { Prisma } from "@prisma/client";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { parseCaptureText } from "@personal-kanban/shared";

import  { TaskService } from "../tasks/task.service";
import  { AgentCaptureService } from "./agent-capture.service";
import  { EmailWebhookDto } from "./dto/email-webhook.dto";

@Injectable()
export class EmailCaptureService {
  private readonly logger = new Logger(EmailCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly agentCaptureService: AgentCaptureService,
  ) {}

  /**
   * Process an incoming email and create a task
   * Validates that the sender's email matches a user in the system
   * Uses the user's default board
   */
  async processEmail(dto: EmailWebhookDto) {
    // Validate sender email
    const senderEmail = dto.from.email.toLowerCase().trim();

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: senderEmail },
      include: {
        defaultBoard: {
          include: {
            columns: {
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(
        `Email capture rejected: sender ${senderEmail} not found in system`,
      );
      throw new BadRequestException(
        `Email address ${senderEmail} is not registered. Please register your email address first.`,
      );
    }

    // Check if user has a default board
    if (!user.defaultBoardId || !user.defaultBoard) {
      this.logger.warn(
        `Email capture rejected: user ${user.id} has no default board`,
      );
      throw new BadRequestException(
        "No default board configured. Please set a default board in your settings.",
      );
    }

    const board = user.defaultBoard;

    // Find the INPUT column or use the first column
    const targetColumn =
      board.columns.find((col) => col.type === "INPUT") ?? board.columns[0];

    if (!targetColumn) {
      this.logger.error(
        `Email capture failed: board ${board.id} has no columns`,
      );
      throw new NotFoundException("Target column not found");
    }

    // Extract email content
    // Prefer plain text, fall back to HTML stripped of tags
    let emailText = dto.text || "";
    if (!emailText && dto.html) {
      // Simple HTML tag removal (for basic cases)
      // Remove script and style tags completely
      emailText = dto.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Combine subject and body for parsing
    const captureText = dto.subject
      ? `${dto.subject}\n\n${emailText}`
      : emailText || "Email capture";

    // Parse the capture text
    const parsed = parseCaptureText(captureText);

    // Create task
    const task = await this.taskService.createTask({
      boardId: board.id,
      columnId: targetColumn.id,
      ownerId: user.id,
      title: parsed.title,
      description: parsed.description,
      context: "EMAIL", // Set context to EMAIL for email-captured tasks
      metadata: {
        ...parsed.metadata,
        source: "email",
        emailFrom: dto.from.email,
        emailFromName: dto.from.name,
        emailSubject: dto.subject,
        emailTo: dto.to?.map((addr) => addr.email),
        emailHtml: dto.html,
        emailAttachments: dto.attachments?.map((att) => ({
          filename: att.filename,
          type: att.type,
          size: att.content.length,
        })),
        extra: dto.metadata,
      } as Prisma.JsonValue,
      needsBreakdown: true,
    });

    this.logger.log(
      `Created task ${task.id} from email sent by ${senderEmail}`,
    );

    // Trigger agent processing with WebSocket callbacks (runs in background)
    this.agentCaptureService
      .processTaskWithAgentsAsync(task.id, board.id)
      .catch((error) => {
        this.logger.error(
          `Failed to start agent processing for task ${task.id}: ${error}`,
        );
      });

    return task;
  }
}
