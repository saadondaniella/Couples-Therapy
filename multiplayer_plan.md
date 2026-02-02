# 🎮 3D Multiplayer Memory Game – Step-by-Step Plan (Node.js)

This document updates the project plan to include **multiplayer support (1–4 players)** while keeping the scope **reasonable and backend-driven**. It also adds a **clear file structure schema**.

Multiplayer is implemented as **turn-based**, not real-time competitive networking, which keeps complexity low and grading-safe.

---

## 🎯 Multiplayer Overview

* One shared board
* One active player at a time
* Same Memory rules
* Only extra logic is:

  * tracking current player
  * switching turns on mismatch
  * tracking scores per player
---

## 👥 Multiplayer Rules (1–4 Players)

* Player count chosen at game start (1–4)
* Each player has:

  * `id`
  * `color` (red, yellow, blue, green)
  * `score` (matched pairs)
* One active player at a time
* If player finds a match:

  * keeps the turn
  * score increases
* If player fails:

  * turn passes to next player
* Game ends when all pairs are matched
* Winner = highest score (or tie)

---

## 🎨 Visual Multiplayer Concept (Client)

* Scene background color = active player color
* Optional glow / highlight on active player UI
* Card match feedback tinted by player color

⚠️ Visuals always reflect **server state**

---

## 🧠 Updated Game State Design (Server)

```js
{
  gameId,
  cards: [{ id, value, isMatched }],
  flippedCardIds: [],
  lockBoard: false,

  players: [
    { id: 0, color: 'red', score: 0 },
    { id: 1, color: 'blue', score: 0 }
  ],

  activePlayerIndex: 0,
  status: 'playing' | 'won'
}
```

⚠️ Hidden card values are never sent to the client

---

## 🧑‍🤝‍🧑 Responsibility Split (Updated)

### 🎨 T — 3D, Client Logic & Shared Backend

**Frontend / 3D**

* Three.js scene
* Card meshes & grid
* Animations
* Scene color changes per player
* Player UI (scores, active indicator)

**Backend (Shared)**

* Player structure definition
* Board generation
* Shuffle logic
* Multiplayer state design

---

### 🧠 D — Backend Core & Multiplayer Rules

* Turn system logic
* Match / no-match resolution
* Score updates
* Active player switching
* Win detection
* WebSocket server & stability

---

## 🪜 Step-by-Step Implementation Plan

---

## STEP 1 – Project Setup (Together)

* Initialize repo
* Install dependencies (`ws`, `nanoid`)
* Create folder structure
* Define WebSocket message schema

---

## STEP 2 – Game & Player State Creation (T)

### Files

* `/server/game/createGameState.js`

### Tasks

* Generate players based on chosen count
* Assign colors in order: red, yellow, blue, green
* Initialize scores
* Generate and shuffle card pairs

---

## STEP 3 – Multiplayer Rules Engine (D)

### Files

* `/server/game/applyMove.js`

### Tasks

* Validate flip
* Handle second flip
* On match:

  * increment active player score
  * keep turn
* On mismatch:

  * advance activePlayerIndex
* Lock board during resolution

---

## STEP 4 – WebSocket Server & Game Manager (D)

### Files

* `/server/createServer.js`
* `/server/game/gameManager.js`

### Tasks

* Handle `NEW_GAME` (with playerCount)
* Handle `FLIP_CARD`
* Broadcast updated game state

---

## STEP 5 – Three.js Scene Setup (T)

* Camera & lights
* Renderer
* Resize handling

---

## STEP 6 – 3D Card Grid Generation (T)

* Create base card mesh
* Clone per card
* Generate grid positions in code
* Map mesh ↔ cardId

---

## STEP 7 – Client ↔ Server Integration (Both)

* Client sends `FLIP_CARD`
* Server responds with `GAME_STATE`
* Client updates visuals

---

## STEP 8 – Visual Player Feedback (T)

* Change scene background color per active player
* Highlight current player UI
* Color-coded match effects

---

## STEP 9 – Game Completion & Winner (D)

* Detect all pairs matched
* Determine winner(s)
* Send final game state

---

## STEP 10 – Error Handling (Both)

* Invalid cardId
* Input during locked board
* Disconnects

---

## 🗂 File Structure Schema

```
root
├─ index.js
├─ package.json
├─ package-lock.json
├─ .gitignore
│
├─ server
│  ├─ createServer.js
│  ├─ game
│  │  ├─ gameManager.js
│  │  ├─ createGameState.js
│  │  ├─ applyMove.js
│  │  ├─ shuffle.js
│  │
│  └─ utils
│     └─ validate.js
│
├─ public
│  ├─ index.html
│  ├─ style.css
│  ├─ client.js
│  ├─ scene.js
│  ├─ cards.js
│  ├─ animations.js
│  └─ ui.js
│
└─ data (optional)
   └─ highscores.json
```

---

## 📦 Package Usage Summary

### Node.js Core

* **http** – Base server
* **fs** – Optional persistence
* **path** – File safety
* **process** – Runtime state

### External Packages

* **ws** – Real-time multiplayer communication
* **nanoid** – Unique IDs for games/cards

### Frontend

* **three.js** – 3D rendering & animation

---

## ✅ Definition of Done (Updated)

* Turn-based multiplayer (1–4 players)
* Backend-driven rules
* Color-coded active player visuals
* Stable WebSocket communication
* Clean, modular codebase

---


🧩 How the local multiplayer works (in practice)

* User opens the site
* User clicks “2 Players”
* Server creates:
    players = [
    { id: 0, color: 'red', score: 0 },
    { id: 1, color: 'blue', score: 0 }
    ]
* Game starts with activePlayerIndex = 0
* Scene background turns red
* Player flips cards
* On mismatch → server switches active player
* Scene background turns blue
* Repeat until game ends