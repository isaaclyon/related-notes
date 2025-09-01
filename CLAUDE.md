# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin called **Related Notes** that analyzes note relationships using sophisticated graph algorithms and text similarity. It's a modernized TypeScript/Svelte implementation focusing on 3 core algorithms:

1. **Link Suggestions** (Resource Allocation) - Link prediction based on shared neighbors
2. **Relevant Notes** (Personalized PageRank) - Contextual influence ranking  
3. **Similar Content** (BM25F/Otsuka-Chiai) - Advanced text similarity analysis

## Development Commands

### Build & Development
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Create release
npm run release
```

### Testing
- No automated test suite currently implemented
- Manual testing via Obsidian plugin installation

## Architecture

### Core Components

**Main Plugin Entry (`src/main.ts`)**
- Plugin lifecycle management
- Command registration for each algorithm
- View initialization and graph refresh logic
- Settings migration for deprecated algorithms

**Graph Engine (`src/MyGraph.ts`)**
- Extends Graphology for graph operations
- Implements all 3 core algorithms as async methods
- Handles Obsidian vault indexing and metadata processing
- Integrates BM25Service for text similarity preprocessing

**Analysis View (`src/AnalysisView.ts`)**
- Obsidian ItemView implementation
- Renders Svelte components for UI
- Manages algorithm switching and result display

**BM25 Text Search (`src/index/BM25Service.ts`)**
- Advanced BM25F implementation with field-weighted scoring
- Incremental indexing of note content (title 2x weight, content 1x)
- Powers "Similar Content" algorithm and Resource Allocation preprocessing

### Key Algorithms

**Resource Allocation Link Prediction:**
```typescript
RA(a,b) = Σ_{z ∈ neighbors(a)∩neighbors(b)} 1/deg(z)
```
- Pre-filters candidates using BM25 similarity (top 400)
- Weights shared neighbors by inverse degree
- Located in MyGraph.ts line ~180-210

**Personalized PageRank:**
- Power iteration with α=0.15 damping factor
- Folder/tag relationship boosts (1.1x edge weights)
- Convergence detection (ε=1e-6, max 100 iterations)
- Located in MyGraph.ts line ~450-500

**BM25F Text Similarity:**
- Field-weighted scoring with title boost
- Otsuka-Chiai normalization for consistent scores
- Stopword removal and advanced preprocessing
- Located in BM25Service.ts

### Component Structure

**Svelte Components (`src/Components/`)**
- `AnalysisComponent.svelte` - Main analysis UI container
- `TableComponent.svelte` - Results table with sorting/filtering
- `ScrollSelector.svelte` - Algorithm tab switching interface  
- `SubtypeOptions.svelte` - Settings checkboxes for display options

### Settings & Configuration

**Settings Management (`src/Settings.ts`)**
- Plugin settings panel implementation
- Algorithm visibility toggles
- File type inclusion/exclusion patterns
- Debug mode controls

**Default Configuration (`src/Constants.ts`)**
- Algorithm metadata and descriptions
- Default settings with migration logic
- Icon definitions and view constants

## Build System

**Vite Configuration (`vite.config.ts`)**
- TypeScript + Svelte compilation
- CommonJS output for Obsidian compatibility
- External Obsidian API dependency
- Development source maps, production minification

**TypeScript Configuration (`tsconfig.json`)**  
- Strict mode enabled with ES2020 target
- Obsidian API types and Svelte support
- Source maps for debugging

## Plugin-Specific Requirements

**Obsidian Plugin Structure:**
- `manifest.json` - Plugin metadata (version, compatibility)
- `versions.json` - Obsidian version compatibility matrix
- `main.js` - Built plugin entry point

**Key Dependencies:**
- `obsidian` - Core Obsidian API
- `graphology` - Graph data structures and algorithms
- `svelte` - Reactive UI framework
- Custom BM25F implementation for text analysis

## Development Notes

- Plugin entry point builds from `src/main.ts` to `main.js`
- Settings automatically migrate deprecated algorithms to current ones
- Graph indexing waits for Obsidian's `resolvedLinks` to complete
- BM25 index updates incrementally as vault content changes
- Algorithm gating: Resource Allocation uses BM25 pre-filtering for performance