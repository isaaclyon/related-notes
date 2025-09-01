# Related Notes

**Never miss a connection in your knowledge graph.**

Related Notes analyzes your entire Obsidian vault to surface meaningful relationships between notes that you might otherwise miss. Using three sophisticated algorithms, it discovers content similarities, predicts missing links, and identifies influential notes—all in real-time as you write.

Instead of relying on memory or manual browsing to find related content, Related Notes does the heavy lifting for you, turning your notes into an intelligent, interconnected knowledge system.

## Quick Start

1. **Install** the plugin from Obsidian's Community Plugin store (search for "Related Notes")
2. **Enable** the plugin in Settings → Community Plugins
3. **Open any note** you want to analyze
4. **Run the command** `Related Notes: Open Resource Allocation` from the command palette
5. **Explore results** in the analysis panel that appears

**Try this**: Open a note about a topic you've written about before, then run Related Notes. You'll likely discover connections you never noticed.

## Three Powerful Algorithms

Related Notes focuses on three proven algorithms, each designed for a specific type of discovery:

### 🔗 **Link Suggestions** (Resource Allocation)
*"What should this note be connected to?"*

Predicts missing links by analyzing shared connections. If two notes reference many of the same topics, they're probably related—even if you haven't linked them yet.

**Perfect for**: Building a more connected knowledge graph, discovering related research, finding gaps in your linking structure.

**Example**: Your note on "Machine Learning" and "Statistics" both reference "Data Analysis"—Related Notes suggests connecting them directly.

### 📄 **Similar Content** (Advanced Text Similarity)  
*"What notes discuss similar topics?"*

Uses sophisticated text analysis (BM25F) to find content similarities that go beyond simple keyword matching. Weighs titles higher than body text and accounts for context.

**Perfect for**: Research synthesis, finding related ideas expressed differently, content consolidation.

**Example**: Discovers that your "Deep Work" note relates to your "Productivity Systems" note, even though they use different terminology.

### ⭐ **Influence Ranking** (Personalized PageRank)
*"What else deserves my attention right now?"*

Identifies notes that are important *in the context* of your current note. Uses a personalized version of Google's PageRank algorithm to surface influential related content.

**Perfect for**: Literature reviews, finding authoritative sources in your vault, identifying key concepts in a domain.

**Example**: When viewing your "Climate Change" note, surfaces your most referenced papers on environmental policy, even if they're not directly linked.

## Configuration

### Quick Configurations

**Focus Mode**: Hide already-linked notes to discover new connections
```css
/* Add to your CSS snippets */
tr.analysis-linked { display: none; }
```

**Highlight Unlinked**: Emphasize potential new connections
```css
tr.analysis-not-linked { 
  border-left: 3px solid var(--accent-color); 
  font-weight: 500;
}
```

### Settings Panel

**Algorithm Selection**
- Choose which algorithms appear in your analysis view
- Set your preferred default algorithm

**Content Filtering**  
- Exclude notes by file type, regex pattern, or tags
- Hide zero/infinity scores to focus on meaningful results

**Performance**
- Debug modes for troubleshooting
- Incremental indexing keeps analysis fast as your vault grows

## How It Works

Related Notes runs three complementary analyses:

1. **Content Analysis**: Indexes your notes' text using advanced NLP techniques
2. **Graph Analysis**: Maps your link structure and identifies patterns  
3. **Context Ranking**: Scores relationships based on your current focus

The algorithms work together—for example, Link Suggestions uses text similarity to pre-filter candidates before applying graph analysis, making it both more accurate and faster.

## Installation & Usage

### From Obsidian Community Plugins
1. Open Settings → Community Plugins
2. Browse and search for "Related Notes"
3. Install and enable the plugin

### Commands Available
- `Related Notes: Open Resource Allocation` - Link prediction
- `Related Notes: Open Similar Content` - Text similarity  
- `Related Notes: Open Influence Ranking` - PageRank analysis
- `Related Notes: Refresh Related Notes View` - Update analysis

### Basic Workflow
1. Open a note you're working on
2. Launch any Related Notes algorithm
3. Review suggestions in the analysis panel
4. Click note names to navigate and explore
5. Link related notes to strengthen your graph

## Advanced Features

### Real-Time Updates
Related Notes automatically updates its analysis as you modify notes, create new content, or add links. No manual refreshing needed.

### Performance Optimized
- **Smart pre-filtering**: Algorithms use multiple stages to stay fast even in large vaults
- **Incremental indexing**: Only re-analyzes changed content
- **Efficient bundling**: ~287KB plugin size despite sophisticated algorithms

### Customization
- CSS classes on every result row for custom styling
- Configurable exclusion patterns  
- Algorithm-specific settings for different use cases

## Technical Details

**Built with modern web technologies:**
- TypeScript 5.x with strict mode
- Svelte 4.x for reactive UI
- Vite build system
- Graphology for graph operations
- Custom BM25F text similarity implementation

**Algorithm specifics:**
- **Resource Allocation**: `RA(a,b) = Σ 1/deg(z)` for shared neighbors z
- **BM25F**: Field-weighted scoring with title boost (2x) and body content (1x)  
- **Personalized PageRank**: α=0.15 damping, folder/tag relationship boosts

**Performance characteristics:**
- Handles vaults with thousands of notes
- Sub-second analysis for most algorithms
- Memory-efficient graph representation

## Repository & Credits

**Author**: [isaaclyon](https://github.com/isaaclyon)  
**Repository**: [github.com/isaaclyon/related-notes](https://github.com/isaaclyon/related-notes)

### Original Credits

This plugin builds on the foundational work of the original [Graph Analysis plugin](https://github.com/SkepticMystic/graph-analysis) by **SkepticMystic** and **HEmile**. Their pioneering work in applying graph algorithms to knowledge management made this modernized version possible.

**Original authors:**
- SkepticMystic: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/G2G454TZF)
- HEmile: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Emile)

### Contributing

Found a bug? Have a feature idea? Contributions are welcome:
- [Report issues](https://github.com/isaaclyon/related-notes/issues)
- [Submit pull requests](https://github.com/isaaclyon/related-notes/pulls)
- Share your use cases and workflows

## Algorithm References

- **Resource Allocation**: Zhou et al., "Predicting missing links via local information"
- **Personalized PageRank**: Page et al., "The PageRank Citation Ranking"
- **BM25F**: Robertson & Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond"

For deeper understanding of graph algorithms, see [Neo4j's Graph Data Science documentation](https://neo4j.com/docs/graph-data-science/current/algorithms/).

---

## Recent Changes

**v0.15.5** - Plugin renamed to "Related Notes" with improved documentation and user experience.

**v0.15.4** - **Phase 1 Modernization Complete**  
Complete rewrite focusing on three optimized algorithms instead of 12+ legacy options:

- 🚀 **Performance**: 13.5% smaller bundle + sophisticated algorithm optimizations
- 🧠 **Smarter algorithms**: Advanced BM25F similarity, Resource Allocation link prediction, Personalized PageRank
- ⚡ **Modern stack**: TypeScript 5, Svelte 4, Vite build system  
- 🎯 **Focused experience**: Three powerful algorithms instead of overwhelming choice

**Breaking changes**: Legacy algorithms (Co-Citations, Community Detection, etc.) removed in favor of the new optimized implementations.