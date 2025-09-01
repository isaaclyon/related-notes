# Graph Analysis

Graph Analysis adds the **analysis view** to Obsidian which implements sophisticated
algorithms that discover meaningful relationships between notes in your vault using
advanced graph analysis and natural language processing.

The Graph Analysis view shows a table of note names with computed scores, each
representing the value of some graph analysis algorithm applied to that note in
relation to the current note.

e.g.

- `[[A]] is 0.85 similar to [[B]]` (content similarity)
- `[[A]] has a 0.73 Resource Allocation score with [[B]]` (link prediction) 
- `[[A]] has a 0.42 PageRank score from [[B]]` (influence ranking)

## Analysis Types

Graph Analysis focuses on **3 core algorithms** optimized for practical note relationship discovery:

1. **Similarity** - Content-based note similarity using advanced text analysis
2. **Link Prediction** - Intelligent suggestions for which notes should be connected
3. **Centrality** - Influence ranking to surface important related notes

Each algorithm uses sophisticated mathematical formulations designed for real-world knowledge management.

### Similarity: Otsuka-Chiai (BM25F Text Similarity)

**What it does**: "Most similar notes" - Finds content-similar notes using advanced text analysis.

The Otsuka-Chiai algorithm uses **BM25F** (Best Matching 25 with Fields), a sophisticated information retrieval algorithm that goes beyond simple keyword matching:

- **Field-weighted scoring**: Title content gets 2x weight, body content gets 1x weight
- **Advanced preprocessing**: Stopword removal, ASCII folding, tokenization
- **Smart normalization**: L2 normalization ensures consistent similarity scores
- **Content-aware**: Analyzes actual note content, not just graph structure

This algorithm excels at finding notes that discuss similar topics, concepts, or themes, even if they're not directly linked in your knowledge graph.

**Use case**: Discover thematically related notes that might not be obviously connected through links, perfect for serendipitous knowledge discovery.

### Link Prediction: Resource Allocation

**What it does**: "What should this note be linked to?" - Predicts which notes should be connected based on shared neighbors weighted by their degree.

The Resource Allocation algorithm uses a sophisticated approach to link prediction:

**Formula**: `RA(a,b) = Σ_{z ∈ neighbors(a)∩neighbors(b)} 1/deg(z)`

- **Shared neighbor analysis**: Looks at notes that both notes are connected to
- **Degree weighting**: Common neighbors with fewer connections provide stronger evidence  
- **Performance optimization**: Uses BM25 text similarity to pre-filter top-400 candidates before applying graph analysis
- **Smart explanations**: Shows which shared neighbors contribute to the recommendation

**Key insight**: If two notes share many low-degree neighbors, they're more likely to be conceptually related than if they share high-degree "hub" neighbors.

**Use case**: Discover missing connections in your knowledge graph - notes that should logically be linked based on their relationship patterns with other notes.

### Centrality: Personalized PageRank

**What it does**: "What else is worth attention?" - Personalized influence ranking starting from the current note.

Personalized PageRank uses the classic PageRank algorithm with a personalized twist:

- **Power iteration algorithm**: Uses iterative calculation with damping factor α=0.15
- **Personalized restart vector**: Always "teleports" back to the current note, creating influence rankings relative to your starting point
- **Relationship boosts**: Notes in the same folder or sharing tags get a 1.1x edge weight boost  
- **Time decay**: Recent modifications can influence rankings (configurable)
- **Convergence detection**: Automatically stops when stable (ε=1e-6, max 100 iterations)

**Key insight**: Rather than finding globally important notes, this finds notes that are important *in the context* of your current note.

**Use case**: Surface influential notes within your current context - discover important related concepts, key supporting materials, or central ideas that connect to your current focus.

## Technology Stack

Graph Analysis is built with modern web technologies for optimal performance:

- **TypeScript 5.x** with strict mode for type safety
- **Svelte 4.x** for reactive UI components  
- **Vite** build system for fast development and optimized bundles
- **Graphology** for efficient graph data structures and algorithms
- **BM25F** custom implementation for advanced text similarity
- **Obsidian API 1.4.0+** for seamless plugin integration

## Performance Optimizations

- **Smart algorithm gating**: Resource Allocation pre-filters candidates using BM25 similarity
- **Incremental indexing**: Text similarity index updates incrementally as notes change
- **Early convergence**: PageRank stops calculation when mathematically stable
- **Bundle optimization**: ~287KB main.js (83KB gzipped) despite sophisticated algorithms

## Customization & Styling

### CSS Utility Classes

Each row in the analysis tables includes CSS classes for custom styling:

- `analysis-linked` - Applied to notes that are already linked to the current note
- `analysis-not-linked` - Applied to notes that are not linked to the current note

This allows you to customize the appearance based on connection status:

```css
/* Make already-linked notes more subtle */
tr.analysis-linked {
  opacity: 0.5;
}

/* Highlight unlinked notes that might be worth connecting */
tr.analysis-not-linked {
  border-left: 3px solid var(--accent-color);
}

/* Or hide linked notes to focus on potential new connections */
tr.analysis-linked {
  display: none;
}
```

### Settings Configuration

The plugin provides several configuration options in the settings panel:

**Algorithm Selection**:
- Choose which of the 3 algorithms to show in the analysis view
- Set the default algorithm that opens when you launch the analysis view

**Display Options**:
- **Hide Infinity values** - Exclude infinite scores from results
- **Hide Zero values** - Exclude zero scores to focus on meaningful relationships  
- **File type inclusion** - Control which file types are included in analysis
- **Exclusion patterns** - Use regex or tags to exclude specific notes

**Debug Options**:
- Debug mode for console logging
- Super debug mode for detailed algorithm tracing

## Installation & Usage

1. Install the plugin from the Obsidian Community Plugin store by searching for "Graph Analysis"
2. Enable the plugin in your Obsidian settings
3. Open the Graph Analysis view using:
   - Command palette: "Graph Analysis: Open Resource Allocation" (or other algorithms)
   - Or use the command palette and search for "Graph Analysis"
4. The analysis view will show in a new pane with a table of related notes

## How It Works

1. **Open a note** you want to analyze
2. **Launch Graph Analysis** - the algorithms will analyze your entire vault in relation to the current note  
3. **Review the results** - each algorithm provides different insights:
   - **Similarity**: Notes with similar content
   - **Link Prediction**: Notes you might want to link to
   - **Centrality**: Important notes in the context of your current note
4. **Click on results** to navigate to related notes and explore connections

## Algorithm References

- **Resource Allocation**: Based on network link prediction research
- **Personalized PageRank**: Adaptation of the classic PageRank algorithm with personalization
- **BM25F**: Implementation of "Best Matching 25 with Fields" from information retrieval literature

For more information on graph algorithms, see [Neo4j's Graph Data Science documentation](https://neo4j.com/docs/graph-data-science/current/algorithms/).

## Repository & Credits

This is a modernized fork of the original [Graph Analysis plugin](https://github.com/SkepticMystic/graph-analysis) by SkepticMystic and HEmile.

**Current repository**: [https://github.com/isaaclyon/related-notes](https://github.com/isaaclyon/related-notes)

**Original authors**:
- SkepticMystic: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/G2G454TZF)
- Emile: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Emile)

---

## Recent Changes (v0.15.4)

**Phase 1 Modernization Complete**: This version represents a complete modernization of Graph Analysis, focusing on 3 optimized algorithms instead of the previous 12+ algorithms. Key improvements:

- **🚀 Performance**: 13.5% bundle size reduction + sophisticated algorithm optimizations
- **🧠 Smarter algorithms**: Advanced BM25F text similarity, Resource Allocation link prediction, and Personalized PageRank
- **⚡ Modern tech stack**: TypeScript 5, Svelte 4, Vite build system
- **🎯 Focused experience**: 3 core algorithms instead of overwhelming choice

**Breaking changes**: Co-Citations, Community Detection, and several other algorithms have been removed in favor of the new optimized implementations.
