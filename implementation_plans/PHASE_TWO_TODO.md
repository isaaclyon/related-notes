# Phase 2 Implementation Plan: Efficient Implementation

Based on analysis of the current codebase and Phase 1 completion, here's the plan for Phase 2 (Weeks 2-3):

## Status Overview

✅ **COMPLETED IN PHASE 1**:
- BM25Service with full indexing capability
- Resource Allocation Index with BM25 gating
- Personalized PageRank with edge weighting
- Modern Vite build system
- Core algorithm implementations

## 1. Real-Time Incremental Updates

### Event-Driven File Watching ⚠️ **HIGH PRIORITY**
- [ ] Hook `vault.on('modify')` for file content changes
- [ ] Hook `metadataCache.on('resolved')` for metadata updates  
- [ ] Hook `vault.on('create')` and `vault.on('delete')` for file lifecycle
- [ ] Hook `vault.on('rename')` for path changes
- [ ] Implement debounced batch processing (300ms delay) for rapid changes
- [ ] Update BM25 index incrementally without full rebuild

### Graph Structure Updates
- [ ] Maintain adjacency sets incrementally on link changes
- [ ] Update node degrees when edges are added/removed  
- [ ] Invalidate cached PageRank results when graph structure changes
- [ ] Handle unresolved link creation/resolution dynamically

## 2. Performance Optimization & Caching

### LRU Cache Implementation ⚠️ **HIGH PRIORITY**
- [ ] Create generic LRU cache utility class
- [ ] Cache BM25 similarity results (key: note path + query hash)
- [ ] Cache Resource Allocation results (key: source + target node pair)
- [ ] Cache Personalized PageRank results (key: source node + graph state hash)
- [ ] Implement cache invalidation on relevant file/graph changes
- [ ] Add cache size limits and memory management

### Advanced Candidate Prefiltering
- [ ] Implement "push-based PPR" for large vaults (>5000 notes)
- [ ] Add safety caps: max 3k similarity candidates, 400 RA candidates
- [ ] Prefilter via top-M terms of current note for BM25 queries
- [ ] Use typed arrays and sparse data structures for memory efficiency

## 3. Obsidian API Migration ⚠️ **MEDIUM PRIORITY**

### Update Plugin Structure
- [ ] Update manifest.json minAppVersion to 1.5.0+
- [ ] Replace any deprecated metadataCache/workspace APIs
- [ ] Add mobile support declarations in manifest
- [ ] Update event handling patterns to modern Obsidian standards
- [ ] Test compatibility with latest Obsidian versions

### Error Handling & Robustness
- [ ] Add comprehensive error boundaries for algorithm failures
- [ ] Implement fallback behaviors when APIs fail
- [ ] Add retry logic for file system operations
- [ ] Handle vault corruption/inconsistency gracefully

## 4. Settings Simplification ⚠️ **LOW PRIORITY**

### Reduce Algorithm Complexity
- [ ] Remove 12+ algorithm types from Constants.ts
- [ ] Keep only core three functions: "Most Similar", "Link Suggestions", "Relevant Notes"
- [ ] Remove complex UI toggles and options
- [ ] Preserve only: exclusion regex/tags, candidate caps, recency half-life

### Clean Up Legacy Code
- [ ] Remove unused algorithm implementations
- [ ] Clean up Interfaces.ts to match simplified approach
- [ ] Update UI components to reflect three-function focus
- [ ] Remove deprecated NLP-related settings

## 5. Memory Management & Safety

### Resource Management
- [ ] Implement memory usage monitoring and warnings
- [ ] Add configurable memory limits for different operations  
- [ ] Implement background garbage collection for unused caches
- [ ] Add progress indicators for long-running operations

### Safety Mechanisms
- [ ] Add timeout protection for runaway algorithms
- [ ] Implement circuit breakers for failing operations
- [ ] Add user-cancellable long operations
- [ ] Prevent UI blocking during heavy computation

## Key Implementation Tasks

### Priority 1: Real-Time Updates
1. [ ] Implement `vault.on('modify')` handler with debouncing
2. [ ] Create incremental BM25 index update methods
3. [ ] Add graph structure maintenance on link changes
4. [ ] Test with rapid file modification scenarios

### Priority 2: Performance & Caching  
5. [ ] Build LRU cache system with proper invalidation
6. [ ] Add candidate prefiltering optimizations
7. [ ] Implement memory usage monitoring
8. [ ] Benchmark against large vaults (1000+ notes)

### Priority 3: API Migration & Cleanup
9. [ ] Update manifest.json and test mobile compatibility
10. [ ] Simplify Constants.ts to three core algorithms
11. [ ] Remove legacy algorithm implementations
12. [ ] Update error handling for modern Obsidian APIs

## Success Criteria

- **Real-time responsiveness**: File changes reflected in recommendations within 500ms
- **Memory efficiency**: Plugin uses <100MB for vaults with 5000+ notes
- **Cache hit rates**: >80% cache hits for repeated similarity queries
- **Mobile compatibility**: Plugin works on Obsidian mobile without errors
- **Simplified UI**: Only three analysis types visible to users

## Technical Debt Addressed

- **Index rebuild bottleneck**: Currently rebuilds entire BM25 index on graph init
- **No caching layer**: Repeated queries recompute expensive operations
- **Legacy API usage**: Still using older Obsidian API patterns
- **Algorithm complexity**: 12+ algorithms when only 3 are needed for Phase 2+

## Focus

This phase transforms the solid algorithmic foundation from Phase 1 into a production-ready system that responds to changes in real-time, performs efficiently on large vaults, and provides a streamlined user experience focused on the three core functions.

The emphasis is on **performance, responsiveness, and simplification** - making the plugin fast enough and simple enough for daily use.