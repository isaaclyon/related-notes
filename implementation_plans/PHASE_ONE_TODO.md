# Phase 1 Implementation Plan: Foundation & Core Algorithm Design

Based on analysis of the codebase, here's the plan for Phase 1 (Weeks 1-2):

## 1. Algorithm Architecture Implementation

### BM25F Text Similarity Service (`src/index/BM25Service.ts`)
- [ ] Create inverted index with field-weighted BM25F scoring
- [ ] Implement tokenizer (simple regex + lowercase + ASCII folding)
- [ ] Build sparse vector representation with L2 normalization
- [ ] Add incremental update capability for changed files

### Resource Allocation Index (extend `src/MyGraph.ts`)
- [ ] Implement RA formula: `Σ_{z ∈ neighbors(n)∩neighbors(m)} 1/deg(z)`
- [ ] Gate by BM25 similarity (top-400 candidates)
- [ ] Add shared neighbor explanation generation

### Personalized PageRank (extend `src/MyGraph.ts`)
- [ ] Power iteration with α=0.15, restart at current note
- [ ] Add edge weights with folder/tag boost (1.1x)
- [ ] Implement early stopping for convergence
- [ ] Optional time decay for recent modifications

## 2. Build System Modernization ✅ COMPLETED

### Migrate to Vite
- [x] Replace Rollup with Vite configuration - *Created vite.config.ts with ESM support*
- [x] Configure esbuild for fast TypeScript compilation - *Vite uses esbuild internally*
- [x] Update to TypeScript 5.x with strict mode - *Updated to TS 5.x with strict: true*
- [x] Set ES2020 target with proper polyfills - *Set target: ES2020 in tsconfig.json*

### Upgrade Dependencies
- [x] Svelte 3.35 → 4.x - *Updated to Svelte 4.x with proper preprocessing*
- [ ] Remove wink-nlp (replace with simple tokenization)
- [x] Update Obsidian API to 1.5.0+ - *Updated to obsidian@^1.5.0*
- [x] Keep Graphology for graph operations - *Retained graphology dependencies*

## 3. Obsidian API Migration

### Update Plugin Structure
- [ ] Update manifest.json minAppVersion to 1.5.0
- [ ] Replace deprecated metadataCache/workspace APIs
- [ ] Implement proper mobile support
- [ ] Update event handling patterns

## 4. Simplified Settings & Constants

### Reduce Complexity
- [ ] Remove 12+ algorithm types from Constants.ts
- [ ] Keep only: exclusion regex/tags, candidate caps
- [ ] Remove complex UI options
- [ ] Focus on three core functions

## Key Implementation Tasks

1. [x] Set up Vite build system with modern tooling - *✅ COMPLETED: Modern Vite build with fast esbuild compilation*
2. [ ] Create BM25Service.ts for text indexing/similarity
3. [ ] Extend MyGraph.ts with RA and PPR algorithms  
4. [ ] Update manifest and API usage for Obsidian 1.5.0+
5. [ ] Simplify Constants.ts to three algorithm types
6. [ ] Remove legacy NLP dependencies (wink-nlp, sentiment)
7. [ ] Create efficient caching layer for computations
8. [ ] Implement incremental index updates

### ✅ Task #1 Summary - Vite Build System Modernization
- **Status**: Complete
- **What was done**: 
  - Migrated from Rollup to Vite with proper ESM configuration
  - Updated to TypeScript 5.x with strict mode enabled
  - Fixed all import paths from 'src/' to relative imports
  - Updated Svelte to v4 with proper preprocessing
  - Both production and development builds working successfully
- **Build output**: `main.js` (326KB, 82KB gzipped)
- **Next task**: Create BM25Service.ts for text indexing/similarity

## Focus
This plan focuses on building the foundation for three optimized algorithms while modernizing the tech stack for better performance and maintainability.

### Three Core Functions (from MODERNIZATION_PLAN.md)
1. **"Most similar notes"** → BM25F content + light structural overlap
2. **"What should this note be linked to?"** → Resource Allocation gated by text relevance  
3. **"What else is worth attention?"** → Personalized PageRank with restart at current note