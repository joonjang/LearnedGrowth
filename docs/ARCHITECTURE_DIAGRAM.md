# LearnedGrowth Architecture Diagram

```mermaid
flowchart LR
  subgraph Client
    UI[Expo Router Screens]
    Hooks[Hooks + Providers]
    Store[Zustand Entries Store]
    Adapter[Entries Adapter]
    SQLite[(SQLite)]
    AIHook[useAbcAi]
    RevenueCat[(RevenueCat SDK)]
  end

  subgraph Supabase
    Auth[Auth]
    EntriesTable[(entries table)]
    EdgeFn[Edge Function: learned-growth]
    Realtime[Realtime: postgres_changes]
    RPC[RPC: use_ai_call / get_ai_config / refresh_ai_cycle]
  end

  OpenAI[(OpenAI Chat Completions)]

  UI --> Hooks --> Store
  Store --> Adapter --> SQLite

  Store -->|sync pull/push| EntriesTable
  EntriesTable -->|realtime updates| Realtime --> Store

  AIHook -->|HTTP/SSE| EdgeFn --> OpenAI
  EdgeFn -->|persist ai_response| EntriesTable

  Hooks --> Auth
  Hooks --> RPC
  UI --> RevenueCat
