# E-way Bill Feature - Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        UI[User Interface]
        EWBList[E-way Bill List]
        EWBForm[E-way Bill Form]
        EWBDetail[E-way Bill Detail]
        InvUI[Invoice UI]
        ChalUI[Challan UI]
    end
    
    subgraph "Backend - Express API"
        API[API Routes]
        EWBRoute[/api/eway-bills]
        InvRoute[/api/invoices]
        Validation[Validation Logic]
        Business[Business Rules]
    end
    
    subgraph "Database - SQLite/Prisma"
        EWBTable[(EWayBill Table)]
        ConsTable[(ConsolidatedEWayBill)]
        InvTable[(Invoice Table)]
        ChalTable[(Challan Table)]
        NotifTable[(Notification Table)]
    end
    
    subgraph "Services"
        PDF[PDF Generator]
        QR[QR Code Generator]
        Notif[Notification Service]
        Valid[Validity Calculator]
    end
    
    UI --> EWBList
    UI --> EWBForm
    UI --> EWBDetail
    UI --> InvUI
    UI --> ChalUI
    
    EWBList --> API
    EWBForm --> API
    EWBDetail --> API
    InvUI --> API
    
    API --> EWBRoute
    API --> InvRoute
    EWBRoute --> Validation
    EWBRoute --> Business
    
    Business --> Valid
    Business --> Notif
    
    EWBRoute --> EWBTable
    EWBRoute --> ConsTable
    InvRoute --> InvTable
    
    EWBTable -.link.- InvTable
    EWBTable -.link.- ChalTable
    
    EWBDetail --> PDF
    EWBDetail --> QR
    
    Notif --> NotifTable
```

## Data Flow - E-way Bill Generation from Invoice

```mermaid
sequenceDiagram
    participant User
    participant InvoiceUI
    participant API
    participant Validation
    participant Database
    participant Notification
    
    User->>InvoiceUI: Click Generate E-way Bill
    InvoiceUI->>API: POST /api/eway-bills/from-invoice/:id
    API->>Database: Fetch Invoice Data
    Database-->>API: Invoice Details
    API->>API: Map Invoice to E-way Bill
    API->>Validation: Validate E-way Bill Data
    Validation-->>API: Validation Result
    
    alt Validation Failed
        API-->>InvoiceUI: Return Errors
        InvoiceUI-->>User: Show Validation Errors
    else Validation Passed
        API->>Database: Create E-way Bill (draft)
        Database-->>API: E-way Bill Created
        API-->>InvoiceUI: Return E-way Bill
        InvoiceUI-->>User: Show E-way Bill Form
        User->>InvoiceUI: Complete & Submit
        InvoiceUI->>API: POST /api/eway-bills/:id/generate
        API->>Database: Update Status to Active
        API->>Notification: Create Success Notification
        Database-->>API: Updated E-way Bill
        API-->>InvoiceUI: Success Response
        InvoiceUI-->>User: Show Success Message
    end
```

## Component Hierarchy

```mermaid
graph TD
    App[App Shell]
    
    App --> EWBPage[E-way Bills Page]
    App --> InvPage[Invoices Page]
    App --> DashPage[Dashboard]
    
    EWBPage --> EWBList[EWayBillListClient]
    EWBList --> EWBTable[Data Table]
    EWBList --> EWBFilters[Filter Panel]
    EWBList --> EWBActions[Action Buttons]
    
    EWBPage --> EWBForm[EWayBillFormClient]
    EWBForm --> Step1[Transaction Details]
    EWBForm --> Step2[Party Details]
    EWBForm --> Step3[Product Details]
    EWBForm --> Step4[Transport Details]
    
    EWBPage --> EWBDetail[EWayBillDetailClient]
    EWBDetail --> EWBInfo[Information Display]
    EWBDetail --> EWBTimeline[Status Timeline]
    EWBDetail --> EWBActions2[Action Panel]
    EWBDetail --> EWBQR[QR Code Display]
    
    InvPage --> InvDetail[Invoice Detail]
    InvDetail --> EWBModal[Generate E-way Bill Modal]
    
    DashPage --> EWBWidget[E-way Bill Expiry Widget]
```

## Database Relationships

```mermaid
erDiagram
    Invoice ||--o| EWayBill : generates
    DeliveryChallan ||--o| EWayBill : generates
    EWayBill ||--o{ ConsolidatedEWayBill : includes
    EWayBill ||--o{ Notification : triggers
    EWayBill ||--o{ AuditEntry : logs
    
    Invoice {
        string id PK
        string invoiceNumber
        string customerId
        string ewayBillId FK
        json data
    }
    
    DeliveryChallan {
        string id PK
        string challanNumber
        string ewayBillId FK
        json data
    }
    
    EWayBill {
        string id PK
        string userId
        string ewayBillNumber
        string status
        string invoiceId FK
        string challanId FK
        string validUpto
        json data
    }
    
    ConsolidatedEWayBill {
        string id PK
        string userId
        string consEwayBillNo
        json ewayBillIds
        json data
    }
    
    Notification {
        string id PK
        string userId
        string type
        boolean isRead
        json data
    }
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create E-way Bill
    Draft --> Active: Generate Number
    Draft --> [*]: Delete
    
    Active --> Extended: Extend Validity
    Extended --> Extended: Extend Again (max 4)
    
    Active --> Cancelled: Cancel (within 24h)
    Extended --> Cancelled: Cancel (within 24h)
    
    Active --> Expired: Validity Expires
    Extended --> Expired: Validity Expires
    
    Cancelled --> [*]
    Expired --> [*]
    
    note right of Active
        Valid for transport
        Can update Part-B
    end note
    
    note right of Extended
        Extended 1-4 times
        New validity period
    end note
    
    note right of Cancelled
        Cannot be reactivated
        Reason required
    end note
```

## API Request/Response Flow

```mermaid
graph LR
    subgraph "Client Request"
        A[User Action]
        B[Form Data]
        C[Validation]
    end
    
    subgraph "API Layer"
        D[Route Handler]
        E[Auth Middleware]
        F[Business Logic]
    end
    
    subgraph "Data Layer"
        G[Prisma Client]
        H[Database]
    end
    
    subgraph "Response"
        I[Success/Error]
        J[Updated State]
        K[UI Update]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> G
    G --> F
    F --> I
    I --> J
    J --> K
```

## Validation Pipeline

```mermaid
graph TD
    Start[E-way Bill Data] --> V1{Required Fields?}
    V1 -->|Missing| E1[Error: Missing Fields]
    V1 -->|Present| V2{Valid GSTIN?}
    
    V2 -->|Invalid| E2[Error: Invalid GSTIN]
    V2 -->|Valid| V3{Valid HSN Code?}
    
    V3 -->|Invalid| E3[Error: Invalid HSN]
    V3 -->|Valid| V4{Distance > 0?}
    
    V4 -->|No| E4[Error: Invalid Distance]
    V4 -->|Yes| V5{Value Check}
    
    V5 -->|< 50000| W1[Warning: May not be required]
    V5 -->|>= 50000| V6{State Rules}
    
    V6 -->|Inter-state| Required[E-way Bill Required]
    V6 -->|Intra-state| V7{State Specific}
    
    V7 -->|Required| Required
    V7 -->|Not Required| Optional[E-way Bill Optional]
    
    W1 --> Optional
    Required --> Success[Validation Passed]
    Optional --> Success
    
    E1 --> Failed[Validation Failed]
    E2 --> Failed
    E3 --> Failed
    E4 --> Failed
```

## Notification Trigger Flow

```mermaid
graph TD
    Cron[Scheduled Job - Every Hour] --> Check[Check E-way Bills]
    
    Check --> Query[Query validUpto < now + 24h]
    Query --> Results{Has Results?}
    
    Results -->|No| End[End]
    Results -->|Yes| Loop[For Each E-way Bill]
    
    Loop --> Check24[Check if 24h warning sent]
    Check24 -->|Not Sent| Send24[Send 24h Warning]
    Check24 -->|Sent| Check6[Check if 6h warning sent]
    
    Check6 -->|Not Sent| Send6[Send 6h Warning]
    Check6 -->|Sent| CheckExp[Check if expired]
    
    CheckExp -->|Expired| SendExp[Send Expired Notice]
    CheckExp -->|Not Expired| Next[Next E-way Bill]
    
    Send24 --> CreateNotif1[Create Notification]
    Send6 --> CreateNotif2[Create Notification]
    SendExp --> CreateNotif3[Create Notification]
    SendExp --> UpdateStatus[Update Status to Expired]
    
    CreateNotif1 --> Next
    CreateNotif2 --> Next
    CreateNotif3 --> Next
    UpdateStatus --> Next
    
    Next --> Loop
```

## Mobile App Architecture

```mermaid
graph TB
    subgraph "Mobile App - React Native"
        MobileUI[Mobile UI]
        EWBScreen[E-way Bill Screen]
        Scanner[QR Scanner]
        Camera[Camera OCR]
        LocalStore[Local Storage]
    end
    
    subgraph "Shared Services"
        API[REST API]
        Auth[Authentication]
    end
    
    subgraph "Backend"
        Server[Express Server]
        DB[(Database)]
    end
    
    MobileUI --> EWBScreen
    EWBScreen --> Scanner
    EWBScreen --> Camera
    EWBScreen --> LocalStore
    
    EWBScreen --> API
    Scanner --> API
    API --> Auth
    Auth --> Server
    Server --> DB
    
    LocalStore -.sync.- API
```

## Security & Access Control

```mermaid
graph TD
    Request[API Request] --> Auth[Authentication Check]
    Auth -->|Invalid| Reject[401 Unauthorized]
    Auth -->|Valid| GetUser[Get User ID]
    
    GetUser --> CheckOwner{User Owns Resource?}
    CheckOwner -->|No| Deny[403 Forbidden]
    CheckOwner -->|Yes| CheckStatus{Check E-way Bill Status}
    
    CheckStatus -->|Draft| AllowAll[Allow All Operations]
    CheckStatus -->|Active| CheckOp{Operation Type}
    
    CheckOp -->|Read| Allow[Allow]
    CheckOp -->|Update Part-B| Allow
    CheckOp -->|Cancel| CheckTime{Within 24h?}
    CheckOp -->|Extend| CheckExpiry{Near Expiry?}
    CheckOp -->|Delete| Deny
    
    CheckTime -->|Yes| Allow
    CheckTime -->|No| Deny
    
    CheckExpiry -->|Yes| CheckCount{Extended < 4?}
    CheckExpiry -->|No| Deny
    
    CheckCount -->|Yes| Allow
    CheckCount -->|No| Deny
    
    AllowAll --> Process[Process Request]
    Allow --> Process
    Process --> Response[Return Response]
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Frontend"
        A[Component] --> B[React Query Cache]
        B --> C[Optimistic Updates]
    end
    
    subgraph "Backend"
        D[API Route] --> E[Database Indexes]
        E --> F[Query Optimization]
        F --> G[Pagination]
    end
    
    subgraph "Caching"
        H[Redis Cache]
        I[Static Data]
    end
    
    A --> D
    D --> H
    H --> I
    I --> F
    
    B -.invalidate.- D
    C -.rollback.- D
```

