# ECHOWORLD — A Society That Evolves Without a Script

An experimental, research-oriented **MERN + Multi-Agent Simulation** platform modeling **Echo City**—a virtual modern society of 30 autonomous, utility-driven agents operating across **Greenfield**, **MetroCore**, and **NovaDistrict** without a predetermined storyline.

> **Scientific Note:** EchoWorld agents are deterministic-probabilistic state machines driven by utility functions, resource budgets, and private memory buffers. They are **not** conscious or sentient.

---

## Core Features

1. **Echo City (3 Districts, 10 Facility Categories):**
   - **Greenfield** (Residential & Agricultural), **MetroCore** (Business & Commercial), **NovaDistrict** (Technology & Research)
   - Residential blocks, Business Centres, Farms, Research Labs, Hospitals, Schools, Markets, Energy Facilities, Road/Transit Hubs, and Parks.
2. **30 Autonomous Agents (`Agent` + `AgentState` separated schemas):**
   - `4 Entrepreneurs`, `4 Farmers`, `3 Engineers`, `3 Researchers`, `4 Traders`, `3 Healthcare Workers`, `3 Teachers`, `6 General Citizens` (10 per community).
   - Five modular subsystems: **Perception Engine**, **Decision Engine**, **Action Engine**, **Memory Engine**, **Learning & Reflection Engine**.
3. **6-Resource Economy & Zero-Negative Invariant:**
   - Resources: `money` (fictional **Echo Credits `EC`**), `food`, `energy`, `materials`, `knowledge`, `healthcare`.
   - Dynamic supply/demand pricing, peer & market trading, venture creation, infrastructure construction, taxation, and strict transaction logging.
4. **6-Screen Dashboard & 3D City Visualization:**
   - **World Overview:** Interactive Three.js 3D Echo City + live KPI strip + trajectory charts.
   - **Agent Explorer:** Filterable/searchable roster + slide-over Agent Inspector (private memories, personality traits, 5 needs, decision log).
   - **Social Network:** Interactive React Flow trust & trade graph.
   - **Simulation Control:** Start/Pause/Resume/Step/Reset/Speed, Architect World Rules, and Manual Event Injector.
   - **Event Timeline:** Chronological log of environmental shocks & Architect interventions.
   - **Research Laboratory:** Multi-seed A/B trials across 6 empirical questions (Memory On/Off, Cooperation vs. Independence, Resource Scarcity, Personality Diversity, Centralized vs. Decentralized, Event Adaptability).

---

## Windows + VS Code Setup (Zero-Rupee Budget)

### 1. Prerequisites (Free)
- **Node.js LTS** (v20+) — [nodejs.org](https://nodejs.org)
- **VS Code** — [code.visualstudio.com](https://code.visualstudio.com)
- **MongoDB (Optional for persistence):**
  - Install **MongoDB Community Server** locally (`mongodb://127.0.0.1:27017/echoworld`), **OR** use a free **MongoDB Atlas M0** cluster.
  - *Note:* If `MONGO_URI` is left blank, EchoWorld automatically runs with an in-memory fallback store so you can test immediately.

### 2. Installation
```bash
npm install
```
On Windows PowerShell, create your local environment file:
```powershell
Copy-Item .env.example .env
```
The `.env` file is ignored by Git and must stay local.

Edit `.env` if you want to connect MongoDB:
```env
PORT=3000
MONGO_URI="mongodb://127.0.0.1:27017/echoworld"
DEFAULT_WORLD_SEED=2026
```
For MongoDB Atlas, create a database user, add your IP address under **Network Access**, and copy the cluster's `mongodb+srv://` connection string into `MONGO_URI`. Replace its username, password, and cluster host locally; URL-encode special characters in the username or password. Do not put database credentials in frontend code or variables prefixed with `VITE_`.

If `MONGO_URI` is unset, or MongoDB cannot be reached, the server logs the reason and runs in memory-fallback mode. Check the server startup output for a successful MongoDB connection message.

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
To verify database status, open `http://localhost:3000/api/health`. Its `storageMode` is `mongodb` when connected and `memory-fallback` otherwise. If port 3000 is occupied, the server reports that conflict and suggests stopping the other process or changing `PORT` in `.env`.

### 4. Run Automated Tests, Typecheck & Production Build
```bash
npm test
npm run lint
npm run build
```

---

## Free-Tier Deployment Guide
- **Backend + Frontend Combined:** Deploy directly as a single Node.js service (`npm run build` followed by `npm start`) on free-tier hosts such as **Render Free Web Service**, **Railway Trial**, or **Google Cloud Run** free quota.
- **Database:** Pair with **MongoDB Atlas M0 (512 MB Free Tier)** via the `MONGO_URI` environment variable.
- **Zero Paid APIs:** The entire simulation engine runs locally in JavaScript with zero external LLM API costs.
