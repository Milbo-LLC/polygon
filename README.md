# Polygon - AI-Powered CAD Platform

> Professional-grade CAD tool powered by AI that enables anyone to create physical products with little domain knowledge.

---

## Executive Summary

Polygon is an AI-agentic CAD platform that guides users through conversational design sessions to generate professional-grade 3D models. The AI agent fills a design specification schema by prompting users with contextual questions, while providing real-time 3D visualization and team collaboration features.

**Core Value Proposition:**
- First-time users can create production-ready designs through guided AI conversations
- Experts get a powerful API and professional export capabilities
- Teams collaborate in real-time with Figma-style multiplayer

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Technical Architecture](#technical-architecture)
3. [Tech Stack Analysis](#tech-stack-analysis)
4. [OCCT Deployment Strategy](#occt-deployment-strategy)
5. [MCP Server Architecture](#mcp-server-architecture)
6. [Phase Breakdown](#phase-breakdown)
7. [Detailed Ticket Structure](#detailed-ticket-structure)
8. [CAD API Design](#cad-api-design)
9. [AI Agent Architecture](#ai-agent-architecture)
10. [Real-Time Collaboration](#real-time-collaboration)
11. [Security & Compliance](#security--compliance)
12. [Infrastructure & DevOps](#infrastructure--devops)

---

## Product Vision

### Target Users

| User Type | Needs | How Polygon Helps |
|-----------|-------|-------------------|
| **First-Time Designers** | Create physical products without CAD knowledge | AI guides through questions, explains constraints |
| **Hobbyist Makers** | Quick iteration on 3D printing projects | Natural language to STL in minutes |
| **Professional Engineers** | Powerful API, enterprise exports (STEP/IGES) | Full parametric control, industry-standard outputs |
| **Design Teams** | Real-time collaboration on shared models | Figma-style multiplayer, version control |

### Product Categories Supported

- **Mechanical/Industrial**: Gears, brackets, enclosures, assemblies with precise tolerances
- **Consumer Products**: Household items, gadgets, decorative objects
- **Parametric Designs**: Models that can be easily modified via parameters

### Export Formats

| Format | Use Case | Priority |
|--------|----------|----------|
| **STEP** | Industry standard, CNC machining | P0 |
| **STL/3MF** | 3D printing | P0 |
| **IGES** | Legacy CAM software | P1 |
| **glTF** | Web visualization | P0 |
| **DXF** | 2D laser cutting | P2 |
| **OBJ** | General 3D interchange | P2 |

---

## Technical Architecture

### System Overview

```
                              CLIENT LAYER
  +---------------------------------------------------------------------------+
  |  Next.js Web App                                                          |
  |  +-- 3D Viewport (Babylon.js)                                             |
  |  +-- AI Chat Interface (Vercel AI SDK + A2UI)                             |
  |  +-- Design Schema Forms (ShadCN + React Hook Form)                       |
  |  +-- Real-time Sync (Yjs + PartyKit)                                      |
  |  +-- Auth (BetterAuth client)                                             |
  +---------------------------------------------------------------------------+
                                      |
                                      | WebSocket + tRPC
                                      v
                              API LAYER
  +---------------------------------------------------------------------------+
  |  Hono API Server (Bun runtime)                                            |
  |  +-- tRPC Router (type-safe client-server)                                |
  |  +-- OpenAPI Spec (for MCP + documentation)                               |
  |  +-- BetterAuth (sessions, OAuth)                                         |
  |  +-- Rate Limiting (Redis)                                                |
  |  +-- Request Validation (Zod)                                             |
  +---------------------------------------------------------------------------+
                                      |
              +-----------------------+-----------------------+
              |                       |                       |
              v                       v                       v
  +---------------------+ +---------------------+ +---------------------------+
  |   MCP Server        | |   CAD Worker        | |   Real-time Server        |
  |   (Separate)        | |   (Python/OCCT)     | |   (PartyKit)              |
  +---------------------+ +---------------------+ +---------------------------+
  | - Tool definitions  | | - B-Rep operations  | | - CRDT sync (Yjs)         |
  | - AI agent context  | | - Boolean ops       | | - Cursor positions        |
  | - Resource access   | | - Export (STEP/STL) | | - Presence awareness      |
  | - Calls main API    | | - Tessellation      | | - Document persistence    |
  +---------------------+ +---------------------+ +---------------------------+
              |                       |                       |
              +-----------------------+-----------------------+
                                      |
                                      v
                              DATA LAYER
  +---------------------------------------------------------------------------+
  |  PostgreSQL (Drizzle ORM)           |  Redis                              |
  |  +-- Users, Teams, Projects         |  +-- Session cache                  |
  |  +-- Design documents (JSONB)       |  +-- Rate limiting                  |
  |  +-- Feature history                |  +-- Job queue (BullMQ)             |
  |  +-- Audit logs                     |  +-- Real-time pub/sub              |
  +---------------------------------------------------------------------------+
  |  Object Storage (S3/R2)                                                   |
  |  +-- Generated models (STEP, STL, glTF)                                   |
  |  +-- Cached tessellations                                                 |
  |  +-- User uploads (reference images, sketches)                            |
  +---------------------------------------------------------------------------+
```

### Data Flow: AI-Guided Design Session

```
User: "I want to create a phone case for iPhone 15"
                    |
                    v
  +---------------------------------------------------------------------------+
  |  1. AI AGENT PROCESSES REQUEST                                            |
  |     - Identifies design type: "enclosure/case"                            |
  |     - Loads schema: PhoneCaseSchema                                       |
  |     - Determines missing fields: dimensions, thickness, features          |
  +---------------------------------------------------------------------------+
                    |
                    v
  +---------------------------------------------------------------------------+
  |  2. AI ASKS CLARIFYING QUESTIONS (via A2UI forms)                         |
  |     Q: "What material thickness? (1.5mm recommended for TPU)"             |
  |     Q: "Include camera cutout?" [Yes/No/Custom]                           |
  |     Q: "Add grip texture?" [None/Dots/Lines/Custom]                       |
  +---------------------------------------------------------------------------+
                    |
                    v
  +---------------------------------------------------------------------------+
  |  3. SCHEMA FILLED -> CAD GENERATION                                       |
  |     - AI calls MCP tools: create_box, shell, cut_opening, add_fillet      |
  |     - CAD Worker executes operations via OCCT                             |
  |     - Returns tessellated mesh for preview                                |
  +---------------------------------------------------------------------------+
                    |
                    v
  +---------------------------------------------------------------------------+
  |  4. REAL-TIME PREVIEW + ITERATION                                         |
  |     - 3D model displayed in viewport                                      |
  |     - User: "Make the corners more rounded"                               |
  |     - AI: Increases fillet radius, regenerates                            |
  +---------------------------------------------------------------------------+
                    |
                    v
  +---------------------------------------------------------------------------+
  |  5. EXPORT                                                                |
  |     - User selects format (STL for 3D printing)                           |
  |     - CAD Worker generates high-quality export                            |
  |     - File stored in S3, download link provided                           |
  +---------------------------------------------------------------------------+
```

---

## Tech Stack Analysis

### Your Proposed Stack: Verdict

| Tool | Verdict | Reasoning |
|------|---------|-----------|
| **TypeScript** | KEEP | Industry standard, type safety essential for complex CAD logic |
| **Turborepo** | KEEP | Excellent for monorepo, caching saves CI time |
| **Next.js** | KEEP | Best for web app, great DX, handles SSR/ISR well |
| **Hono** | KEEP (with caveats) | Lightweight is good, but CAD ops are CPU-bound - see note |
| **BetterAuth** | KEEP | Modern, flexible, works well with Hono |
| **tRPC** | KEEP | Type-safe API calls, excellent DX |
| **ShadCN** | KEEP | Beautiful, accessible, customizable |
| **Tailwind** | KEEP | Pairs perfectly with ShadCN |
| **PostgreSQL + Drizzle** | KEEP | Rock solid, Drizzle is lightweight and fast |
| **Bun** | KEEP | Fast runtime, good for Hono |
| **Railway** | KEEP | Simple deployment, good for early stages |
| **Doppler** | ADD | Essential for secrets management at enterprise scale |
| **Husky** | RECONSIDER | Use Lefthook instead - faster, no npm postinstall issues |
| **GitHub Actions** | KEEP | Standard CI/CD, integrates with everything |
| **Linear** | KEEP | Best issue tracker for eng teams |
| **PostHog** | KEEP | Product analytics + session replay |
| **Sentry** | KEEP | Worth the cost for error tracking |
| **Stripe** | KEEP | Industry standard for payments |
| **BullMQ + Redis** | KEEP | Essential for CAD job queue |
| **BetterStack + Winston** | SIMPLIFY | Use Axiom instead - simpler, better DX, free tier |
| **OpenAPI** | KEEP | Required for MCP server auto-generation |
| **OpenAI** | KEEP (start here) | Good for MVP, abstract for multi-provider later |

### Critical Addition: CAD Kernel Stack

| Tool | Purpose | Why |
|------|---------|-----|
| **Python + CadQuery 2.0** | CAD operations | OCCT bindings, parametric modeling |
| **FastAPI** | CAD Worker API | Async, fast, Python-native |
| **opencascade.js** | Client preview (optional) | Light ops in browser if needed |
| **Babylon.js** | 3D viewport | Better than Three.js for production CAD |
| **Yjs** | CRDT sync | Battle-tested, used by major collab tools |
| **PartyKit** | Real-time server | Handles Yjs persistence, scales on Cloudflare |

### Hono Note: CPU-Bound Operations

Hono is excellent for I/O-bound work but CAD operations are CPU-intensive. Architecture:
- **Hono API**: Handles HTTP, auth, routing, light operations
- **Python CAD Worker**: Handles heavy OCCT operations via BullMQ jobs
- **Separation**: Keeps API responsive while CAD operations run async

### Final Recommended Stack

```
MONOREPO (Turborepo)
+-- apps/
|   +-- web/                 # Next.js 15 + React 19
|   +-- api/                 # Hono + tRPC + BetterAuth
|   +-- cad-worker/          # Python + FastAPI + CadQuery
|   +-- mcp-server/          # TypeScript MCP server
|   +-- realtime/            # PartyKit server
+-- packages/
    +-- db/                  # Drizzle schema + migrations
    +-- ui/                  # ShadCN components
    +-- cad-types/           # Shared CAD type definitions
    +-- ai-schemas/          # Design specification schemas
    +-- config/              # Shared ESLint, TypeScript configs
```

---

## OCCT Deployment Strategy

### Recommendation: Hybrid Architecture (Server-Heavy)

Based on your requirements (professional-grade, all export formats, small team), here's the optimal approach:

```
                         OCCT DEPLOYMENT STRATEGY

  BROWSER (Light operations)          SERVER (Heavy operations)
  +-------------------------+         +-------------------------------+
  | Babylon.js              |         | Python + CadQuery 2.0         |
  | - Render tessellated    |  <----- | - All B-Rep operations        |
  |   meshes (glTF)         |  mesh   | - Boolean operations          |
  | - Camera controls       |         | - Fillets, chamfers           |
  | - Selection/picking     |         | - Export (STEP, STL, IGES)    |
  | - Measurement tools     |         | - Tessellation                |
  |                         |         | - Shape healing               |
  | Optional:               |         |                               |
  | - opencascade.js for    |         | Deployed on:                  |
  |   simple client-side    |         | - Railway (container)         |
  |   geometry preview      |         | - 2-4 GB RAM minimum          |
  +-------------------------+         | - Multi-core for parallel ops |
                                      +-------------------------------+
```

### Why Server-Side Heavy?

1. **Bundle Size**: opencascade.js is 13-50MB - unacceptable for cold start UX
2. **Memory Management**: JavaScript lacks proper OCCT memory cleanup
3. **Consistency**: Server guarantees identical geometry across all users
4. **Export Quality**: Server-side STEP export is lossless
5. **Simplicity**: One environment to debug vs browser quirks

### CAD Worker Architecture

```python
# apps/cad-worker/main.py (FastAPI + CadQuery)

from fastapi import FastAPI
from cadquery import Workplane
import json

app = FastAPI()

@app.post("/operations/box")
async def create_box(length: float, width: float, height: float):
    """Create a box primitive"""
    result = Workplane("XY").box(length, width, height)
    return export_to_gltf(result)

@app.post("/operations/fillet")
async def add_fillet(model_id: str, radius: float, edges: list[str]):
    """Add fillet to specified edges"""
    model = load_model(model_id)
    result = model.edges(edges).fillet(radius)
    return export_to_gltf(result)

@app.post("/export")
async def export_model(model_id: str, format: str):
    """Export model to specified format"""
    model = load_model(model_id)
    if format == "step":
        return export_to_step(model)
    elif format == "stl":
        return export_to_stl(model)
    # ... other formats
```

### Performance Optimizations

1. **Caching**: Hash operations -> cache tessellated results in Redis
2. **Lazy Tessellation**: Only tessellate visible parts at current zoom
3. **LOD**: Multiple tessellation levels (coarse for interaction, fine for export)
4. **Parallel Workers**: Scale CadQuery workers horizontally

---

## MCP Server Architecture

### Recommendation: Separate Service

Based on MCP best practices and your requirement for AI agent integration:

```
                         MCP SERVER ARCHITECTURE

  AI Agent (Claude/GPT)
         |
         | MCP Protocol (JSON-RPC 2.0)
         v
  +-----------------------------------------------------------------------+
  |                    MCP SERVER (Separate Service)                      |
  |                                                                       |
  |  TOOLS (AI can call these)                                            |
  |  +-- create_sketch(plane, shapes)                                     |
  |  +-- extrude(sketch_id, distance, direction)                          |
  |  +-- revolve(sketch_id, axis, angle)                                  |
  |  +-- boolean_union(body_a, body_b)                                    |
  |  +-- boolean_subtract(body_a, body_b)                                 |
  |  +-- add_fillet(body_id, edges, radius)                               |
  |  +-- add_chamfer(body_id, edges, distance)                            |
  |  +-- shell(body_id, thickness, faces_to_remove)                       |
  |  +-- export(body_id, format)                                          |
  |  +-- get_model_info(body_id)                                          |
  |                                                                       |
  |  RESOURCES (AI can read these)                                        |
  |  +-- design://schema/{design_type}                                    |
  |  +-- design://current/bodies                                          |
  |  +-- design://current/sketches                                        |
  |  +-- design://templates/{template_name}                               |
  |                                                                       |
  |  PROMPTS (Pre-built workflows)                                        |
  |  +-- design_phone_case                                                |
  |  +-- design_enclosure                                                 |
  |  +-- optimize_for_3d_printing                                         |
  +-----------------------------------------------------------------------+
         |
         | REST/gRPC calls
         v
  +-----------------------------------------------------------------------+
  |                         MAIN API (Hono)                               |
  |  - Authentication                                                     |
  |  - Rate limiting                                                      |
  |  - Audit logging                                                      |
  |  - Job queuing                                                        |
  +-----------------------------------------------------------------------+
         |
         v
  +-----------------------------------------------------------------------+
  |                      CAD WORKER (Python/OCCT)                         |
  +-----------------------------------------------------------------------+
```

### Why Separate MCP Server?

1. **AI-Specific Concerns**: Rate limiting, context management, tool filtering
2. **Security Boundary**: MCP server can have restricted permissions
3. **Scalability**: Scale MCP independently from main API
4. **Testing**: Easier to test AI interactions in isolation
5. **Multi-Agent**: Multiple AI providers can connect to same MCP server

### MCP Tool Definition Example

```typescript
// apps/mcp-server/tools/extrude.ts
import { z } from 'zod';

export const extrudeTool = {
  name: 'extrude',
  description: `
    Extrude a 2D sketch into a 3D body.

    WHEN TO USE:
    - Converting a flat sketch into a solid shape
    - Creating the base of a part
    - Adding material to an existing body

    EXAMPLE:
    - Sketch a rectangle, extrude 10mm -> box
    - Sketch a circle, extrude 50mm -> cylinder
  `,
  inputSchema: z.object({
    sketch_id: z.string().describe('ID of the sketch to extrude'),
    distance: z.number().positive().describe('Extrusion distance in mm'),
    direction: z.enum(['up', 'down', 'both']).default('up'),
    operation: z.enum(['new_body', 'join', 'cut']).default('new_body'),
  }),
  handler: async (params) => {
    const result = await cadApi.extrude(params);
    return {
      content: [{
        type: 'text',
        text: `Created body ${result.body_id} by extruding sketch ${params.sketch_id} by ${params.distance}mm`,
      }],
      metadata: { body_id: result.body_id },
    };
  },
};
```

---

## Phase Breakdown

### Overview: Ship Early, Ship Often

```
PHASE 0: Foundation (Weeks 1-3)
    | Deploy: Empty monorepo with CI/CD
    v
PHASE 1: Core CAD (Weeks 4-8)
    | Deploy: Basic CAD operations via API
    v
PHASE 2: AI Agent MVP (Weeks 9-13)
    | Deploy: Chat-driven design with MCP
    v
PHASE 3: Collaboration (Weeks 14-18)
    | Deploy: Real-time multiplayer
    v
PHASE 4: Professional Features (Weeks 19-24)
    | Deploy: Enterprise features, compliance
    v
PHASE 5: Scale & Polish (Weeks 25+)
    | Deploy: Performance, advanced AI
```

---

## Detailed Ticket Structure

### PHASE 0: Foundation (Weeks 1-3)

**Goal**: Deployable monorepo with all infrastructure in place

---

#### P0-1: Initialize Turborepo Monorepo

**Title**: Initialize Turborepo monorepo structure
**Priority**: P0
**Labels**: infrastructure, foundation

**Description**:
Set up the base monorepo structure with Turborepo.

**Acceptance Criteria**:
- [ ] Turborepo initialized with bun workspaces
- [ ] apps/ directory created (web, api, cad-worker, mcp-server)
- [ ] packages/ directory created (db, ui, cad-types, config)
- [ ] Root package.json with workspace scripts
- [ ] turbo.json configured with proper task dependencies
- [ ] .gitignore properly configured

**Technical Notes**:
- Use bun as package manager (faster than npm/yarn)
- Configure turbo remote caching from day 1

---

#### P0-2: Set Up Next.js Web App

**Title**: Initialize Next.js 15 web application
**Priority**: P0
**Labels**: web, foundation

**Description**:
Create the web app with Next.js 15, React 19, ShadCN, and Tailwind.

**Acceptance Criteria**:
- [ ] Next.js 15 with App Router
- [ ] Tailwind CSS configured
- [ ] ShadCN UI installed with base components
- [ ] Basic layout with header/sidebar
- [ ] Health check page at /health
- [ ] Environment variables configured

**Deploy Gate**:
- App accessible at polygon-web.up.railway.app
- Health check returns 200

---

#### P0-3: Set Up Hono API Server

**Title**: Initialize Hono API server with tRPC
**Priority**: P0
**Labels**: api, foundation

**Description**:
Create the main API server with Hono, tRPC, and basic middleware.

**Acceptance Criteria**:
- [ ] Hono server with Bun runtime
- [ ] tRPC router integrated
- [ ] CORS configured
- [ ] Health check endpoint
- [ ] Request logging middleware
- [ ] Error handling middleware

**Deploy Gate**:
- API accessible at polygon-api.up.railway.app
- Health check returns 200
- tRPC endpoint responds

---

#### P0-4: Database Setup

**Title**: Set up PostgreSQL with Drizzle ORM
**Priority**: P0
**Labels**: database, foundation

**Description**:
Configure PostgreSQL on Railway with Drizzle schema.

**Acceptance Criteria**:
- [ ] PostgreSQL instance on Railway
- [ ] Drizzle ORM configured in packages/db
- [ ] Base schema: users, sessions tables
- [ ] Migration system working
- [ ] Connection pooling configured
- [ ] Seeding script for development

**Deploy Gate**:
- Can connect to prod database
- Migrations run successfully

---

#### P0-5: Redis Setup

**Title**: Set up Redis for caching and queues
**Priority**: P0
**Labels**: infrastructure, foundation

**Description**:
Configure Redis on Railway for session cache, rate limiting, and job queue.

**Acceptance Criteria**:
- [ ] Redis instance on Railway
- [ ] Connection helper in packages/db
- [ ] BullMQ configured for job queue
- [ ] Rate limiting middleware using Redis
- [ ] Session storage configured

**Deploy Gate**:
- Can connect to Redis from API
- BullMQ can enqueue/dequeue jobs

---

#### P0-6: Authentication

**Title**: Implement BetterAuth with OAuth
**Priority**: P0
**Labels**: auth, foundation

**Description**:
Set up BetterAuth with email/password and GitHub OAuth.

**Acceptance Criteria**:
- [ ] BetterAuth configured in API
- [ ] Email/password registration and login
- [ ] GitHub OAuth integration
- [ ] Session management with Redis
- [ ] Protected route middleware
- [ ] Auth hooks in web app

**Deploy Gate**:
- Can register new user
- Can login with credentials
- Can login with GitHub
- Sessions persist correctly

---

#### P0-7: CI/CD Pipeline

**Title**: Set up GitHub Actions CI/CD
**Priority**: P0
**Labels**: devops, foundation

**Description**:
Configure CI/CD with GitHub Actions and Railway deployment.

**Acceptance Criteria**:
- [ ] Lint job (ESLint, Prettier)
- [ ] Type check job (tsc)
- [ ] Test job (Vitest)
- [ ] Build job
- [ ] Deploy to Railway on main push
- [ ] Preview deployments on PR
- [ ] Lefthook for pre-commit hooks

**Deploy Gate**:
- All checks pass on main
- Auto-deploy works

---

#### P0-8: Secrets Management

**Title**: Set up Doppler for secrets management
**Priority**: P0
**Labels**: security, foundation

**Description**:
Configure Doppler for centralized secrets management.

**Acceptance Criteria**:
- [ ] Doppler project created
- [ ] Environments: dev, staging, prod
- [ ] All secrets migrated from .env files
- [ ] Railway integration configured
- [ ] Local development setup documented
- [ ] Secret rotation policy documented

**Deploy Gate**:
- All services use Doppler secrets
- No secrets in git

---

### PHASE 1: Core CAD (Weeks 4-8)

**Goal**: Working CAD operations via API, visualized in browser

---

#### P1-1: Python CAD Worker Setup

**Title**: Initialize Python CAD worker with CadQuery
**Priority**: P0
**Labels**: cad, backend

**Description**:
Set up the Python CAD worker service with CadQuery/OCCT.

**Acceptance Criteria**:
- [ ] FastAPI server structure
- [ ] CadQuery 2.0 installed
- [ ] Docker container for deployment
- [ ] Health check endpoint
- [ ] Basic logging configured
- [ ] Connected to BullMQ for job processing

**Deploy Gate**:
- Worker running on Railway
- Health check returns 200
- Can process test job

---

#### P1-2: Core Geometry Operations

**Title**: Implement core geometry primitives
**Priority**: P0
**Labels**: cad, api

**Description**:
Implement basic 3D primitive operations.

**Acceptance Criteria**:
- [ ] create_box(length, width, height)
- [ ] create_cylinder(radius, height)
- [ ] create_sphere(radius)
- [ ] create_cone(radius1, radius2, height)
- [ ] All return glTF mesh for preview
- [ ] All store B-Rep for later operations
- [ ] API endpoints in Hono
- [ ] tRPC types defined

**Test Cases**:
- Create box returns valid glTF
- Box dimensions match input
- Stored B-Rep can be retrieved

---

#### P1-3: Boolean Operations

**Title**: Implement boolean operations
**Priority**: P0
**Labels**: cad, api

**Description**:
Implement CSG boolean operations.

**Acceptance Criteria**:
- [ ] boolean_union(body_a, body_b)
- [ ] boolean_subtract(body_a, body_b)
- [ ] boolean_intersect(body_a, body_b)
- [ ] Error handling for invalid operations
- [ ] Result stored as new body

**Test Cases**:
- Union of two boxes creates larger box
- Subtract creates hole
- Invalid geometries return clear error

---

#### P1-4: Feature Operations

**Title**: Implement feature operations
**Priority**: P0
**Labels**: cad, api

**Description**:
Implement common CAD features.

**Acceptance Criteria**:
- [ ] add_fillet(body_id, edges, radius)
- [ ] add_chamfer(body_id, edges, distance)
- [ ] shell(body_id, thickness, faces_to_remove)
- [ ] offset_face(body_id, face, distance)
- [ ] Edge/face selection by index

**Test Cases**:
- Fillet all edges of box
- Shell box to create hollow enclosure
- Chamfer specific edges

---

#### P1-5: 2D Sketching System

**Title**: Implement 2D sketch system
**Priority**: P0
**Labels**: cad, api

**Description**:
Implement 2D sketch primitives for extrusion.

**Acceptance Criteria**:
- [ ] create_sketch(plane)
- [ ] add_line(sketch_id, start, end)
- [ ] add_arc(sketch_id, center, radius, start_angle, end_angle)
- [ ] add_circle(sketch_id, center, radius)
- [ ] add_rectangle(sketch_id, corner, width, height)
- [ ] add_polygon(sketch_id, points)
- [ ] Sketch validation (closed profiles)

**Test Cases**:
- Sketch with rectangle is valid
- Sketch with open path returns error
- Complex sketch with multiple profiles works

---

#### P1-6: Extrude and Revolve

**Title**: Implement extrude and revolve operations
**Priority**: P0
**Labels**: cad, api

**Description**:
Convert 2D sketches to 3D bodies.

**Acceptance Criteria**:
- [ ] extrude(sketch_id, distance, direction)
- [ ] extrude_cut(sketch_id, body_id, distance)
- [ ] revolve(sketch_id, axis, angle)
- [ ] sweep(sketch_id, path)
- [ ] loft(sketch_ids[])

**Test Cases**:
- Extrude circle creates cylinder
- Revolve half-circle creates sphere
- Extrude cut creates hole through body

---

#### P1-7: Export System

**Title**: Implement export to multiple formats
**Priority**: P0
**Labels**: cad, api

**Description**:
Export bodies to industry-standard formats.

**Acceptance Criteria**:
- [ ] export_step(body_id) -> .step file
- [ ] export_stl(body_id, tolerance) -> .stl file
- [ ] export_3mf(body_id) -> .3mf file
- [ ] export_gltf(body_id) -> .gltf file
- [ ] Files uploaded to S3/R2
- [ ] Signed download URLs generated

**Test Cases**:
- STEP file opens in Fusion 360
- STL file opens in PrusaSlicer
- glTF file renders in Three.js viewer

---

#### P1-8: 3D Viewport Component

**Title**: Implement Babylon.js 3D viewport
**Priority**: P0
**Labels**: web, frontend

**Description**:
Create the main 3D viewport component.

**Acceptance Criteria**:
- [ ] Babylon.js scene setup
- [ ] Load glTF models from API
- [ ] Orbit camera controls
- [ ] Grid/axis visualization
- [ ] Object selection (click to select)
- [ ] Selection highlight
- [ ] Responsive to container size
- [ ] Performance: 60fps with 10k triangles

**Test Cases**:
- Can load and display box
- Can rotate camera around model
- Can select individual bodies

---

#### P1-9: Model Storage System

**Title**: Implement model storage and retrieval
**Priority**: P0
**Labels**: api, database

**Description**:
Store CAD models in database with S3 for files.

**Acceptance Criteria**:
- [ ] projects table schema
- [ ] bodies table schema (stores B-Rep reference)
- [ ] sketches table schema
- [ ] features table schema (operation history)
- [ ] S3 bucket for model files
- [ ] File upload/download APIs
- [ ] Project CRUD endpoints

**Database Schema**:
```sql
projects: id, name, user_id, created_at, updated_at
bodies: id, project_id, name, brep_file_key, gltf_file_key
sketches: id, project_id, plane, shapes_json
features: id, project_id, type, params_json, order, body_id
```

---

#### P1-10: Design Project UI

**Title**: Implement design project interface
**Priority**: P0
**Labels**: web, frontend

**Description**:
Create the main design project page with viewport and tools.

**Acceptance Criteria**:
- [ ] Project page at /projects/[id]
- [ ] Left sidebar: feature tree
- [ ] Center: 3D viewport
- [ ] Right sidebar: properties panel
- [ ] Top toolbar: common tools
- [ ] Create new project flow
- [ ] Project list page at /projects

**UI Flow**:
1. User creates new project
2. Project opens with empty viewport
3. User can add primitives from toolbar
4. Feature tree shows operation history

---

### PHASE 2: AI Agent MVP (Weeks 9-13)

**Goal**: Chat-driven design with AI agent using MCP

---

#### P2-1: MCP Server Foundation

**Title**: Initialize MCP server with basic tools
**Priority**: P0
**Labels**: ai, mcp

**Description**:
Create the MCP server that exposes CAD operations to AI.

**Acceptance Criteria**:
- [ ] MCP server using TypeScript SDK
- [ ] HTTP+SSE transport configured
- [ ] Authentication with API tokens
- [ ] Basic tools registered (create_box, extrude)
- [ ] Health check and capability listing
- [ ] Error handling with isError flag

**Deploy Gate**:
- MCP server running at polygon-mcp.up.railway.app
- Can list tools via MCP protocol

---

#### P2-2: Complete MCP Tool Set

**Title**: Expose all CAD operations as MCP tools
**Priority**: P0
**Labels**: ai, mcp

**Description**:
Register all CAD operations as MCP tools with rich descriptions.

**Acceptance Criteria**:
- [ ] All geometry primitives as tools
- [ ] All boolean operations as tools
- [ ] All feature operations as tools
- [ ] Sketch operations as tools
- [ ] Export operations as tools
- [ ] Each tool has detailed description
- [ ] Each tool has examples in description
- [ ] Input schemas use Zod with descriptions

**Tool List**:
- create_box, create_cylinder, create_sphere, create_cone
- boolean_union, boolean_subtract, boolean_intersect
- add_fillet, add_chamfer, shell
- create_sketch, add_rectangle, add_circle, add_line
- extrude, extrude_cut, revolve
- export_step, export_stl, export_gltf

---

#### P2-3: MCP Resources

**Title**: Implement MCP resources for AI context
**Priority**: P1
**Labels**: ai, mcp

**Description**:
Add resources that AI can read for context.

**Acceptance Criteria**:
- [ ] design://current/bodies - list all bodies in project
- [ ] design://current/sketches - list all sketches
- [ ] design://current/features - feature history
- [ ] design://schema/{type} - design schemas
- [ ] design://templates - available templates

**Resources provide AI with**:
- Current state of the design
- What operations have been performed
- What the user is trying to build

---

#### P2-4: Design Schema System

**Title**: Create design specification schemas
**Priority**: P0
**Labels**: ai, schema

**Description**:
Define schemas that AI fills through conversation.

**Acceptance Criteria**:
- [ ] Base DesignSchema interface
- [ ] PhoneCaseSchema extends DesignSchema
- [ ] EnclosureSchema extends DesignSchema
- [ ] GearSchema extends DesignSchema
- [ ] BracketSchema extends DesignSchema
- [ ] Schema stored in packages/ai-schemas
- [ ] Schema includes required/optional fields
- [ ] Schema includes field descriptions

**Example Schema**:
```typescript
interface PhoneCaseSchema extends DesignSchema {
  device: { model: string; dimensions: Dimensions };
  caseThickness: number; // mm
  cameraOpenings: CameraOpening[];
  portOpenings: PortOpening[];
  texture: 'none' | 'dots' | 'lines' | 'custom';
  cornerRadius: number; // mm
}
```

---

#### P2-5: AI Chat Interface

**Title**: Implement AI chat interface with streaming
**Priority**: P0
**Labels**: web, ai

**Description**:
Create the chat interface for AI-guided design.

**Acceptance Criteria**:
- [ ] Chat panel component
- [ ] Message list with user/AI messages
- [ ] Streaming response display
- [ ] Markdown rendering in messages
- [ ] Code block rendering
- [ ] Model preview in messages (glTF embed)
- [ ] Input with send button
- [ ] Loading states

**UI Components**:
- ChatPanel
- MessageList
- Message (with variants for user/ai)
- ModelPreview (inline 3D preview)
- ChatInput

---

#### P2-6: AI Agent Integration

**Title**: Integrate OpenAI with Vercel AI SDK
**Priority**: P0
**Labels**: ai, api

**Description**:
Set up AI agent that uses MCP tools.

**Acceptance Criteria**:
- [ ] Vercel AI SDK configured
- [ ] OpenAI GPT-4o model configured
- [ ] System prompt for CAD assistant
- [ ] Tool calls execute via MCP
- [ ] Streaming responses to client
- [ ] Conversation history management
- [ ] Token usage tracking

**System Prompt (abbreviated)**:
```
You are a CAD design assistant. Your job is to help users
create 3D models by asking questions and executing CAD operations.

When a user describes what they want to build:
1. Identify the design type
2. Ask clarifying questions to fill the design schema
3. Execute CAD operations to build the model
4. Show previews and iterate based on feedback
```

---

#### P2-7: A2UI Form Integration

**Title**: Integrate A2UI for dynamic forms in chat
**Priority**: P1
**Labels**: web, ai

**Description**:
Use A2UI or similar for structured input collection.

**Acceptance Criteria**:
- [ ] Dynamic form components in chat
- [ ] Radio/checkbox groups for options
- [ ] Number inputs with units
- [ ] Dimension inputs (L x W x H)
- [ ] Form responses sent to AI
- [ ] Form state persisted in conversation

**Example Flow**:
```
AI: "What thickness for the case?"
[Form: Slider 0.5-3mm, default 1.5mm]
User selects 2mm
AI receives: { caseThickness: 2 }
```

---

#### P2-8: Design Intent Extraction

**Title**: Implement design intent extraction
**Priority**: P1
**Labels**: ai, api

**Description**:
AI extracts structured intent from natural language.

**Acceptance Criteria**:
- [ ] Intent classification (what type of design?)
- [ ] Entity extraction (dimensions, materials)
- [ ] Constraint extraction (must fit, must hold)
- [ ] Intent stored in project metadata
- [ ] Intent influences schema selection

**Example**:
```
Input: "I need a case for my iPhone 15 that protects the camera"
Extracted:
- type: phone_case
- device: iPhone 15
- features: [camera_protection]
- constraints: []
```

---

#### P2-9: Iterative Refinement Flow

**Title**: Implement design refinement based on feedback
**Priority**: P0
**Labels**: ai, cad

**Description**:
Allow users to request changes and AI updates model.

**Acceptance Criteria**:
- [ ] AI can modify existing bodies
- [ ] AI understands "make it bigger/smaller"
- [ ] AI can add/remove features
- [ ] Change history tracked
- [ ] Can undo to previous version
- [ ] Preview before/after comparison

**Example Flow**:
```
User: "Make the corners more rounded"
AI: Identifies fillet operation, increases radius
AI: Shows before/after preview
User: "Perfect"
AI: Commits change
```

---

#### P2-10: AI Error Recovery

**Title**: Implement AI error handling and recovery
**Priority**: P1
**Labels**: ai, reliability

**Description**:
Handle CAD operation failures gracefully.

**Acceptance Criteria**:
- [ ] CAD errors returned to AI with context
- [ ] AI can retry with adjusted parameters
- [ ] AI explains failures to user
- [ ] Fallback to simpler operations
- [ ] Log failed attempts for improvement

**Error Types**:
- Invalid geometry (self-intersecting)
- Operation failed (fillet too large)
- Missing dependencies (sketch not closed)

---

### PHASE 3: Collaboration (Weeks 14-18)

**Goal**: Real-time multiplayer with Figma-style collaboration

---

#### P3-1: PartyKit Server Setup

**Title**: Initialize PartyKit real-time server
**Priority**: P0
**Labels**: realtime, infrastructure

**Description**:
Set up PartyKit for real-time collaboration.

**Acceptance Criteria**:
- [ ] PartyKit project created
- [ ] Yjs persistence configured
- [ ] Authentication integration
- [ ] Room per project
- [ ] Health monitoring
- [ ] Deployed to Cloudflare

**Deploy Gate**:
- Can connect to PartyKit room
- Yjs sync works between two browsers

---

#### P3-2: Yjs Document Structure

**Title**: Design Yjs document structure for CAD
**Priority**: P0
**Labels**: realtime, architecture

**Description**:
Define how CAD state is represented in Yjs.

**Acceptance Criteria**:
- [ ] Document structure defined
- [ ] Bodies as Y.Map
- [ ] Sketches as Y.Map
- [ ] Feature history as Y.Array
- [ ] Selection state as Y.Map
- [ ] Types exported for TypeScript

**Document Structure**:
```typescript
{
  bodies: Y.Map<BodyState>,
  sketches: Y.Map<SketchState>,
  features: Y.Array<FeatureOperation>,
  selections: Y.Map<{userId: string, bodyIds: string[]}>,
  cursors: Y.Map<{userId: string, position: Vector3}>
}
```

---

#### P3-3: Real-Time Sync Integration

**Title**: Integrate Yjs sync in web app
**Priority**: P0
**Labels**: web, realtime

**Description**:
Connect web app to PartyKit for real-time sync.

**Acceptance Criteria**:
- [ ] Yjs provider connected to PartyKit
- [ ] Local changes sync to server
- [ ] Remote changes update local state
- [ ] Offline edits queue and sync
- [ ] Connection status indicator
- [ ] Reconnection handling

**Test Cases**:
- Two browsers see same state
- Offline edit syncs on reconnect
- Rapid edits don't cause conflicts

---

#### P3-4: Cursor Presence

**Title**: Implement cursor presence awareness
**Priority**: P1
**Labels**: web, realtime

**Description**:
Show other users' cursor positions in 3D viewport.

**Acceptance Criteria**:
- [ ] Cursor position broadcast via Yjs
- [ ] 3D cursor indicators for other users
- [ ] User name labels on cursors
- [ ] Cursor color per user
- [ ] Smooth cursor interpolation
- [ ] Cursors hidden when inactive

**UI**:
- Small sphere at cursor position in 3D space
- User avatar/name floating above
- Different color per user

---

#### P3-5: Selection Sync

**Title**: Sync selection state across users
**Priority**: P1
**Labels**: web, realtime

**Description**:
Show what other users have selected.

**Acceptance Criteria**:
- [ ] Selection broadcast via Yjs
- [ ] Selection highlight per user
- [ ] Lock indicator when editing
- [ ] Selection conflict handling
- [ ] "Following" mode (view what another user sees)

**UI**:
- Selected objects have colored outline per user
- Lock icon when someone is editing
- "View is following [User]" indicator

---

#### P3-6: Operation Conflict Resolution

**Title**: Handle conflicting CAD operations
**Priority**: P0
**Labels**: realtime, cad

**Description**:
Resolve conflicts when two users modify same geometry.

**Acceptance Criteria**:
- [ ] Last-writer-wins for simple conflicts
- [ ] Operation ordering via Lamport timestamps
- [ ] Conflict detection for destructive ops
- [ ] Conflict resolution UI
- [ ] Operations are atomic

**Conflict Scenarios**:
- Two users fillet same edge -> last wins
- User deletes body another is editing -> notify
- Concurrent feature additions -> both preserved

---

#### P3-7: Team Management

**Title**: Implement team and permissions system
**Priority**: P0
**Labels**: api, teams

**Description**:
Allow team creation and member management.

**Acceptance Criteria**:
- [ ] teams table schema
- [ ] team_members table schema
- [ ] Create team flow
- [ ] Invite members via email
- [ ] Role-based permissions (admin, editor, viewer)
- [ ] Team settings page

**Roles**:
- Owner: full control, billing
- Admin: manage members, projects
- Editor: create and edit projects
- Viewer: view-only access

---

#### P3-8: Project Sharing

**Title**: Implement project sharing controls
**Priority**: P0
**Labels**: api, web

**Description**:
Allow sharing projects with team members.

**Acceptance Criteria**:
- [ ] Project belongs to team or personal
- [ ] Share project with team
- [ ] Per-project permissions
- [ ] Public view-only links
- [ ] Embed viewer links

**Share Modes**:
- Private (only owner)
- Team (team members)
- Link (anyone with link, view-only)
- Public (discoverable)

---

#### P3-9: Activity Feed

**Title**: Implement project activity feed
**Priority**: P2
**Labels**: web, collaboration

**Description**:
Show what's happening in a project.

**Acceptance Criteria**:
- [ ] Activity events stored
- [ ] Feed component in sidebar
- [ ] Real-time updates via Yjs
- [ ] Filter by user, type
- [ ] Timestamp formatting

**Events**:
- "Noah added a fillet to Body 1"
- "Sarah exported project as STEP"
- "Mike joined the project"

---

#### P3-10: Version History

**Title**: Implement version history and branching
**Priority**: P1
**Labels**: api, collaboration

**Description**:
Git-like version control for designs.

**Acceptance Criteria**:
- [ ] Auto-save versions on significant changes
- [ ] Manual "save version" with name
- [ ] View version history
- [ ] Restore to previous version
- [ ] Compare versions visually
- [ ] Branch for experimental changes

**Database**:
```sql
versions: id, project_id, name, snapshot_data, created_by, created_at
```

---

### PHASE 4: Professional Features (Weeks 19-24)

**Goal**: Enterprise-ready with compliance and advanced features

---

#### P4-1: SOC 2 Compliance Foundation

**Title**: Implement SOC 2 compliance controls
**Priority**: P0
**Labels**: security, compliance

**Description**:
Add controls required for SOC 2 Type 1.

**Acceptance Criteria**:
- [ ] Audit logging for all actions
- [ ] Access logs retained 90 days
- [ ] MFA support added
- [ ] Password policy enforced
- [ ] Session timeout configured
- [ ] Data encryption at rest
- [ ] Encryption in transit (TLS 1.3)
- [ ] Vulnerability scanning in CI

**Audit Log Events**:
- Login/logout
- Project create/update/delete
- Export actions
- Team/permission changes
- Settings changes

---

#### P4-2: GDPR Compliance

**Title**: Implement GDPR compliance features
**Priority**: P0
**Labels**: security, compliance

**Description**:
Add features required for GDPR compliance.

**Acceptance Criteria**:
- [ ] Data export (user can download all data)
- [ ] Data deletion (right to be forgotten)
- [ ] Cookie consent banner
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Data processing agreement template
- [ ] EU data residency option

**User Controls**:
- Settings > Privacy > Download my data
- Settings > Account > Delete account

---

#### P4-3: Stripe Integration

**Title**: Implement Stripe subscription billing
**Priority**: P0
**Labels**: payments, api

**Description**:
Set up subscription billing with Stripe.

**Acceptance Criteria**:
- [ ] Stripe account connected
- [ ] Products/prices created
- [ ] Checkout session flow
- [ ] Webhook handler
- [ ] Subscription management portal
- [ ] Usage-based billing tracking
- [ ] Invoice handling

**Plans**:
- Free: 3 projects, 10 exports/month
- Pro ($29/mo): Unlimited projects, exports
- Team ($99/mo): + collaboration, 5 seats
- Enterprise: Custom pricing, SSO, SLA

---

#### P4-4: Subscription Limits Enforcement

**Title**: Enforce subscription plan limits
**Priority**: P0
**Labels**: api, payments

**Description**:
Enforce limits based on subscription tier.

**Acceptance Criteria**:
- [ ] Middleware checks limits
- [ ] Graceful upgrade prompts
- [ ] Usage tracking in Redis
- [ ] Limit reset on billing cycle
- [ ] Overage handling

**Limits by Plan**:
- Free: 3 projects, 10 exports, 1GB storage
- Pro: unlimited projects, unlimited exports, 50GB
- Team: + 5 team members, 200GB

---

#### P4-5: SSO Integration

**Title**: Implement SAML/OIDC SSO for enterprise
**Priority**: P1
**Labels**: auth, enterprise

**Description**:
Add enterprise SSO support.

**Acceptance Criteria**:
- [ ] SAML 2.0 integration
- [ ] OIDC integration
- [ ] SSO-only enforcement option
- [ ] Domain verification
- [ ] JIT provisioning
- [ ] SCIM user provisioning (optional)

**Supported Providers**:
- Okta
- Azure AD
- Google Workspace
- OneLogin

---

#### P4-6: Advanced Export Options

**Title**: Implement advanced export features
**Priority**: P1
**Labels**: cad, export

**Description**:
Professional-grade export capabilities.

**Acceptance Criteria**:
- [ ] IGES export
- [ ] DXF export (2D projections)
- [ ] Export with custom tolerances
- [ ] Batch export multiple bodies
- [ ] Export presets (3D printing, CNC, etc.)
- [ ] Manufacturing notes in export

**Export Settings**:
- Tolerance: 0.001mm - 1mm
- Units: mm, inches
- Coordinate system: default, custom
- Include: bodies, sketches, dimensions

---

#### P4-7: Design Validation

**Title**: Implement design validation system
**Priority**: P1
**Labels**: cad, ai

**Description**:
Validate designs against manufacturing constraints.

**Acceptance Criteria**:
- [ ] Wall thickness check
- [ ] Overhang detection (3D printing)
- [ ] Small feature warnings
- [ ] Clearance validation
- [ ] Material-specific rules
- [ ] Validation report generation

**Validation Rules**:
- Min wall thickness: 0.8mm (FDM), 0.4mm (SLA)
- Max overhang: 45 degrees without support
- Min hole diameter: 2mm

---

#### P4-8: Template Library

**Title**: Create design template library
**Priority**: P2
**Labels**: cad, content

**Description**:
Pre-built templates users can start from.

**Acceptance Criteria**:
- [ ] Template model format defined
- [ ] 10+ starter templates
- [ ] Template browser UI
- [ ] Create project from template
- [ ] User can save as template
- [ ] Template categories

**Initial Templates**:
- Phone case (parametric by device)
- Electronics enclosure
- Gear (parametric)
- Bracket/mount
- Cable organizer
- Desk accessory

---

#### P4-9: API Documentation

**Title**: Generate OpenAPI documentation
**Priority**: P1
**Labels**: api, docs

**Description**:
Comprehensive API documentation.

**Acceptance Criteria**:
- [ ] OpenAPI spec auto-generated
- [ ] Swagger UI at /api/docs
- [ ] Authentication documented
- [ ] Rate limits documented
- [ ] Code examples in docs
- [ ] Changelog

**Documentation Sections**:
- Getting Started
- Authentication
- Projects
- CAD Operations
- Export
- Webhooks

---

#### P4-10: Monitoring & Alerting

**Title**: Set up comprehensive monitoring
**Priority**: P0
**Labels**: devops, observability

**Description**:
Production monitoring and alerting.

**Acceptance Criteria**:
- [ ] Sentry error tracking configured
- [ ] PostHog analytics events
- [ ] Axiom log aggregation
- [ ] Uptime monitoring
- [ ] Performance metrics (p50, p95, p99)
- [ ] Alert rules for critical issues
- [ ] On-call rotation setup

**Key Metrics**:
- API latency
- CAD worker queue depth
- Error rate by endpoint
- Export success rate
- Active users

---

### PHASE 5: Scale & Polish (Weeks 25+)

**Goal**: Performance optimization and advanced AI features

---

#### P5-1: CAD Worker Scaling

**Title**: Implement horizontal scaling for CAD workers
**Priority**: P0
**Labels**: infrastructure, scale

**Description**:
Scale CAD workers based on demand.

**Acceptance Criteria**:
- [ ] Multiple worker instances
- [ ] Load balancing via BullMQ
- [ ] Auto-scaling rules
- [ ] Worker health checks
- [ ] Graceful shutdown
- [ ] Job retry logic

**Scaling Rules**:
- Scale up: queue depth > 10 for 2 minutes
- Scale down: queue depth = 0 for 5 minutes
- Min: 1, Max: 10 workers

---

#### P5-2: Model Caching System

**Title**: Implement aggressive model caching
**Priority**: P0
**Labels**: performance, cad

**Description**:
Cache tessellated models to reduce compute.

**Acceptance Criteria**:
- [ ] Cache key = hash of operation chain
- [ ] Redis cache for hot models
- [ ] S3 cache for cold models
- [ ] Cache invalidation on model change
- [ ] Cache hit rate monitoring
- [ ] Preemptive cache warming

**Cache Tiers**:
- L1: In-memory (active session)
- L2: Redis (hot models, 1hr TTL)
- L3: S3 (all models, persist)

---

#### P5-3: Progressive Mesh Loading

**Title**: Implement LOD and progressive mesh loading
**Priority**: P1
**Labels**: web, performance

**Description**:
Load meshes progressively based on viewport.

**Acceptance Criteria**:
- [ ] Multiple LOD levels generated
- [ ] LOD selection based on camera distance
- [ ] Progressive mesh streaming
- [ ] Frustum culling
- [ ] Instancing for repeated geometry

**LOD Levels**:
- LOD0: Full detail (export quality)
- LOD1: Medium (editing)
- LOD2: Low (overview, many models)
- LOD3: Bounding box (distant/off-screen)

---

#### P5-4: Multi-Provider AI

**Title**: Add support for multiple AI providers
**Priority**: P1
**Labels**: ai, api

**Description**:
Abstract AI provider for flexibility.

**Acceptance Criteria**:
- [ ] Provider interface defined
- [ ] OpenAI implementation
- [ ] Claude (Anthropic) implementation
- [ ] Provider selection in settings
- [ ] Fallback on provider failure
- [ ] Cost tracking per provider

**Providers**:
- OpenAI GPT-4o (default)
- Anthropic Claude 3.5
- Future: Open source options

---

#### P5-5: AI Fine-Tuning Pipeline

**Title**: Set up AI fine-tuning infrastructure
**Priority**: P2
**Labels**: ai, ml

**Description**:
Continuously improve AI with user data.

**Acceptance Criteria**:
- [ ] Successful designs logged
- [ ] Failed designs logged with errors
- [ ] Data pipeline to training format
- [ ] Fine-tuning job runner
- [ ] A/B testing framework
- [ ] Model version management

**Data Collection (with consent)**:
- Design prompts
- Operation sequences
- Success/failure outcomes
- User feedback ratings

---

#### P5-6: Assembly Support

**Title**: Implement multi-body assemblies
**Priority**: P1
**Labels**: cad, feature

**Description**:
Support assemblies with multiple bodies and constraints.

**Acceptance Criteria**:
- [ ] Assembly container
- [ ] Insert body into assembly
- [ ] Assembly constraints (mate, align, offset)
- [ ] Constraint solver
- [ ] Bill of materials generation
- [ ] Exploded view

**Assembly Constraints**:
- Coincident (faces touch)
- Concentric (axes align)
- Distance (fixed gap)
- Angle (fixed rotation)

---

#### P5-7: Direct Manipulation

**Title**: Implement direct manipulation in viewport
**Priority**: P1
**Labels**: web, ux

**Description**:
Allow dragging/resizing geometry in 3D.

**Acceptance Criteria**:
- [ ] Drag to move bodies
- [ ] Handles to resize
- [ ] Snap to grid option
- [ ] Snap to geometry
- [ ] Constraint-aware manipulation
- [ ] Gizmo controls (translate, rotate, scale)

**Gizmo Modes**:
- Translate (arrows)
- Rotate (rings)
- Scale (boxes)
- Combined

---

#### P5-8: Mobile Support

**Title**: Implement responsive mobile experience
**Priority**: P2
**Labels**: web, mobile

**Description**:
Usable experience on tablets and phones.

**Acceptance Criteria**:
- [ ] Responsive layout
- [ ] Touch gesture support
- [ ] Mobile navigation
- [ ] Simplified toolbars
- [ ] AI chat works on mobile
- [ ] View-only mode for phones

**Mobile-Specific**:
- Pinch to zoom
- Two-finger rotate
- Single tap select
- Double tap to edit

---

#### P5-9: Marketplace

**Title**: Design marketplace foundation
**Priority**: P2
**Labels**: feature, growth

**Description**:
Allow users to share and sell designs.

**Acceptance Criteria**:
- [ ] Publish design to marketplace
- [ ] Pricing options (free, paid)
- [ ] Revenue sharing model
- [ ] Search and browse
- [ ] Ratings and reviews
- [ ] Creator profiles

**Marketplace Categories**:
- 3D Printing
- CNC/Machining
- Laser Cutting
- Electronics
- Home/Office

---

#### P5-10: Cloud Manufacturing Integration

**Title**: Integrate with cloud manufacturing services
**Priority**: P2
**Labels**: feature, integration

**Description**:
Direct integration with manufacturing services.

**Acceptance Criteria**:
- [ ] Xometry API integration
- [ ] Instant quote from design
- [ ] Material selection
- [ ] Quantity options
- [ ] Order placement
- [ ] Order tracking

**Workflow**:
1. User finishes design
2. Click "Get Quote"
3. Select material, quantity
4. See instant price
5. Place order

---

## CAD API Design

The CAD API is the heart of Polygon. It must be:
- **Comprehensive**: Cover all professional CAD operations
- **Clean**: Consistent patterns, predictable behavior
- **AI-Friendly**: Designed for both human developers and AI agents
- **Performant**: Handle complex geometry without blocking

### API Design Principles

#### 1. Resource-Oriented Design

```
/projects                           # Collection of projects
/projects/{id}                      # Single project
/projects/{id}/bodies               # Bodies in a project
/projects/{id}/bodies/{id}          # Single body
/projects/{id}/sketches             # Sketches in a project
/projects/{id}/features             # Feature history
```

#### 2. Operation Endpoints (RPC-style for complex actions)

```
/operations/primitives/box          # Create box
/operations/primitives/cylinder     # Create cylinder
/operations/boolean/union           # Boolean union
/operations/boolean/subtract        # Boolean subtract
/operations/features/fillet         # Add fillet
/operations/features/shell          # Shell operation
/operations/sketch/extrude          # Extrude sketch
```

#### 3. Consistent Response Format

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    cached: boolean;
  };
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;           // Machine-readable: "FILLET_RADIUS_TOO_LARGE"
    message: string;        // Human-readable explanation
    details?: {
      field?: string;       // Which parameter caused the issue
      constraint?: string;  // What constraint was violated
      suggestion?: string;  // How to fix it
    };
    recoverable: boolean;   // Can AI retry with adjusted params?
  };
  metadata: {
    requestId: string;
  };
}
```

### Complete OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Polygon CAD API
  version: 1.0.0
  description: |
    Professional CAD operations API for AI-driven 3D modeling.

    ## Units
    All dimensions are in millimeters (mm) unless otherwise specified.

    ## Coordinate System
    Right-handed coordinate system: X right, Y forward, Z up.

    ## Error Handling
    All errors include actionable suggestions for AI agents.

servers:
  - url: https://api.polygon.design/v1
    description: Production
  - url: https://api.staging.polygon.design/v1
    description: Staging

components:
  schemas:
    # === Primitives ===
    Vector3:
      type: object
      required: [x, y, z]
      properties:
        x: { type: number, description: "X coordinate in mm" }
        y: { type: number, description: "Y coordinate in mm" }
        z: { type: number, description: "Z coordinate in mm" }
      example: { x: 0, y: 0, z: 0 }

    Plane:
      type: object
      required: [origin, normal]
      properties:
        origin: { $ref: '#/components/schemas/Vector3' }
        normal: { $ref: '#/components/schemas/Vector3' }
      description: "A plane defined by origin point and normal vector"

    Transform:
      type: object
      properties:
        position: { $ref: '#/components/schemas/Vector3' }
        rotation:
          type: object
          properties:
            x: { type: number, description: "Rotation around X in degrees" }
            y: { type: number, description: "Rotation around Y in degrees" }
            z: { type: number, description: "Rotation around Z in degrees" }
        scale:
          type: object
          properties:
            x: { type: number, default: 1 }
            y: { type: number, default: 1 }
            z: { type: number, default: 1 }

    # === Bodies ===
    Body:
      type: object
      properties:
        id: { type: string, format: uuid }
        projectId: { type: string, format: uuid }
        name: { type: string }
        type: { type: string, enum: [solid, surface, wire] }
        brepFileKey: { type: string, description: "S3 key for B-Rep file" }
        gltfFileKey: { type: string, description: "S3 key for preview mesh" }
        boundingBox:
          type: object
          properties:
            min: { $ref: '#/components/schemas/Vector3' }
            max: { $ref: '#/components/schemas/Vector3' }
        volume: { type: number, description: "Volume in mm^3" }
        surfaceArea: { type: number, description: "Surface area in mm^2" }
        transform: { $ref: '#/components/schemas/Transform' }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    # === Sketches ===
    SketchShape:
      oneOf:
        - $ref: '#/components/schemas/SketchLine'
        - $ref: '#/components/schemas/SketchArc'
        - $ref: '#/components/schemas/SketchCircle'
        - $ref: '#/components/schemas/SketchRectangle'
        - $ref: '#/components/schemas/SketchPolygon'
      discriminator:
        propertyName: type

    SketchLine:
      type: object
      required: [type, start, end]
      properties:
        type: { type: string, const: "line" }
        start: { $ref: '#/components/schemas/Vector2' }
        end: { $ref: '#/components/schemas/Vector2' }

    SketchCircle:
      type: object
      required: [type, center, radius]
      properties:
        type: { type: string, const: "circle" }
        center: { $ref: '#/components/schemas/Vector2' }
        radius: { type: number, minimum: 0.001 }

    SketchRectangle:
      type: object
      required: [type, corner, width, height]
      properties:
        type: { type: string, const: "rectangle" }
        corner: { $ref: '#/components/schemas/Vector2' }
        width: { type: number, minimum: 0.001 }
        height: { type: number, minimum: 0.001 }
        cornerRadius: { type: number, minimum: 0, default: 0 }

    Sketch:
      type: object
      properties:
        id: { type: string, format: uuid }
        projectId: { type: string, format: uuid }
        name: { type: string }
        plane: { $ref: '#/components/schemas/Plane' }
        shapes:
          type: array
          items: { $ref: '#/components/schemas/SketchShape' }
        isClosed: { type: boolean, description: "Whether sketch forms closed profile(s)" }
        isValid: { type: boolean, description: "Whether sketch is valid for extrusion" }

    # === Features ===
    Feature:
      type: object
      properties:
        id: { type: string, format: uuid }
        projectId: { type: string, format: uuid }
        type:
          type: string
          enum: [
            primitive_box, primitive_cylinder, primitive_sphere, primitive_cone,
            boolean_union, boolean_subtract, boolean_intersect,
            feature_fillet, feature_chamfer, feature_shell, feature_offset,
            sketch_extrude, sketch_revolve, sketch_sweep, sketch_loft
          ]
        params: { type: object, description: "Feature-specific parameters" }
        inputBodyIds: { type: array, items: { type: string } }
        outputBodyId: { type: string }
        order: { type: integer, description: "Position in feature tree" }
        createdAt: { type: string, format: date-time }

    # === Edge/Face Selection ===
    EdgeSelector:
      oneOf:
        - type: object
          properties:
            type: { const: "all" }
          description: "Select all edges"
        - type: object
          properties:
            type: { const: "indices" }
            indices: { type: array, items: { type: integer } }
          description: "Select edges by index"
        - type: object
          properties:
            type: { const: "filter" }
            filter:
              type: object
              properties:
                edgeType: { enum: [line, arc, circle, spline] }
                minLength: { type: number }
                maxLength: { type: number }
                parallel: { $ref: '#/components/schemas/Vector3' }
                perpendicular: { $ref: '#/components/schemas/Vector3' }
          description: "Select edges by geometric criteria"

paths:
  # === Projects ===
  /projects:
    get:
      operationId: listProjects
      summary: List all projects for authenticated user
      tags: [Projects]
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                type: object
                properties:
                  projects: { type: array, items: { $ref: '#/components/schemas/Project' } }
                  total: { type: integer }

    post:
      operationId: createProject
      summary: Create a new project
      tags: [Projects]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                  minLength: 1
                  maxLength: 100
                description: { type: string, maxLength: 500 }
                templateId: { type: string, format: uuid }
            example:
              name: "Phone Case Design"
              description: "Custom case for iPhone 15"
      responses:
        '201':
          description: Project created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Project' }

  # === Primitive Operations ===
  /operations/primitives/box:
    post:
      operationId: createBox
      summary: Create a box primitive
      description: |
        Creates a rectangular box with specified dimensions.

        **Use when**: Starting a design that has a rectangular base shape,
        creating enclosures, mounting plates, or any blocky geometry.

        **Tips for AI**:
        - Position defaults to origin (0,0,0)
        - Box is centered at position by default
        - For a box sitting on the ground plane, set position.z = height/2
      tags: [Primitives]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, length, width, height]
              properties:
                projectId:
                  type: string
                  format: uuid
                name:
                  type: string
                  description: "Human-readable name for the body"
                  default: "Box"
                length:
                  type: number
                  minimum: 0.001
                  maximum: 10000
                  description: "Size along X axis in mm"
                width:
                  type: number
                  minimum: 0.001
                  maximum: 10000
                  description: "Size along Y axis in mm"
                height:
                  type: number
                  minimum: 0.001
                  maximum: 10000
                  description: "Size along Z axis in mm"
                position:
                  $ref: '#/components/schemas/Vector3'
                  default: { x: 0, y: 0, z: 0 }
                centered:
                  type: boolean
                  default: true
                  description: "If true, box is centered at position. If false, position is corner."
            examples:
              simple:
                summary: Simple 10x10x5 box
                value:
                  projectId: "123e4567-e89b-12d3-a456-426614174000"
                  length: 10
                  width: 10
                  height: 5
              phone_case_base:
                summary: iPhone 15 case base
                value:
                  projectId: "123e4567-e89b-12d3-a456-426614174000"
                  name: "Case Shell"
                  length: 147.6
                  width: 71.6
                  height: 12
                  position: { x: 0, y: 0, z: 6 }
      responses:
        '201':
          description: Box created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Body'

  /operations/primitives/cylinder:
    post:
      operationId: createCylinder
      summary: Create a cylinder primitive
      description: |
        Creates a cylinder with specified radius and height.

        **Use when**: Creating shafts, holes (via boolean subtract),
        rounded features, or any circular cross-section geometry.

        **Tips for AI**:
        - Cylinder axis is along Z by default
        - For horizontal cylinders, create then rotate
        - For threaded holes, create cylinder then add thread feature
      tags: [Primitives]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, radius, height]
              properties:
                projectId: { type: string, format: uuid }
                name: { type: string, default: "Cylinder" }
                radius:
                  type: number
                  minimum: 0.001
                  maximum: 5000
                  description: "Radius in mm"
                height:
                  type: number
                  minimum: 0.001
                  maximum: 10000
                  description: "Height along Z axis in mm"
                position: { $ref: '#/components/schemas/Vector3' }
                axis:
                  $ref: '#/components/schemas/Vector3'
                  default: { x: 0, y: 0, z: 1 }
                  description: "Cylinder axis direction"

  # === Boolean Operations ===
  /operations/boolean/union:
    post:
      operationId: booleanUnion
      summary: Combine two bodies into one
      description: |
        Creates a new body that is the union of two input bodies.
        The original bodies are optionally preserved or deleted.

        **Use when**: Joining separate parts together, combining features,
        building up complex shapes from simpler ones.

        **Common errors**:
        - Bodies don't intersect: Union still works but may create disjoint solid
        - Bodies are identical: Returns copy of input
      tags: [Boolean]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, bodyA, bodyB]
              properties:
                projectId: { type: string, format: uuid }
                bodyA: { type: string, format: uuid, description: "First body ID" }
                bodyB: { type: string, format: uuid, description: "Second body ID" }
                keepOriginals:
                  type: boolean
                  default: false
                  description: "If true, keep input bodies. If false, delete them."
                resultName: { type: string, default: "Union Result" }

  /operations/boolean/subtract:
    post:
      operationId: booleanSubtract
      summary: Subtract one body from another
      description: |
        Removes the volume of body B from body A.

        **Use when**: Creating holes, cutouts, pockets, or removing material.

        **Tips for AI**:
        - Order matters: A - B is different from B - A
        - Tool body (B) must intersect target body (A)
        - For through-holes, ensure tool extends beyond both faces

        **Common errors**:
        - No intersection: Returns error with BODIES_DO_NOT_INTERSECT code
        - Tool larger than target: May result in empty or invalid geometry
      tags: [Boolean]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, targetBody, toolBody]
              properties:
                projectId: { type: string, format: uuid }
                targetBody:
                  type: string
                  format: uuid
                  description: "Body to subtract FROM"
                toolBody:
                  type: string
                  format: uuid
                  description: "Body to subtract (the cutting tool)"
                keepTool:
                  type: boolean
                  default: false
                  description: "Keep the tool body after operation"
            example:
              projectId: "123e4567-e89b-12d3-a456-426614174000"
              targetBody: "box-uuid"
              toolBody: "cylinder-uuid"
              keepTool: false

  # === Feature Operations ===
  /operations/features/fillet:
    post:
      operationId: addFillet
      summary: Add rounded fillet to edges
      description: |
        Rounds the specified edges with a constant or variable radius.

        **Use when**: Softening sharp edges for ergonomics, stress relief,
        or aesthetic purposes. Common on consumer products.

        **Tips for AI**:
        - Radius must be less than smallest adjacent face width
        - Start with small radius (1-2mm) and increase if needed
        - For 3D printing, 1mm+ radius helps with layer adhesion

        **Common errors**:
        - FILLET_RADIUS_TOO_LARGE: Reduce radius or fillet fewer edges
        - EDGE_NOT_FOUND: Check edge indices with getBodyInfo first
      tags: [Features]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, bodyId, edges, radius]
              properties:
                projectId: { type: string, format: uuid }
                bodyId: { type: string, format: uuid }
                edges:
                  $ref: '#/components/schemas/EdgeSelector'
                radius:
                  type: number
                  minimum: 0.001
                  maximum: 1000
                  description: "Fillet radius in mm"
            examples:
              all_edges:
                summary: Fillet all edges with 2mm radius
                value:
                  projectId: "proj-uuid"
                  bodyId: "body-uuid"
                  edges: { type: "all" }
                  radius: 2
              specific_edges:
                summary: Fillet only top edges
                value:
                  projectId: "proj-uuid"
                  bodyId: "body-uuid"
                  edges: { type: "indices", indices: [0, 1, 2, 3] }
                  radius: 3

  /operations/features/shell:
    post:
      operationId: shellBody
      summary: Hollow out a solid body
      description: |
        Creates a hollow shell by removing material from inside the body,
        leaving walls of specified thickness. Optionally removes faces
        to create openings.

        **Use when**: Creating enclosures, cases, containers, or any
        hollow object with uniform wall thickness.

        **Tips for AI**:
        - Wall thickness should be >= 1mm for 3D printing
        - Remove top face to create open-top container
        - Shell after boolean operations, before fillets

        **Common errors**:
        - THICKNESS_TOO_LARGE: Reduce thickness or shell larger body
        - INVALID_FACE: Check face indices with getBodyInfo
      tags: [Features]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, bodyId, thickness]
              properties:
                projectId: { type: string, format: uuid }
                bodyId: { type: string, format: uuid }
                thickness:
                  type: number
                  minimum: 0.1
                  maximum: 100
                  description: "Wall thickness in mm"
                facesToRemove:
                  type: array
                  items: { type: integer }
                  description: "Face indices to remove (create openings)"
                  default: []
            example:
              projectId: "proj-uuid"
              bodyId: "body-uuid"
              thickness: 2
              facesToRemove: [5]  # Remove top face

  # === Sketch Operations ===
  /operations/sketch/extrude:
    post:
      operationId: extrudeSketch
      summary: Extrude a 2D sketch into 3D
      description: |
        Converts a closed 2D sketch profile into a 3D solid by
        extruding it along a direction.

        **Use when**: Creating prismatic shapes, converting drawings
        to 3D, or any geometry with constant cross-section.

        **Tips for AI**:
        - Sketch must have closed profiles
        - Multiple profiles in one sketch create multiple bodies
        - Use 'cut' operation to create holes through existing body

        **Operations**:
        - new_body: Create standalone solid
        - join: Add material to existing body
        - cut: Remove material from existing body
      tags: [Sketch]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [projectId, sketchId, distance]
              properties:
                projectId: { type: string, format: uuid }
                sketchId: { type: string, format: uuid }
                distance:
                  type: number
                  minimum: 0.001
                  description: "Extrusion distance in mm"
                direction:
                  type: string
                  enum: [normal, reverse, symmetric]
                  default: normal
                  description: |
                    - normal: Extrude in sketch plane normal direction
                    - reverse: Extrude opposite to normal
                    - symmetric: Extrude equal distance both directions
                operation:
                  type: string
                  enum: [new_body, join, cut]
                  default: new_body
                targetBody:
                  type: string
                  format: uuid
                  description: "Required if operation is 'join' or 'cut'"
                draft:
                  type: object
                  properties:
                    angle: { type: number, description: "Draft angle in degrees" }
                    inward: { type: boolean, default: false }

  # === Export ===
  /export/{bodyId}:
    post:
      operationId: exportBody
      summary: Export body to file format
      description: |
        Generates a downloadable file in the specified format.
        Returns a signed URL for download.

        **Format recommendations**:
        - STEP: Best for CAD interchange, CNC machining
        - STL: Standard for 3D printing, mesh-based
        - 3MF: Modern 3D printing with color/material
        - glTF: Web visualization, includes materials
      tags: [Export]
      parameters:
        - name: bodyId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [format]
              properties:
                format:
                  type: string
                  enum: [step, stl, 3mf, gltf, iges, obj, dxf]
                options:
                  type: object
                  properties:
                    # STL options
                    linearTolerance:
                      type: number
                      default: 0.1
                      description: "Mesh tolerance in mm (STL/glTF)"
                    angularTolerance:
                      type: number
                      default: 0.5
                      description: "Angular tolerance in degrees"
                    binary:
                      type: boolean
                      default: true
                      description: "Binary format (smaller file)"
                    # STEP options
                    applicationProtocol:
                      type: string
                      enum: [ap203, ap214, ap242]
                      default: ap214
                      description: "STEP application protocol"
      responses:
        '200':
          description: Export successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  downloadUrl:
                    type: string
                    format: uri
                    description: "Signed URL, valid for 1 hour"
                  fileSize: { type: integer, description: "File size in bytes" }
                  expiresAt: { type: string, format: date-time }

  # === Utility ===
  /bodies/{bodyId}/info:
    get:
      operationId: getBodyInfo
      summary: Get detailed body information
      description: |
        Returns detailed geometric information about a body including
        edges, faces, and their indices. Use this before operations
        that require edge/face selection.
      tags: [Utility]
      parameters:
        - name: bodyId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Body information
          content:
            application/json:
              schema:
                type: object
                properties:
                  body: { $ref: '#/components/schemas/Body' }
                  edges:
                    type: array
                    items:
                      type: object
                      properties:
                        index: { type: integer }
                        type: { enum: [line, arc, circle, spline] }
                        length: { type: number }
                        vertices:
                          type: array
                          items: { $ref: '#/components/schemas/Vector3' }
                  faces:
                    type: array
                    items:
                      type: object
                      properties:
                        index: { type: integer }
                        type: { enum: [plane, cylinder, sphere, cone, torus, bspline] }
                        area: { type: number }
                        normal: { $ref: '#/components/schemas/Vector3' }
```

### Error Code Reference

| Code | HTTP | Meaning | AI Recovery |
|------|------|---------|-------------|
| `BODY_NOT_FOUND` | 404 | Body ID doesn't exist | Check body list, verify ID |
| `SKETCH_NOT_CLOSED` | 400 | Sketch profiles not closed | Add missing lines to close |
| `FILLET_RADIUS_TOO_LARGE` | 400 | Radius exceeds geometry | Reduce radius by 50% and retry |
| `BODIES_DO_NOT_INTERSECT` | 400 | Boolean requires overlap | Reposition bodies |
| `SHELL_THICKNESS_INVALID` | 400 | Wall too thick for body | Reduce thickness |
| `INVALID_GEOMETRY` | 400 | Operation created bad geometry | Simplify operation |
| `OPERATION_TIMEOUT` | 504 | Complex operation timed out | Break into smaller operations |
| `QUOTA_EXCEEDED` | 429 | Rate limit or plan limit | Wait or upgrade |

### API Design Principles

1. **Explicit over Implicit**
   - Every parameter has a description
   - Defaults are documented
   - Units are always specified (mm)

2. **Examples in Schemas**
   - Every endpoint has example requests
   - Examples show real-world use cases
   - AI can learn from examples

3. **Meaningful Errors**
   - Error codes are machine-readable
   - Suggestions help AI recover
   - Recoverable flag guides retry logic

4. **Idempotent Where Possible**
   - GET requests are always safe
   - Same input produces same output
   - Operations can be retried

5. **Atomic Operations**
   - One action per endpoint
   - All-or-nothing semantics
   - Partial failures are rolled back

---

## AI Agent Architecture

### Dynamic Form UI: Library Recommendation

Based on research, here's the analysis of options for AI-driven dynamic forms in chat:

#### A2UI (Google's Agent-to-User Interface)

**What it is**: Open-source protocol (Apache 2.0) from Google for AI agents to dynamically generate UI.

**How it works**:
- AI generates declarative JSON payloads describing UI components
- Client maintains a catalog of trusted, pre-approved components
- Safe execution (no code execution from LLM)
- Supports streaming and progressive rendering

**Status**: v0.8 Public Preview - functional but still evolving

**Pros**:
- Framework-agnostic (works with React, Flutter, native mobile)
- Future-proof specification backed by Google
- Security-first design (declarative, not executable)

**Cons**:
- Not yet v1.0 stable
- Requires building component catalog from scratch
- Less community adoption than alternatives

#### Recommendation: Vercel AI SDK + Assistant UI

For your use case, I recommend a **hybrid approach**:

| Layer | Tool | Purpose |
|-------|------|---------|
| AI Integration | **Vercel AI SDK** | Streaming, tool calls, provider abstraction |
| Chat UI | **Assistant UI** | Production-ready chat components (400k+ downloads) |
| Form Components | **ShadCN + React Hook Form** | Your existing component library |
| Form Validation | **Zod** | Schema validation (shared with API) |

**Why this combination**:

1. **Vercel AI SDK** handles streaming responses and tool calls natively
2. **Assistant UI** provides battle-tested chat primitives (not monolithic)
3. **Tool-based forms**: AI invokes tools that render specific form components
4. **Type safety**: Zod schemas shared between AI tools and form validation

#### Implementation Pattern

```typescript
// AI tool that renders a form
const collectDimensionsTool = {
  name: 'collect_dimensions',
  description: 'Collect dimensions from user via form',
  parameters: z.object({
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['number', 'slider', 'select']),
      unit: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      default: z.number().optional(),
      options: z.array(z.string()).optional(),
    })),
  }),
  // When AI calls this tool, render DimensionForm component
  render: ({ fields }) => <DimensionForm fields={fields} />,
};

// Form component
function DimensionForm({ fields, onSubmit }) {
  const form = useForm({ resolver: zodResolver(dynamicSchema(fields)) });

  return (
    <Form {...form}>
      {fields.map(field => (
        <FormField key={field.name} field={field} />
      ))}
      <Button type="submit">Continue</Button>
    </Form>
  );
}
```

#### Alternative: Watch A2UI

Keep an eye on A2UI for future consideration:
- If it reaches v1.0 with broader adoption
- If you need cross-platform (mobile app) support
- If you want agents that work across different interfaces

---

### System Prompt Structure

```markdown
# Polygon CAD Assistant

You are an AI assistant that helps users create 3D CAD models through conversation.

## Your Capabilities

You can create 3D models using these operations:
- Primitives: box, cylinder, sphere, cone
- Boolean: union, subtract, intersect
- Features: fillet, chamfer, shell
- Sketching: create 2D profiles and extrude them

## How to Help Users

1. **Understand Intent**: When a user describes what they want, identify:
   - What type of object (case, bracket, gear, etc.)
   - Key dimensions and constraints
   - Manufacturing method (3D printing, CNC, etc.)

2. **Fill the Schema**: Ask questions to gather required information:
   - Use the collect_dimensions tool for structured input
   - Explain why each piece of information matters
   - Suggest sensible defaults based on manufacturing method

3. **Build Incrementally**: Create the model step by step:
   - Start with the base shape
   - Add features one at a time
   - Show previews at each step using show_preview tool

4. **Handle Errors**: If an operation fails:
   - Check the error code and suggestion field
   - Adjust parameters based on suggestion
   - Retry with corrected values
   - If still failing, explain to user and offer alternatives

## Tool Usage Guidelines

### Form Tools (for collecting input)
- collect_dimensions: For numeric inputs with units
- collect_options: For multiple choice selections
- collect_confirmation: For yes/no decisions

### CAD Tools (for building geometry)
- Always specify units (mm assumed)
- Use reasonable tolerances for features
- Name bodies descriptively

### Preview Tools
- show_preview: Display current model state
- show_comparison: Before/after for changes

## Example Workflow

User: "I need a phone case for iPhone 15"

1. Identify design type: phone_case
2. Call collect_dimensions with fields:
   - thickness (slider, 1-3mm, default 1.5)
   - corner_radius (slider, 1-5mm, default 2)
3. Call collect_options for features:
   - camera_protection: yes/no
   - grip_texture: none/dots/lines
4. Execute CAD operations:
   - create_box with device dimensions + margin
   - shell with user's thickness
   - cut openings for ports, camera
   - add_fillet with user's corner_radius
5. Call show_preview
6. Ask if any changes needed
7. Offer export options
```

### Conversation State Management

```typescript
interface ConversationState {
  // Current design context
  projectId: string;
  activeBodyIds: string[];
  activeSketchId: string | null;

  // Schema being filled
  designType: string;
  schema: DesignSchema;
  filledFields: Record<string, unknown>;
  requiredFields: string[];

  // Pending form (waiting for user input)
  pendingForm: {
    toolName: string;
    fields: FormField[];
  } | null;

  // Conversation history
  messages: Message[];

  // Operation history for undo
  operationStack: Operation[];
}

// Form field types for dynamic rendering
interface FormField {
  name: string;
  label: string;
  type: 'number' | 'slider' | 'select' | 'checkbox' | 'text';
  description?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: unknown;
  options?: { value: string; label: string }[];
  required?: boolean;
}
```

### AI Provider Abstraction

```typescript
// packages/ai/provider.ts
interface AIProvider {
  name: string;
  chat(messages: Message[], tools: Tool[]): AsyncIterable<StreamChunk>;
  estimateCost(tokens: number): number;
}

class OpenAIProvider implements AIProvider {
  name = 'openai';
  model = 'gpt-4o';

  async *chat(messages, tools) {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages,
      tools: tools.map(t => ({ type: 'function', function: t })),
      stream: true,
    });
    for await (const chunk of response) {
      yield chunk;
    }
  }
}

// Future: Add Claude, open source providers
class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  model = 'claude-3-5-sonnet';
  // ...
}
```

---

## Real-Time Collaboration

### Yjs Document Schema

```typescript
// packages/realtime/schema.ts
import * as Y from 'yjs';

interface ProjectDocument {
  // Core CAD state
  bodies: Y.Map<{
    id: string;
    name: string;
    brepFileKey: string;
    gltfFileKey: string;
    transform: Matrix4;
    visible: boolean;
    locked: boolean;
    lockedBy: string | null;
  }>;

  sketches: Y.Map<{
    id: string;
    plane: Plane;
    shapes: Y.Array<Shape>;
  }>;

  features: Y.Array<{
    id: string;
    type: FeatureType;
    params: Record<string, unknown>;
    bodyIds: string[];
    timestamp: number;
  }>;

  // Collaboration state
  presence: Y.Map<{
    odId: string;
    name: string;
    color: string;
    cursor3D: Vector3 | null;
    selectedBodyIds: string[];
    activeView: CameraState;
  }>;

  // Chat/comments
  comments: Y.Array<{
    id: string;
    userId: string;
    bodyId: string | null;
    position: Vector3 | null;
    text: string;
    timestamp: number;
  }>;
}
```

### Conflict Resolution Strategy

| Conflict Type | Resolution |
|---------------|------------|
| Same body edited | Last-writer-wins |
| Body deleted while editing | Notify, offer restore |
| Concurrent feature additions | Both preserved, order by timestamp |
| Sketch edited by multiple | Per-shape granularity |

---

## Security & Compliance

### Security Checklist

**Authentication**:
- [x] Password hashing (Argon2)
- [x] Session management (Redis)
- [x] OAuth 2.0 (GitHub, Google)
- [ ] MFA (TOTP)
- [ ] SSO (SAML/OIDC)

**Authorization**:
- [x] Role-based access control
- [x] Project-level permissions
- [x] API key management
- [ ] IP allowlisting

**Data Protection**:
- [x] Encryption at rest (AES-256)
- [x] Encryption in transit (TLS 1.3)
- [x] Database encryption
- [ ] Field-level encryption for PII

**Compliance**:
- [ ] SOC 2 Type 1
- [ ] SOC 2 Type 2
- [x] GDPR (data export, deletion)
- [ ] HIPAA (if medical devices)

**Monitoring**:
- [x] Audit logging
- [x] Error tracking (Sentry)
- [x] Access logs
- [ ] SIEM integration

### Rate Limiting Strategy

```typescript
// Rate limits by tier
const rateLimits = {
  free: {
    api: { requests: 100, window: '1m' },
    cad: { operations: 50, window: '1h' },
    export: { count: 10, window: '24h' },
    ai: { messages: 50, window: '24h' },
  },
  pro: {
    api: { requests: 1000, window: '1m' },
    cad: { operations: 500, window: '1h' },
    export: { count: -1, window: '-' }, // unlimited
    ai: { messages: 500, window: '24h' },
  },
  team: {
    api: { requests: 5000, window: '1m' },
    cad: { operations: 2000, window: '1h' },
    export: { count: -1, window: '-' },
    ai: { messages: 2000, window: '24h' },
  },
};
```

---

## Infrastructure & DevOps

### Railway Deployment Architecture

```
Railway Project: polygon-prod

Services:
  polygon-web (Next.js)
    Instance: Starter ($5/mo)
    Scale: 1-3 instances

  polygon-api (Hono/Bun)
    Instance: Pro ($20/mo)
    Scale: 2-5 instances

  polygon-cad-worker (Python/FastAPI)
    Instance: Pro ($20/mo)
    Memory: 4GB minimum
    Scale: 1-10 instances (auto)

  polygon-mcp (TypeScript)
    Instance: Starter ($5/mo)
    Scale: 1-2 instances

  polygon-realtime (PartyKit)
    Deployed to Cloudflare

Databases:
  PostgreSQL
    Plan: Pro ($20/mo)
    Storage: 10GB -> 100GB

  Redis
    Plan: Pro ($20/mo)
    Memory: 1GB -> 4GB

Add-ons:
  S3-compatible storage (Cloudflare R2)
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run test

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          environment: preview

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          environment: production
```

### Estimated Monthly Costs

| Phase | Component | Cost |
|-------|-----------|------|
| Phase 0-1 | Railway (web, api, db, redis) | ~$50/mo |
| Phase 1 | + CAD Worker | ~$70/mo |
| Phase 2 | + MCP Server, AI API | ~$150/mo |
| Phase 3 | + PartyKit, increased scale | ~$250/mo |
| Phase 4+ | Production scale | ~$500-1000/mo |

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Set up Linear** with the ticket structure
3. **Start Phase 0** with infrastructure setup
4. **Deploy empty shell** to validate infrastructure

The plan is designed for incremental delivery. After each ticket, you should have something deployable and testable.

---

## Appendix: Research Sources

### CAD Kernel (OCCT)
- Open CASCADE GitHub: https://github.com/Open-Cascade-SAS/OCCT
- CadQuery Documentation: https://cadquery.readthedocs.io/
- opencascade.js: https://ocjs.org/

### MCP Protocol
- MCP Specification: https://modelcontextprotocol.io/specification
- Anthropic MCP Servers: https://github.com/modelcontextprotocol/servers
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

### Real-Time Collaboration
- Yjs Documentation: https://docs.yjs.dev/
- PartyKit: https://www.partykit.io/
- Figma Multiplayer: https://www.figma.com/blog/how-figgas-multiplayer-technology-works/

### AI CAD Generation
- Zoo.dev (KittyCAD): https://zoo.dev/
- Autodesk Neural CAD: https://www.research.autodesk.com/
- Text-to-CadQuery Research: https://arxiv.org/html/2505.06507v1
