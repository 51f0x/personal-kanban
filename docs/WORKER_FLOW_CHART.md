# Worker Service Flow Chart

This document contains visual flowcharts for the worker service operations.

## Main Agent Processing Flow

```mermaid
flowchart TD
    Start([API Service Creates Task]) --> Queue[Add Job to agent-processing Queue]
    Queue --> Processor[AgentJobProcessor.process]
    
    Processor --> Validate{Validate Job Data}
    Validate -->|Invalid| Error1[Log Error & Fail Job]
    Validate -->|Valid| FetchTask[Fetch Task from Database]
    
    FetchTask --> Process[TaskProcessorService.processTaskWithAgents]
    
    Process --> Orchestrate[AgentOrchestrator.processTask]
    
    Orchestrate --> FetchTaskData[Fetch Task Data]
    FetchTaskData --> SelectAgents[AgentSelectorAgent.selectAgents]
    
    SelectAgents --> CheckWebContent{Web Content<br/>Selected?}
    CheckWebContent -->|Yes| ExtractURL[Extract URL from Task]
    ExtractURL --> Download[WebContentAgent.downloadContent]
    Download --> CheckDownload{Download<br/>Success?}
    CheckDownload -->|No| LogError1[Log Error]
    CheckDownload -->|Yes| CheckLength{Content<br/>> 500 chars?}
    CheckLength -->|No| SkipSummarize[Skip Summarization]
    CheckLength -->|Yes| Summarize[ContentSummarizerAgent.summarize]
    Summarize --> TaskAssistant
    CheckWebContent -->|No| TaskAssistant
    SkipSummarize --> TaskAssistant
    LogError1 --> TaskAssistant
    
    TaskAssistant[TaskAssistantAgent.processTask]
    TaskAssistant --> Clarification[Clarification Phase]
    Clarification --> Structure[Structure Phase]
    Structure --> Implementation[Implementation Phase]
    Implementation --> QA[Quality Assurance Phase]
    
    QA --> CheckActions{Action Extraction<br/>Selected?}
    CheckActions -->|Yes| ExtractActions[ActionExtractorAgent.extractActions]
    ExtractActions --> CheckMeaningful{Has Meaningful<br/>Actions/Content?}
    CheckActions -->|No| CheckMeaningful
    
    CheckMeaningful -->|Yes| ProposeSolutions[SolutionProposerAgent.proposeSolutions]
    CheckMeaningful -->|No| CheckHelp
    
    ProposeSolutions --> CheckHelp{Has Substantial<br/>Content for Help?}
    CheckHelp -->|Yes| GenerateHelp[TaskHelpAgent.generateHelp]
    CheckHelp -->|No| ParallelAnalysis
    
    GenerateHelp --> ParallelAnalysis[Run Analysis Agents in Parallel]
    
    ParallelAnalysis --> TaskAnalysis{Task Analysis<br/>Selected?}
    TaskAnalysis -->|Yes| AnalyzeTask[TaskAnalyzerAgent.analyzeTask]
    TaskAnalysis -->|No| ContextExtraction
    
    AnalyzeTask --> ContextExtraction{Context Extraction<br/>Selected?}
    ContextExtraction -->|Yes| ExtractContext[ContextExtractorAgent.extractContext]
    ContextExtraction -->|No| CombineResults
    
    ExtractContext --> CombineResults[Combine All Results]
    
    CombineResults --> PublishComplete[Publish AgentCompletedEvent]
    PublishComplete --> ReturnResults[Return AgentProcessingResult]
    
    ReturnResults --> ApplyResults[AgentApplicationService.applyResultsToTask]
    
    ApplyResults --> CreateHints[HintService.createHintsFromResults]
    CreateHints --> UpdateTask[Update Task Fields]
    UpdateTask --> AddChecklist[Add Checklist Items]
    AddChecklist --> StoreMetadata[Store Processing Metadata]
    
    StoreMetadata --> Markdown[Convert Description to Markdown]
    Markdown --> SendResults[AgentResultSenderService.sendResult]
    
    SendResults --> ResultQueue[Add Job to agent-results Queue]
    ResultQueue --> End([API Service Receives Results])
    
    Error1 --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Error1 fill:#ffebee
    style LogError1 fill:#ffebee
```

## Email Reminder Flow

```mermaid
flowchart TD
    Start([EmailReminderWorker.onModuleInit]) --> CheckEnabled{Email Reminders<br/>Enabled?}
    CheckEnabled -->|No| LogDisabled[Log: Disabled]
    CheckEnabled -->|Yes| CheckEmailService{Email Service<br/>Available?}
    
    CheckEmailService -->|No| LogUnavailable[Log: Unavailable]
    CheckEmailService -->|Yes| SendReminders[Send Reminders to All Users]
    
    SendReminders --> GetUsers[Request Users via Inter-Container Queue]
    GetUsers --> FilterUsers[Filter Users with Email]
    
    FilterUsers --> LoopUsers[For Each User]
    LoopUsers --> GetPrioritized[Get Prioritized Tasks for User]
    
    GetPrioritized --> CheckTasks{Has Tasks?}
    CheckTasks -->|No| SkipUser[Skip User]
    CheckTasks -->|Yes| CreateTokens[Create Email Action Tokens]
    
    CreateTokens --> BuildEmailTasks[Build Email Task Objects]
    BuildEmailTasks --> CountUrgent[Count Urgent & Overdue Tasks]
    CountUrgent --> SendEmail[EmailService.sendWorkPackageEmail]
    
    SendEmail --> CheckSent{Email<br/>Sent?}
    CheckSent -->|No| LogError[Log Error]
    CheckSent -->|Yes| MoveTasks[Move Tasks to Next Action Column]
    
    MoveTasks --> GetColumns[Get CONTEXT Columns via Queue]
    GetColumns --> FindNextAction[Find 'Next Actions' Column]
    FindNextAction --> MoveViaQueue[Move Tasks via Queue]
    
    MoveViaQueue --> NextUser{More Users?}
    LogError --> NextUser
    SkipUser --> NextUser
    
    NextUser -->|Yes| LoopUsers
    NextUser -->|No| LogComplete[Log Completion Stats]
    
    LogComplete --> ScheduleNext[Schedule Next Run]
    ScheduleNext --> Wait[Wait for Interval]
    Wait --> SendReminders
    
    LogDisabled --> End([Worker Running])
    LogUnavailable --> End
    LogComplete --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style LogError fill:#ffebee
    style LogDisabled fill:#fff3e0
    style LogUnavailable fill:#fff3e0
```

## IMAP Integration Flow

```mermaid
flowchart TD
    Start([ImapPollerService.onModuleInit]) --> CheckConfig{IMAP Config<br/>Present?}
    CheckConfig -->|No| LogDisabled[Log: IMAP Disabled]
    CheckConfig -->|Yes| Connect[Connect to IMAP Server]
    
    Connect --> CheckConnection{Connection<br/>Success?}
    CheckConnection -->|No| LogError1[Log Error & Disable]
    CheckConnection -->|Yes| StartPolling[Start Polling Interval]
    
    StartPolling --> PollMailbox[Poll Mailbox]
    PollMailbox --> OpenMailbox[Open Mailbox]
    OpenMailbox --> SearchUnseen[Search for Unseen Messages]
    
    SearchUnseen --> CheckUnseen{Has Unseen<br/>Messages?}
    CheckUnseen -->|No| WaitInterval[Wait for Interval]
    CheckUnseen -->|Yes| LoopMessages[For Each Unseen Message]
    
    LoopMessages --> FetchMessage[Fetch Message Content]
    FetchMessage --> ExtractData[Extract Subject, From, Content]
    ExtractData --> CreateTask[QuickTaskService.createFromCapture]
    
    CreateTask --> ParseText[Parse Capture Text]
    ParseText --> FindBoard[Find Board & Column]
    FindBoard --> CreateTaskRecord[Create Task in Database]
    
    CreateTaskRecord --> MarkSeen[Mark Email as Seen]
    MarkSeen --> NextMessage{More<br/>Messages?}
    
    NextMessage -->|Yes| LoopMessages
    NextMessage -->|No| LogProcessed[Log: Processed N emails]
    
    LogProcessed --> WaitInterval
    WaitInterval --> PollMailbox
    
    LogDisabled --> End([Worker Running])
    LogError1 --> End
    LogProcessed --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style LogError1 fill:#ffebee
    style LogDisabled fill:#fff3e0
```

## Inter-Container Communication Flow

```mermaid
flowchart TD
    Start([Worker Needs API Data]) --> CreateRequest[Create ApiRequest]
    CreateRequest --> GenerateID[Generate Request ID]
    GenerateID --> SetupTimeout[Setup Timeout Handler]
    SetupTimeout --> StorePending[Store Pending Request]
    
    StorePending --> AddToQueue[Add to api-requests Queue]
    AddToQueue --> WaitResponse[Wait for Response]
    
    WaitResponse --> TimeoutCheck{Timeout<br/>Reached?}
    TimeoutCheck -->|Yes| RejectTimeout[Reject with Timeout Error]
    TimeoutCheck -->|No| CheckResponse{Response<br/>Received?}
    
    CheckResponse -->|No| WaitResponse
    CheckResponse -->|Yes| ProcessResponse[Process Response Job]
    
    ProcessResponse --> FindPending[Find Pending Request]
    FindPending --> ClearTimeout[Clear Timeout]
    ClearTimeout --> Resolve[Resolve Promise with Response]
    
    Resolve --> ReturnData[Return Data to Caller]
    RejectTimeout --> ReturnError[Return Error to Caller]
    
    ReturnData --> End([Request Complete])
    ReturnError --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style RejectTimeout fill:#ffebee
    style ReturnError fill:#ffebee
```

## Event Publishing Flow

```mermaid
flowchart TD
    Start([Agent Processing Event]) --> CreateEvent[Create Domain Event]
    CreateEvent --> Publish[EventBus.publish]
    
    Publish --> RedisPub[Redis Pub/Sub]
    RedisPub --> Broadcast[Broadcast to Subscribers]
    
    Broadcast --> API[API Service Receives]
    Broadcast --> OtherServices[Other Services Receive]
    
    API --> WebSocket[WebSocket Connection]
    WebSocket --> Client[Client Receives Real-time Update]
    
    OtherServices --> ProcessEvent[Process Event]
    
    Client --> End1([User Sees Update])
    ProcessEvent --> End2([Service Processes Event])
    
    style Start fill:#e1f5ff
    style End1 fill:#e1f5ff
    style End2 fill:#e1f5ff
```

## Complete System Architecture

```mermaid
flowchart TB
    subgraph API["API Service"]
        APICreate[Create Task]
        APIQueue[Add to agent-processing Queue]
        APIReceive[Receive Results from agent-results Queue]
        APIWebSocket[WebSocket Server]
    end
    
    subgraph Worker["Worker Service"]
        subgraph JobProcessing["Job Processing"]
            Processor[AgentJobProcessor]
            TaskProcessor[TaskProcessorService]
        end
        
        subgraph Orchestration["Agent Orchestration"]
            Orchestrator[AgentOrchestrator]
            Selector[AgentSelectorAgent]
            WebContent[WebContentAgent]
            Summarizer[ContentSummarizerAgent]
            TaskAssistant[TaskAssistantAgent]
            ActionExtractor[ActionExtractorAgent]
            SolutionProposer[SolutionProposerAgent]
            TaskHelp[TaskHelpAgent]
            TaskAnalyzer[TaskAnalyzerAgent]
            ContextExtractor[ContextExtractorAgent]
        end
        
        subgraph Application["Result Application"]
            AppService[AgentApplicationService]
            HintService[HintService]
            Markdown[ToMarkdownAgent]
        end
        
        subgraph Background["Background Workers"]
            EmailWorker[EmailReminderWorker]
            IMAPPoller[ImapPollerService]
        end
        
        subgraph Communication["Communication"]
            InterContainer[InterContainerQueueService]
            EventBus[Redis Event Bus]
        end
        
        ResultSender[AgentResultSenderService]
    end
    
    subgraph Queues["BullMQ Queues"]
        AgentProcessing[agent-processing]
        AgentResults[agent-results]
        APIRequests[api-requests]
        APIResponses[api-responses]
    end
    
    subgraph Redis["Redis"]
        EventPubSub[Event Pub/Sub]
        QueueStorage[Queue Storage]
    end
    
    subgraph Database["PostgreSQL"]
        Prisma[(Prisma Database)]
    end
    
    APICreate --> APIQueue
    APIQueue --> AgentProcessing
    AgentProcessing --> Processor
    Processor --> TaskProcessor
    TaskProcessor --> Orchestrator
    
    Orchestrator --> Selector
    Selector --> WebContent
    Selector --> Summarizer
    Selector --> TaskAssistant
    Selector --> ActionExtractor
    Selector --> SolutionProposer
    Selector --> TaskHelp
    Selector --> TaskAnalyzer
    Selector --> ContextExtractor
    
    TaskProcessor --> AppService
    AppService --> HintService
    TaskProcessor --> Markdown
    AppService --> Prisma
    
    TaskProcessor --> ResultSender
    ResultSender --> AgentResults
    AgentResults --> APIReceive
    
    Orchestrator --> EventBus
    EventBus --> EventPubSub
    EventPubSub --> APIWebSocket
    
    EmailWorker --> InterContainer
    IMAPPoller --> Prisma
    InterContainer --> APIRequests
    InterContainer --> APIResponses
    
    AgentProcessing --> QueueStorage
    AgentResults --> QueueStorage
    APIRequests --> QueueStorage
    APIResponses --> QueueStorage
    
    style API fill:#e3f2fd
    style Worker fill:#f3e5f5
    style Queues fill:#fff3e0
    style Redis fill:#ffebee
    style Database fill:#e8f5e9
```
