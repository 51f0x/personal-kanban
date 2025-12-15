#!/usr/bin/env ts-node

/**
 * Script to send a task to the agent processing queue
 * This sends a job to BullMQ for the worker to process
 */

import { Queue } from "bullmq";
import { TaskId } from "@personal-kanban/shared";

interface AgentProcessingJobData {
  taskId: string;
  boardId?: string;
}

/**
 * Send a task to the agent processing queue
 */
async function sendTaskToQueue() {
  console.log("=".repeat(80));
  console.log("Send Task to Agent Processing Queue");
  console.log("=".repeat(80));
  console.log();

  // Get configuration from environment
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const taskId = process.env.TEST_TASK_ID;
  const boardId = process.env.TEST_BOARD_ID;

  if (!taskId) {
    console.error("❌ Error: TEST_TASK_ID environment variable is required");
    console.error(
      "   Example: export TEST_TASK_ID=123e4567-e89b-12d3-a456-426614174000",
    );
    process.exit(1);
  }

  // Validate task ID is a valid UUID
  try {
    TaskId.from(taskId);
  } catch {
    console.error(`❌ Error: Invalid TaskId format: ${taskId}`);
    console.error(
      "   TaskId must be a valid UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)",
    );
    process.exit(1);
  }

  // Validate board ID if provided (must be valid UUID format)
  if (boardId) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(boardId)) {
      console.error(`❌ Error: Invalid BoardId format: ${boardId}`);
      console.error("   BoardId must be a valid UUID");
      process.exit(1);
    }
  }

  console.log("Configuration:");
  console.log(`  Redis URL: ${redisUrl}`);
  console.log(`  Task ID: ${taskId}`);
  if (boardId) {
    console.log(`  Board ID: ${boardId}`);
  } else {
    console.log("  Board ID: (will be extracted from task)");
  }
  console.log();

  // Create queue connection
  const queue = new Queue<AgentProcessingJobData>("agent-processing", {
    connection: {
      url: redisUrl,
    },
  });

  try {
    console.log("Connecting to Redis...");
    // Test connection by getting queue info
    const queueInfo = await queue.getWaitingCount();
    console.log("✓ Connected to Redis");
    console.log(`  Waiting jobs: ${queueInfo}`);
    console.log();

    // Prepare job data
    const jobData: AgentProcessingJobData = {
      taskId,
      ...(boardId && { boardId }),
    };

    console.log("Sending job to queue...");
    console.log("  Job data:", JSON.stringify(jobData, null, 2));
    console.log();

    // Add job to queue
    const job = await queue.add("process-task", jobData, {
      jobId: `agent-processing-${taskId}`, // Unique job ID to prevent duplicates
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    console.log("✓ Job added to queue successfully!");
    console.log(`  Job ID: ${job.id}`);
    const jobName = job.name;
    console.log(`  Job Name: ${jobName}`);
    console.log();

    // Get updated queue status
    const waitingCount = await queue.getWaitingCount();
    const activeCount = await queue.getActiveCount();
    const completedCount = await queue.getCompletedCount();
    const failedCount = await queue.getFailedCount();

    console.log("Queue Status:");
    console.log(`  Waiting: ${waitingCount}`);
    console.log(`  Active: ${activeCount}`);
    console.log(`  Completed: ${completedCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log();

    console.log("=".repeat(80));
    console.log("✓ Task sent to queue successfully!");
    console.log("=".repeat(80));
    console.log();
    console.log("The worker service will process this task automatically.");
    console.log("Monitor the worker logs to see processing progress.");
    console.log();

    // Close connection
    await queue.close();
  } catch (error) {
    console.error();
    console.error("=".repeat(80));
    console.error("❌ Failed to send task to queue");
    console.error("=".repeat(80));
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    await queue.close();
    process.exit(1);
  }
}

// Run the script
sendTaskToQueue().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
