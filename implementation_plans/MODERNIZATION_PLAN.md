# Graph Analysis Plugin Modernization Plan

## Philosophy: Three Core Functions, Done Right

**OLD APPROACH**: Multiple complex algorithms with confusing options  
**NEW APPROACH**: Three focused functions, one optimal method each

1. **"Most similar notes"** → BM25F content + light structural overlap
2. **"What should this note be linked to?"** → Resource Allocation gated by text relevance  
3. **"What else is worth attention?"** → Personalized PageRank with restart at current note

## Current State Analysis
- **Last Update**: May 2022 (v0.15.4) - 2.5+ years stale
- **Obsidian API**: v0.12.17 (current is ~1.6.x)
- **Tech Stack**: TypeScript, Svelte 3.35, Rollup, Graphology
- **Known Issues**: 26 open issues including rendering problems, index refresh issues, theme compatibility

## Phase 1: Foundation & Core Algorithm Design (Week 1-2)

### 1. Algorithm Architecture
**Most Similar Notes**
- **Method**: BM25F-weighted content similarity (85%) + Weighted Jaccard over links (15%)
- **Content weighting**: Title x3, headings x2, body x1, tags/aliases x2
- **Implementation**: L2-normalized vectors for cosine similarity, sparse representation
- **Explainability**: Show top matching terms, structural overlap score

**Link Recommendations**  
- **Method**: Resource Allocation Index gated by BM25 similarity
- **Formula**: `RA(n,m) = Σ_{z ∈ neighbors(n)∩neighbors(m)} 1/deg(z)`
- **Gate**: Only compute RA for BM25 top-400 similar notes, or multiply RA × normalized BM25
- **Output**: Top candidates with shared neighbor explanation + text snippet

**Worth Attention**
- **Method**: Personalized PageRank with α=0.15, restart at current note
- **Weights**: Standard edges + light boost for same-folder/tag matches (1.1x)
- **Optional**: Time decay for recently modified notes
- **Output**: Multi-hop influence ranking with path explanation

### 2. Build System Modernization
- Migrate from Rollup to Vite with esbuild
- Update to TypeScript 5.x with strict mode
- Upgrade Svelte to v4.x
- Configure ES2020 target with proper polyfills

### 3. Obsidian API Migration
- Update manifest.json to minAppVersion 1.5.0+
- Replace deprecated metadataCache/workspace APIs
- Add mobile support declarations
- Implement proper event handling patterns

## Phase 2: Efficient Implementation (Week 2-3)

### 1. Indexing Service (`src/index/BM25.ts`)
- **Tokenizer**: Simple regex word-split + lowercase + ASCII fold
- **Inverted index**: term → postings [{docId, tf}] + per-doc stats
- **Doc vectors**: Precompute BM25F-weighted, L2-normalized sparse vectors
- **Incremental**: Update only changed files, maintain df/idf stats

### 2. Graph Service (extend `MyGraph.ts`)
- **Resource Allocation**: Fast intersection over neighbor sets
- **Personalized PageRank**: Power iteration with early stopping
- **Caching**: LRU cache for expensive computations
- **Performance**: O(N) similarity via candidate prefiltering

### 3. Event-Driven Updates
- Hook `vault.on('modify')` and `metadataCache.on('resolved')`
- Debounced batch processing for file changes
- Maintain adjacency sets and degree arrays incrementally

## Phase 3: Streamlined UI/UX (Week 3-4)

### 1. Three-Card Interface
**Compact right-side panel with:**
- **Most Similar**: Top 5-10 with explanation chips ("content 0.82", "links 0.11")
- **Link To**: Top 5 with one-click "Insert link" buttons, shared neighbor context
- **Worth Attention**: Top 5 with PPR reasoning, pin/snooze affordances

### 2. User Experience
- **Actions**: Open, Preview, Insert link, Batch operations
- **Feedback**: Skeleton loading, progress on first index, <300ms response times
- **Commands**: Three hotkeys for each function, inline status bar counts
- **Explainability**: One-line subtitles, "why" objects in all results

### 3. Visual Polish
- Theme-aware design with Obsidian CSS variables
- Keyboard navigation and accessibility
- Responsive layout for different pane sizes
- Subtle animations for state changes

## Phase 4: Performance & Reliability (Week 4-5)

### 1. Optimization
- **Candidate filtering**: Prefilter via top-M terms of current note
- **Approximate algorithms**: Push-based PPR for large vaults
- **Memory management**: Typed arrays, sparse data structures
- **Safety caps**: Max candidates (3k similarity, 400 RA) for responsiveness

### 2. Testing Infrastructure
- Unit tests for each algorithm with golden fixtures
- Property-based tests for score invariants (symmetry, ranges)
- Performance benchmarks with tinybench
- Integration tests with mocked Obsidian APIs

### 3. Code Quality
- ESLint + Prettier with strict TypeScript
- Pre-commit hooks and CI pipeline  
- Zod schema validation for settings
- Clear error handling and fallbacks

## Phase 5: Polish & Release (Week 5-6)

### 1. Minimal Settings
- Keep existing exclusion regex/tags
- Add only: candidate caps, recency half-life (if needed)
- **No algorithm toggles** - one method per function

### 2. Documentation
- Clear README with the three-function philosophy
- Algorithm explanations with examples
- Migration guide from old version
- Performance characteristics and vault size limits

### 3. Release Strategy
- Beta releases with feedback collection
- Phased rollout to handle edge cases
- Performance monitoring in production
- Clear versioning and rollback plan

## Key Technical Decisions

### Keep
- **Graphology**: Solid graph library, reuse existing graph building
- **Svelte**: Good for complex interactive UI
- **Core infrastructure**: File watching, metadata cache integration

### Replace
- **Multiple algorithms**: → Three focused functions
- **Complex UI**: → Simple three-card interface  
- **Rollup**: → Vite for faster development
- **Wink-nlp**: → Simple regex tokenization

### Add
- **BM25F indexing**: Fast text similarity with field boosting
- **Resource Allocation**: Better link prediction than existing methods
- **Personalized PageRank**: Multi-hop discovery algorithm
- **Performance monitoring**: Benchmarks and complexity caps

## Success Metrics
- **Simplicity**: 3 functions vs 12+ current analysis types
- **Speed**: <300ms response time, 10x faster indexing
- **Accuracy**: Better relevance than existing similarity measures
- **Adoption**: Address top GitHub issues, positive user feedback
- **Maintainability**: 50% less code, clearer architecture

## Implementation Notes
This plan prioritizes **focus over features**. Each phase builds toward a plugin that does three things exceptionally well rather than many things poorly. The emphasis is on fast, explainable results that help users discover connections in their knowledge base without overwhelming them with options.

The three-function approach makes the plugin easier to understand, test, and maintain while providing clear value propositions for different user needs.