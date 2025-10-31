/**
 * Project Analyzer - Architecture Diagram
 * 
 * This file contains a visual representation of the Project Analyzer architecture
 * using Mermaid diagram syntax. You can copy this into a Mermaid renderer
 * (like the Mermaid Live Editor at https://mermaid.live) to visualize the architecture.
 */

export const ARCHITECTURE_DIAGRAM = `
graph TB
    subgraph "Project Analyzer Core"
        PA[Project Analyzer<br/>Main Orchestrator]
    end

    subgraph "Analysis Components"
        FA[File Analyzer<br/>- File parsing<br/>- Symbol extraction<br/>- Complexity metrics]
        DA[Dependency Analyzer<br/>- Graph building<br/>- External deps<br/>- Cycle detection]
        PD[Pattern Detector<br/>- Design patterns<br/>- React patterns<br/>- Anti-patterns]
    end

    subgraph "Data Management"
        ST[Symbol Table<br/>- Symbol storage<br/>- References<br/>- Relationships]
        DG[Dependency Graph<br/>- Nodes & edges<br/>- Path finding<br/>- Topological sort]
        CM[Cache Manager<br/>- LRU cache<br/>- File tracking<br/>- Persistent storage]
    end

    subgraph "TypeScript Integration"
        TS[TypeScript Compiler<br/>- AST parsing<br/>- Type checking<br/>- Symbol resolution]
    end

    subgraph "Output & Reporting"
        AR[Analysis Results<br/>- Statistics<br/>- Errors/Warnings<br/>- Metrics]
        RP[Report Generator<br/>- JSON output<br/>- HTML reports<br/>- Markdown docs]
    end

    PA --> FA
    PA --> DA
    PA --> PD
    PA --> CM

    FA --> ST
    FA --> TS

    DA --> DG
    DA --> CM

    PD --> CM

    ST --> AR
    DG --> AR
    CM --> AR

    AR --> RP
`;

export const DATA_FLOW_DIAGRAM = `
flowchart TD
    A[Start Analysis] --> B[Discover Files]
    B --> C{Parallel Processing?}
    
    C -->|Yes| D[Create Worker Pool]
    C -->|No| E[Sequential Processing]
    
    D --> F[Process Files in Batches]
    E --> G[Process Files One by One]
    
    F --> H[Check Cache]
    G --> H
    
    H --> I{Cached?}
    
    I -->|Yes| J[Return Cached Result]
    I -->|No| K[Parse File]
    
    K --> L[Extract AST]
    L --> M[Analyze Symbols]
    M --> N[Detect Dependencies]
    N --> O[Detect Patterns]
    
    O --> P[Update Cache]
    J --> Q[Aggregate Results]
    P --> Q
    
    Q --> R[Build Symbol Table]
    R --> S[Build Dependency Graph]
    S --> T[Generate Report]
    
    T --> U[End]
`;

export const CACHE_ARCHITECTURE = `
graph LR
    subgraph "Cache Manager"
        direction TB
        LRU[LRU Cache<br/>- Max size: 1000<br/>- TTL: 1 hour]
        
        subgraph "Cache Storage"
            direction LR
            CS1[Cache Entry 1<br/>- Data<br/>- Timestamp<br/>- File hash]
            CS2[Cache Entry 2<br/>- Data<br/>- Timestamp<br/>- File hash]
            CS3[Cache Entry N<br/>- Data<br/>- Timestamp<br/>- File hash]
        end
        
        subgraph "File Index"
            direction TB
            FI1[File Path 1<br/>→ Cache Key 1]
            FI2[File Path 2<br/>→ Cache Key 2]
            FI3[File Path N<br/>→ Cache Key N]
        end
        
        subgraph "Statistics"
            direction TB
            STAT1[Hits: 0]
            STAT2[Misses: 0]
            STAT3[Hit Rate: 0%]
        end
    end
    
    subgraph "Cache Operations"
        direction LR
        CO1[Get<br/>- Check TTL<br/>- Verify hash<br/>- Update stats]
        CO2[Set<br/>- Serialize data<br/>- Compress if needed<br/>- Update index]
        CO3[Delete<br/>- Remove entry<br/>- Remove from index<br/>- Update stats]
        CO4[Clear<br/>- Clear all entries<br/>- Clear index<br/>- Reset stats]
    end
    
    LRU <--> CS1
    LRU <--> CS2
    LRU <--> CS3
    
    LRU <--> FI1
    LRU <--> FI2
    LRU <--> FI3
    
    LRU <--> STAT1
    LRU <--> STAT2
    LRU <--> STAT3
`;

export const DEPENDENCY_GRAPH_STRUCTURE = `
graph TD
    subgraph "Dependency Graph"
        direction TB
        
        subgraph "Nodes"
            direction LR
            N1[File A.ts<br/>- Type: TypeScript<br/>- Dependencies: 2<br/>- Dependents: 0]
            N2[File B.ts<br/>- Type: TypeScript<br/>- Dependencies: 1<br/>- Dependents: 1]
            N3[File C.ts<br/>- Type: TypeScript<br/>- Dependencies: 0<br/>- Dependents: 2]
        end
        
        subgraph "Edges"
            direction LR
            E1[A → B<br/>Type: Import<br/>Weight: 1]
            E2[A → C<br/>Type: Import<br/>Weight: 1]
            E3[B → C<br/>Type: Import<br/>Weight: 1]
        end
        
        subgraph "Graph Operations"
            direction LR
            OP1[Add Node]
            OP2[Add Edge]
            OP3[Find Path]
            OP4[Detect Cycles]
            OP5[Topological Sort]
            OP6[Get Metrics]
        end
    end
    
    N1 --> E1
    N1 --> E2
    N2 --> E3
`;

export const PATTERN_DETECTION_FLOW = `
flowchart TD
    A[Parse Source File] --> B[Create AST]
    B --> C[Visit AST Nodes]
    
    C --> D{Node Type?}
    
    D -->|Class Declaration| E[Check for Patterns]
    D -->|Function Declaration| E
    D -->|Interface Declaration| E
    D -->|Variable Statement| E
    
    E --> F[Pattern Matched?]
    
    F -->|Yes| G[Create Pattern]
    F -->|No| H[Continue Processing]
    
    G --> I[Add to Results]
    H --> J{Next Node?}
    
    J -->|Yes| C
    J -->|No| K[Return Patterns]
    
    K --> L[Classify Patterns]
    
    subgraph "Design Patterns"
        L --> DP1[Factory Pattern]
        L --> DP2[Singleton Pattern]
        L --> DP3[Observer Pattern]
        L --> DP4[Strategy Pattern]
        L --> DP5[Decorator Pattern]
        L --> DP6[Adapter Pattern]
        L --> DP7[Facade Pattern]
    end
    
    subgraph "React Patterns"
        L --> RP1[React Component]
        L --> RP2[React Hook]
        L --> RP3[Custom Hook]
        L --> RP4[Context]
        L --> RP5[HOC]
        L --> RP6[Render Props]
    end
    
    subgraph "Anti-patterns"
        L --> AP1[Large Class]
        L --> AP2[Long Function]
        L --> AP3[God Object]
    end
`;

export const PERFORMANCE_ARCHITECTURE = `
graph TB
    subgraph "Performance Optimization"
        direction TB
        
        subgraph "Parallel Processing"
            direction LR
            PP1[Worker Pool<br/>- Max: 8 workers<br/>- Queue management<br/>- Load balancing]
            PP2[Batch Processing<br/>- Batch size: 50<br/>- Memory control<br/>- Progress tracking]
        end
        
        subgraph "Memory Management"
            direction LR
            MM1[Object Pooling<br/>- Reuse objects<br/>- Reduce GC<br/>- Performance boost]
            MM2[Garbage Collection<br/>- Manual triggers<br/>- Memory monitoring<br/>- Leak detection]
            MM3[Streaming Analysis<br/>- Process large files<br/>- Memory efficient<br/>- Real-time processing]
        end
        
        subgraph "Caching Strategy"
            direction LR
            CS1[Multi-level Cache<br/>- Memory cache<br/>- Disk cache<br/>- Distributed cache]
            CS2[Cache Invalidation<br/>- File modification<br/>- Time-based<br/>- Manual trigger]
            CS3[Compression<br/>- Gzip compression<br/>- Space savings<br/>- Faster I/O]
        end
        
        subgraph "Performance Monitoring"
            direction LR
            PM1[Metrics Collection<br/>- Processing time<br/>- Memory usage<br/>- Throughput]
            PM2[Performance Profiling<br/>- Hotspot detection<br/>- Bottleneck analysis<br/>- Optimization hints]
            PM3[Benchmarking<br/>- Baseline comparison<br/>- Regression detection<br/>- Performance trends]
        end
    end
`;

export const INTEGRATION_ARCHITECTURE = `
graph TB
    subgraph "Integration Ecosystem"
        direction TB
        
        subgraph "IDE Integration"
            direction LR
            IDE1[VS Code Extension<br/>- Real-time analysis<br/>- Error reporting<br/>- Code navigation]
            IDE2[IntelliJ Plugin<br/>- AST visualization<br/>- Pattern highlighting<br/>- Quick fixes]
        end
        
        subgraph "CI/CD Integration"
            direction LR
            CI1[GitHub Actions<br/>- Automated analysis<br/>- Quality gates<br/>- PR comments]
            CI2[Jenkins Plugin<br/>- Build pipeline<br/>- Quality reports<br/>- Trend analysis]
            CI3[GitLab CI<br/>- Code analysis<br/>- Security scanning<br/>- Compliance checking]
        end
        
        subgraph "CLI Tools"
            direction LR
            CLI1[Command Line Tool<br/>- Project analysis<br/>- Report generation<br/>- Batch processing]
            CLI2[API Client<br/>- Programmatic access<br/>- Custom integrations<br/>- Automation scripts]
        end
        
        subgraph "Web Applications"
            direction LR
            WEB1[Dashboard<br/>- Visual reports<br/>- Trend analysis<br/>- Team metrics]
            WEB2[REST API<br/>- Programmatic access<br/>- Data export<br/>- Integration endpoint]
        end
    end
    
    PA[Project Analyzer] --> IDE1
    PA --> IDE2
    PA --> CI1
    PA --> CI2
    PA --> CI3
    PA --> CLI1
    PA --> CLI2
    PA --> WEB1
    PA --> WEB2
`;

export const FILE_PROCESSING_WORKFLOW = `
flowchart TD
    A[File Discovery] --> B[Filter Files]
    B --> C{File Type?}
    
    C -->|TypeScript/TSX| D[Parse with TS Compiler]
    C -->|JavaScript/JSX| E[Parse with TS Compiler]
    C -->|JSON| F[Parse as JSON]
    C -->|Other| G[Text Analysis]
    
    D --> H[Extract Symbols]
    E --> H
    F --> I[Extract Structure]
    G --> J[Extract Patterns]
    
    H --> K[Analyze Dependencies]
    I --> K
    J --> K
    
    K --> L[Detect Patterns]
    L --> M[Calculate Metrics]
    M --> N[Update Cache]
    N --> O[Store Result]
    
    O --> P[Process Next File]
    P --> Q{More Files?}
    
    Q -->|Yes| C
    Q -->|No| R[Aggregate Results]
    
    R --> S[Generate Report]
    S --> T[End]
`;

export const SYMBOL_TABLE_STRUCTURE = `
graph TB
    subgraph "Symbol Table"
        direction TB
        
        subgraph "Symbol Storage"
            direction LR
            SS1[Symbol Entry 1<br/>- Name: MyClass<br/>- Kind: Class<br/>- Location: file.ts:10:5<br/>- References: 3]
            SS2[Symbol Entry 2<br/>- Name: myFunction<br/>- Kind: Function<br/>- Location: file.ts:20:1<br/>- References: 5]
            SS3[Symbol Entry N<br/>- Name: interface1<br/>- Kind: Interface<br/>- Location: file.ts:30:1<br/>- References: 2]
        end
        
        subgraph "Reference Tracking"
            direction LR
            RT1[Reference 1<br/>- Location: other.ts:5:10<br/>- Context: new MyClass()]
            RT2[Reference 2<br/>- Location: other.ts:15:5<br/>- Context: MyClass.method()]
            RT3[Reference N<br/>- Location: other.ts:25:8<br/>- Context: import { MyClass }]
        end
        
        subgraph "Relationship Graph"
            direction LR
            RG1[Dependency Edge<br/>- From: MyClass<br/>- To: Helper<br/>- Type: Uses]
            RG2[Reference Edge<br/>- From: other.ts<br/>- To: MyClass<br/>- Type: Import]
            RG3[Inheritance Edge<br/>- From: MyClass<br/>- To: BaseClass<br/>- Type: Extends]
        end
        
        subgraph "File Index"
            direction TB
            FI1[file.ts<br/>- MyClass, myFunction, interface1]
            FI2[other.ts<br/>- Reference to MyClass]
            FI3[base.ts<br/>- BaseClass]
        end
        
        subgraph "Global Symbols"
            direction TB
            GS1[window<br/>- Global object]
            GS2[document<br/>- DOM document]
            GS3[console<br/>- Console object]
        end
    end
    
    SS1 --> RT1
    SS1 --> RT2
    SS2 --> RT3
    
    SS1 --> RG1
    SS2 --> RG2
    SS3 --> RG3
    
    SS1 --> FI1
    SS2 --> FI1
    SS3 --> FI1
    
    GS1 --> FI1
    GS2 --> FI2
    GS3 --> FI3
`;

export const ERROR_HANDLING_ARCHITECTURE = `
graph TB
    subgraph "Error Handling System"
        direction TB
        
        subgraph "Error Detection"
            direction LR
            ED1[Parse Errors<br/>- Syntax errors<br/>- Type errors<br/>- Missing files]
            ED2[Analysis Errors<br/>- Symbol resolution<br/>- Dependency issues<br/>- Pattern detection]
            ED3[Runtime Errors<br/>- Memory issues<br/>- Timeout errors<br/>- Cache failures]
        end
        
        subgraph "Error Classification"
            direction LR
            EC1[Critical<br/>- Analysis failed<br/>- Stop processing]
            EC2[Warning<br/>- Partial analysis<br/>- Continue with warnings]
            EC3[Info<br/>- Non-blocking issues<br/>- Log and continue]
        end
        
        subgraph "Error Recovery"
            direction LR
            ER1[Fallback Strategy<br/>- Use cached results<br/>- Skip problematic files<br/>- Continue analysis]
            ER2[Retry Mechanism<br/>- Exponential backoff<br/>- Max retries: 3<br/>- Circuit breaker]
            ER3[Graceful Degradation<br/>- Disable optional features<br/>- Reduce analysis depth<br/>- Maintain core functionality]
        end
        
        subgraph "Error Reporting"
            direction LR
            EREP1[Console Output<br/>- Real-time logging<br/>- Progress indicators<br/>- Error details]
            EREP2[File Report<br/>- JSON format<br/>- HTML report<br/>- Markdown output]
            EREP3[API Response<br/>- REST API<br/>- GraphQL<br/>- WebSocket]
        end
    end
    
    ED1 --> EC1
    ED2 --> EC2
    ED3 --> EC3
    
    EC1 --> ER1
    EC2 --> ER2
    EC3 --> ER3
    
    ER1 --> EREP1
    ER2 --> EREP2
    ER3 --> EREP3
`;

export const CONFIGURATION_ARCHITECTURE = `
graph TB
    subgraph "Configuration System"
        direction TB
        
        subgraph "Configuration Sources"
            direction LR
            CS1[CLI Arguments<br/>- Command line flags<br/>- Environment variables<br/>- Interactive prompts]
            CS2[Config File<br/>- JSON format<br/>- YAML format<br/>- TypeScript config]
            CS3[Default Values<br/>- Built-in defaults<br/>- Sensible presets<br/>- Platform-specific]
        end
        
        subgraph "Configuration Validation"
            direction LR
            CV1[Type Checking<br/>- Runtime validation<br/>- Schema enforcement<br/>- Type safety]
            CV2[Range Checking<br/>- Numeric ranges<br/>- String patterns<br/>- Enum values]
            CV3[Dependency Checks<br/>- Required configs<br/>- Compatible settings<br/>- Conflicts detection]
        end
        
        subgraph "Configuration Management"
            direction LR
            CM1[Override System<br/>- Command line priority<br/>- Config file precedence<br/>- Environment override]
            CM2[Hot Reload<br/>- Watch config files<br/>- Dynamic updates<br/>- Apply changes]
            CM3[Profile Management<br/>- Development profile<br/>- Production profile<br/>- CI/CD profile]
        end
        
        subgraph "Configuration Storage"
            direction LR
            CSs1[Memory Store<br/>- Runtime config<br/>- In-memory cache<br/>- Quick access]
            CSs2[File System<br/>- Config files<br/>- Local storage<br/>- Persistent config]
            CSs3[Remote Storage<br/>- Database<br/>- Remote API<br/>- Distributed config]
        end
    end
    
    CS1 --> CV1
    CS2 --> CV1
    CS3 --> CV1
    
    CV1 --> CM1
    CV2 --> CM2
    CV3 --> CM3
    
    CM1 --> CSs1
    CM2 --> CSs2
    CM3 --> CSs3
`;

export const FULL_ARCHITECTURE = `
graph TB
    subgraph "Project Analyzer - Complete Architecture"
        direction TB
        
        subgraph "User Interfaces"
            direction LR
            UI1[CLI Tool]
            UI2[Web Dashboard]
            UI3[IDE Plugins]
            UI4[API Client]
        end
        
        subgraph "Project Analyzer Core"
            direction LR
            PA[Project Analyzer<br/>Main Orchestrator]
            Config[Configuration<br/>Manager]
            Monitor[Performance<br/>Monitor]
        end
        
        subgraph "Analysis Engine"
            direction LR
            FA[File Analyzer]
            DA[Dependency Analyzer]
            PD[Pattern Detector]
            ST[Symbol Table]
            DG[Dependency Graph]
        end
        
        subgraph "Infrastructure"
            direction LR
            CM[Cache Manager]
            TS[TypeScript Compiler]
            Progress[Progress Reporter]
            Error[Error Handler]
        end
        
        subgraph "Data Layer"
            direction LR
            Results[Analysis Results]
            Cache[(Cache Storage)]
            Reports[Report Generator]
        end
        
        UI1 --> PA
        UI2 --> PA
        UI3 --> PA
        UI4 --> PA
        
        PA --> Config
        PA --> Monitor
        
        PA --> FA
        PA --> DA
        PA --> PD
        
        FA --> ST
        DA --> DG
        PD --> ST
        
        FA --> CM
        DA --> CM
        PD --> CM
        
        FA --> TS
        DA --> DG
        
        PA --> Progress
        PA --> Error
        
        FA --> Results
        DA --> Results
        PD --> Results
        
        CM --> Cache
        Results --> Reports
        
        Monitor --> Cache
        Error --> Results
    end
`;
