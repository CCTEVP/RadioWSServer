# Room Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Radio App              Chat App              Game App              │
│  ws://server/           ws://server/          ws://server/          │
│  radioContent           chat                  game                  │
│      │                      │                     │                 │
└──────┼──────────────────────┼─────────────────────┼─────────────────┘
       │                      │                     │
       │                      │                     │
       └──────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (server.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  • HTTP Server (health, /postcontent)                               │
│  • WebSocket Server                                                 │
│  • Room Management (rooms Map)                                      │
│  • Delegates to Room Handlers                                       │
│                                                                      │
│        ┌──────────────────────────────────────────┐                │
│        │       Room Registry (index.js)            │                │
│        │  • Auto-discovers handlers                │                │
│        │  • Maps room name → handler               │                │
│        │  • Provides default handler               │                │
│        └──────────────────────────────────────────┘                │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   BaseRoomHandler        │      │   Room Handlers          │
│   (Abstract Base Class)  │      │   (Concrete Classes)     │
├──────────────────────────┤      ├──────────────────────────┤
│                          │      │                          │
│ Methods (Override):      │◄─────┤ RadioContentHandler     │
│ • onJoin()              │      │   radioContent/          │
│ • onLeave()             │      │   └── index.js           │
│ • onMessage()           │      │                          │
│ • onHttpPost()          │      ├──────────────────────────┤
│ • validateMessage()     │◄─────┤ ChatHandler              │
│ • validateHttpPost()    │      │   chat/                  │
│ • getWelcomeMessage()   │      │   └── index.js           │
│ • getRoomStats()        │      │                          │
│ • onHeartbeat()         │      ├──────────────────────────┤
│                          │◄─────┤ YourCustomHandler        │
└──────────────────────────┘      │   yourRoom/              │
                                  │   └── index.js           │
                                  └──────────────────────────┘

═══════════════════════════════════════════════════════════════════════

                            MESSAGE FLOW

┌─────────────┐
│   Client    │ WebSocket Message
│   (chat)    │─────────────────────┐
└─────────────┘                     │
                                    ▼
                        ┌───────────────────────┐
                        │  Server receives msg  │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────────┐
                        │  Get handler for room "chat"  │
                        └───────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────┐
                        │  ChatHandler.validate()    │
                        │  ✓ Check username          │
                        │  ✓ Check message length    │
                        │  ✓ Filter bad words        │
                        └────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────┐
                        │  ChatHandler.onMessage()   │
                        │  • Add username            │
                        │  • Add timestamp           │
                        │  • Format message          │
                        └────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────┐
                        │  Broadcast to chat room    │
                        │  (only chat members)       │
                        └────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌─────────────┐     ┌─────────────┐   ┌─────────────┐
        │  Client 1   │     │  Client 2   │   │  Client 3   │
        │   (chat)    │     │   (chat)    │   │   (chat)    │
        └─────────────┘     └─────────────┘   └─────────────┘

═══════════════════════════════════════════════════════════════════════

                        HTTP POST FLOW

┌─────────────────┐
│  External API   │ POST /radio/post
│  or Service     │─────────────────────────┐
└─────────────────┘                         │
                                            ▼
                            ┌───────────────────────────┐
                            │  Server receives POST     │
                            └───────────────────────────┘
                                            │
                                            ▼
                            ┌──────────────────────────────────┐
                            │  Get handler for "radioContent"  │
                            └──────────────────────────────────┘
                                            │
                                            ▼
                            ┌────────────────────────────────┐
                            │  RadioContentHandler.validate()│
                            │  ✓ Check required fields       │
                            │  ✓ Validate content.id         │
                            └────────────────────────────────┘
                                            │
                                            ▼
                            ┌────────────────────────────────────┐
                            │  RadioContentHandler.onHttpPost()  │
                            │  • Add room metadata               │
                            │  • Store in content history        │
                            │  • Add tracking info               │
                            └────────────────────────────────────┘
                                            │
                                            ▼
                            ┌────────────────────────────────┐
                            │  Broadcast to radioContent room│
                            │  (only radioContent members)   │
                            └────────────────────────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                ┌─────────────┐     ┌─────────────┐   ┌─────────────┐
                │  Radio App  │     │  Radio App  │   │  Radio App  │
                │  Client 1   │     │  Client 2   │   │  Client 3   │
                └─────────────┘     └─────────────┘   └─────────────┘

═══════════════════════════════════════════════════════════════════════

                    FOLDER STRUCTURE

src/
├── server.js                    ← Main server (delegates to handlers)
│
└── rooms/
    ├── index.js                 ← Room Registry (auto-discovery)
    ├── BaseRoomHandler.js       ← Base class (inheritance)
    │
    ├── radioContent/            ← Your radio content room
    │   └── index.js             ← RadioContentHandler
    │       • Content history
    │       • Validation
    │       • Statistics
    │
    ├── chat/                    ← Example chat room
    │   └── index.js             ← ChatHandler
    │       • User management
    │       • Message filtering
    │       • Typing indicators
    │
    └── yourNewRoom/             ← Your new room (just add folder!)
        └── index.js             ← YourHandler extends BaseRoomHandler
            • Custom logic
            • Custom validation
            • Custom features

═══════════════════════════════════════════════════════════════════════

                    INHERITANCE MODEL

                ┌─────────────────────────┐
                │   BaseRoomHandler       │
                │   (Abstract)            │
                ├─────────────────────────┤
                │ + constructor(name)     │
                │ + onJoin()             │ ← Default implementations
                │ + onLeave()            │
                │ + onMessage()          │
                │ + validateMessage()    │
                │ + getWelcomeMessage()  │
                │ + getRoomStats()       │
                │ + onHeartbeat()        │
                └─────────────────────────┘
                            △
                            │ extends
                ┌───────────┼───────────┐
                │           │           │
    ┌───────────┴─────┐ ┌──┴──────────┴───┐ ┌────────────────┐
    │ RadioContent    │ │ ChatHandler     │ │ YourHandler    │
    │ Handler         │ │                 │ │                │
    ├─────────────────┤ ├─────────────────┤ ├────────────────┤
    │ Override:       │ │ Override:       │ │ Override:      │
    │ • onMessage()   │ │ • validateMsg() │ │ • onJoin()     │
    │ • onHttpPost()  │ │ • onMessage()   │ │ • onMessage()  │
    │ • getWelcome()  │ │ • getWelcome()  │ │ • getRoomStats()│
    │ • getRoomStats()│ │ • onLeave()     │ │ ...            │
    └─────────────────┘ └─────────────────┘ └────────────────┘

═══════════════════════════════════════════════════════════════════════

                    LIFECYCLE DIAGRAM

Client Connection:
    connect → onJoin() → getWelcomeMessage() → ready

Client Message:
    message → validateMessage() → onMessage() → broadcast

HTTP POST:
    POST → validateHttpPost() → onHttpPost() → broadcast

Heartbeat (periodic):
    timer → onHeartbeat() (all active rooms)

Client Disconnect:
    close → onLeave() → cleanup

═══════════════════════════════════════════════════════════════════════
```
