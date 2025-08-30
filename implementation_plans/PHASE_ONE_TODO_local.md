# Phase 1 Implementation Plan: Foundation & Core Algorithm Design

Based on analysis of the codebase, here's the plan for Phase 1 (Weeks 1-2):

## 1. Algorithm Architecture Implementation

### BM25F Text Similarity Service (`src/index/BM25Service.ts`) ✅ COMPLETED
- [x] Create inverted index with field-weighted BM25F scoring
- [x] Implement tokenizer (simple regex + lowercase + ASCII folding)
- [x] Build sparse vector representation with L2 normalization
- [x] Add incremental update capability for changed files

### Resource Allocation Index (extend `src/MyGraph.ts`) ✅ COMPLETED
- [x] Implement RA formula: `Σ_{z ∈ neighbors(n)∩neighbors(m)} 1/deg(z)`
- [x] Gate by BM25 similarity (top-400 candidates)
- [x] Add shared neighbor explanation generation

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
- [x] Remove wink-nlp (replace with simple tokenization) - *Completed: Replaced with BM25Service tokenizer*
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
2. [x] Create BM25Service.ts for text indexing/similarity - *✅ COMPLETED: Full BM25F implementation with PR review fixes*
3. [x] Extend MyGraph.ts with RA algorithm - *✅ COMPLETED: Resource Allocation algorithm implemented and UI-integrated*
4. [ ] Extend MyGraph.ts with PPR algorithm
5. [ ] Update manifest and API usage for Obsidian 1.5.0+
6. [ ] Simplify Constants.ts to three algorithm types
7. [x] Remove legacy NLP dependencies (wink-nlp, sentiment) - *✅ COMPLETED: Removed from package.json and replaced functionality*
8. [ ] Create efficient caching layer for computations
9. [x] Implement incremental index updates - *✅ COMPLETED: BM25Service supports add/remove/update operations*

### ✅ Task #1 Summary - Vite Build System Modernization
- **Status**: Complete
- **What was done**: 
  - Migrated from Rollup to Vite with proper ESM configuration
  - Updated to TypeScript 5.x with strict mode enabled
  - Fixed all import paths from 'src/' to relative imports
  - Updated Svelte to v4 with proper preprocessing
  - Both production and development builds working successfully
- **Build output**: `main.js` (326KB, 82KB gzipped)

### ✅ Task #2 Summary - BM25F Text Similarity Service
- **Status**: Complete
- **What was done**:
  - Implemented full BM25F algorithm with field-weighted scoring (title=2.0x, content=1.0x)
  - Created inverted index with document frequency tracking and incremental updates
  - Built custom tokenizer with ASCII folding, stopword removal, and configurable parameters
  - Added L2 normalization for consistent similarity scores
  - Integrated into MyGraph.ts replacing legacy BoW cosine similarity
  - Fixed critical orphan notes indexing issue - now indexes ALL markdown files
  - Added comprehensive input validation and error handling
  - Made all parameters configurable via BM25Options interface
  - Removed wink-nlp dependencies completely
- **Build output**: `main.js` (329.58KB, 83.26KB gzipped)
- **PR**: https://github.com/isaaclyon/related-notes/pull/3

### ✅ Task #3 Summary - Resource Allocation Algorithm Implementation
- **Status**: Complete
- **What was done**:
  - Implemented Resource Allocation algorithm in MyGraph.ts with formula: `RA(n,m) = Σ_{z ∈ neighbors(n)∩neighbors(m)} 1/deg(z)`
  - Added BM25 similarity gating (top-400 candidates) for performance optimization
  - Generated shared neighbor explanations showing individual contributions
  - Added 'Resource Allocation' to Subtype enum in Interfaces.ts
  - Integrated into UI: added to Constants.ts algsToShow and ANALYSIS_TYPES
  - Added UI routing in AnalysisComponent.svelte using TableComponent
  - Fixed Codex feedback about UI integration issues
- **Build output**: `main.js` (330.63KB, 83.50KB gzipped)
- **PR**: https://github.com/isaaclyon/related-notes/pull/4
- **Next task**: Implement Personalized PageRank algorithm

## Focus
This plan focuses on building the foundation for three optimized algorithms while modernizing the tech stack for better performance and maintainability.

### Three Core Functions (from MODERNIZATION_PLAN.md)
1. **"Most similar notes"** → BM25F content + light structural overlap ✅ COMPLETED
2. **"What should this note be linked to?"** → Resource Allocation gated by text relevance ✅ COMPLETED
3. **"What else is worth attention?"** → Personalized PageRank with restart at current note