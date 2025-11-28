import { PrismaClient, ColumnType, TaskContext } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo user if none exists
  const existingUser = await prisma.user.findFirst();
  
  if (existingUser) {
    console.log('✅ Database already seeded, skipping...');
    return;
  }

  // Create demo user with a fully configured GTD board
  const user = await prisma.user.create({
    data: {
      email: 'demo@personal-kanban.local',
      name: 'Demo User',
      timezone: 'UTC',
    },
  });
  console.log(`✅ Created demo user: ${user.email}`);

  // Create a GTD-configured board
  const board = await prisma.board.create({
    data: {
      ownerId: user.id,
      name: 'Personal GTD Board',
      description: 'A Getting Things Done workflow board with all GTD columns',
      config: {
        staleThresholdDays: 7,
        defaultWipLimit: 5,
      },
    },
  });
  console.log(`✅ Created board: ${board.name}`);

  // Create GTD columns with appropriate types and WIP limits
  const columns = await Promise.all([
    // Capture/Input stage
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Inbox',
        type: ColumnType.INPUT,
        position: 0,
        wipLimit: null, // No limit on inbox
      },
    }),
    
    // Clarification stage
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Clarify',
        type: ColumnType.CLARIFY,
        position: 1,
        wipLimit: 10,
      },
    }),
    
    // Context-based action columns
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Next Actions',
        type: ColumnType.CONTEXT,
        position: 2,
        wipLimit: 5,
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: '@Email',
        type: ColumnType.CONTEXT,
        position: 3,
        wipLimit: 3,
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: '@Phone',
        type: ColumnType.CONTEXT,
        position: 4,
        wipLimit: 3,
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: '@Meeting',
        type: ColumnType.CONTEXT,
        position: 5,
        wipLimit: 3,
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: '@Desk',
        type: ColumnType.CONTEXT,
        position: 6,
        wipLimit: 3,
      },
    }),
    
    // Waiting/deferred
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Waiting For',
        type: ColumnType.WAITING,
        position: 7,
        wipLimit: null,
      },
    }),
    
    // Someday/Maybe
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Someday/Maybe',
        type: ColumnType.SOMEDAY,
        position: 8,
        wipLimit: null,
      },
    }),
    
    // Completion
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Done',
        type: ColumnType.DONE,
        position: 9,
        wipLimit: null,
      },
    }),
    
    // Archive
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Archive',
        type: ColumnType.ARCHIVE,
        position: 10,
        wipLimit: null,
      },
    }),
  ]);
  console.log(`✅ Created ${columns.length} columns`);

  // Create some default tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { boardId: board.id, name: 'urgent', color: '#ef4444' } }),
    prisma.tag.create({ data: { boardId: board.id, name: 'important', color: '#f59e0b' } }),
    prisma.tag.create({ data: { boardId: board.id, name: 'quick-win', color: '#22c55e' } }),
    prisma.tag.create({ data: { boardId: board.id, name: 'blocked', color: '#6b7280' } }),
    prisma.tag.create({ data: { boardId: board.id, name: 'review', color: '#8b5cf6' } }),
  ]);
  console.log(`✅ Created ${tags.length} tags`);

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      boardId: board.id,
      ownerId: user.id,
      name: 'Weekly Review Setup',
      description: 'Set up and configure the weekly review process',
      desiredOutcome: 'A reliable weekly review habit that keeps the system trusted',
      status: 'active',
    },
  });
  console.log(`✅ Created sample project: ${project.name}`);

  // Get the inbox column for sample tasks
  const inboxColumn = columns.find((c) => c.type === ColumnType.INPUT)!;
  const nextActionsColumn = columns.find((c) => c.name === 'Next Actions')!;

  // Create sample tasks
  const sampleTasks = await Promise.all([
    prisma.task.create({
      data: {
        boardId: board.id,
        columnId: inboxColumn.id,
        ownerId: user.id,
        title: 'Review the Personal Kanban documentation',
        description: 'Go through all the setup guides and understand how to use the system effectively.',
        needsBreakdown: true,
        metadata: { source: 'seed' },
      },
    }),
    prisma.task.create({
      data: {
        boardId: board.id,
        columnId: inboxColumn.id,
        ownerId: user.id,
        title: 'Configure IMAP email capture',
        description: 'Set up email forwarding to automatically capture tasks from email.',
        needsBreakdown: true,
        metadata: { source: 'seed' },
      },
    }),
    prisma.task.create({
      data: {
        boardId: board.id,
        columnId: nextActionsColumn.id,
        ownerId: user.id,
        projectId: project.id,
        title: 'Schedule first weekly review',
        description: 'Block 1-2 hours on Friday afternoon for weekly review.',
        context: TaskContext.DESK,
        needsBreakdown: false,
        metadata: { source: 'seed' },
      },
    }),
  ]);
  console.log(`✅ Created ${sampleTasks.length} sample tasks`);

  // Create a recurring template for weekly review
  const weeklyReviewTemplate = await prisma.recurringTemplate.create({
    data: {
      boardId: board.id,
      ownerId: user.id,
      name: 'Weekly Review',
      description: 'GTD weekly review checklist to keep the system trusted',
      payload: {
        title: 'Weekly Review',
        description: 'Complete the weekly review checklist to maintain system trust.',
        needsBreakdown: false,
        context: TaskContext.DESK,
        checklist: [
          { title: 'Get inbox to zero', isDone: false },
          { title: 'Review previous calendar (past 2 weeks)', isDone: false },
          { title: 'Review upcoming calendar (next 2 weeks)', isDone: false },
          { title: 'Empty your head - mind sweep', isDone: false },
          { title: 'Review Projects list', isDone: false },
          { title: 'Review Next Actions lists', isDone: false },
          { title: 'Review Waiting For list', isDone: false },
          { title: 'Review Someday/Maybe list', isDone: false },
          { title: 'Review stale items (>7 days)', isDone: false },
          { title: 'Be creative - any new ideas?', isDone: false },
        ],
        metadata: {
          analyticsUrl: '/analytics/weekly',
          staleTasksUrl: '/views/stale',
        },
      },
      rrule: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=14',
      timezone: 'UTC',
      isActive: true,
    },
  });
  console.log(`✅ Created weekly review template: ${weeklyReviewTemplate.name}`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\nDemo credentials:');
  console.log(`  Email: ${user.email}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Board ID: ${board.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
