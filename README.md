# Related Notes

Related Notes is an Obsidian plugin that analyzes a vault to surface relationships between notes using three algorithms: link prediction, text similarity, and influence ranking. The analysis runs locally and updates in real time.

## Quick start

1. Install the plugin from Obsidian’s Community Plugin store (search for “Related Notes”).
2. Enable it in **Settings → Community Plugins**.
3. Open any note.
4. Run a command from the palette (e.g. `Related Notes: Open Similar Content`).
5. View results in the analysis panel.

## Algorithms

### Link suggestions (Resource Allocation)

* Predicts missing links by analyzing shared connections between notes.
* Useful for identifying related notes that are not yet linked.
* Example: If notes A and B both reference note C, a link between A and B may be suggested.

### Similar content (BM25F text similarity)

* Finds notes with overlapping content beyond keyword matches.
* Weighs titles higher than body text.
* Example: Detects that a “Deep Work” note and a “Productivity Systems” note are related.

### Influence ranking (Personalized PageRank)

* Ranks important notes in the context of the current note.
* Surfaces frequently referenced or central notes.
* Example: While viewing a “Climate Change” note, it highlights the most cited policy papers in the vault.

## Commands

| Command                                     | Description         |
| ------------------------------------------- | ------------------- |
| `Related Notes: Open Resource Allocation`   | Link prediction     |
| `Related Notes: Open Similar Content`       | Text similarity     |
| `Related Notes: Open Influence Ranking`     | PageRank analysis   |
| `Related Notes: Refresh Related Notes View` | Refreshes the panel |

## Configuration

* **Algorithm selection**: Choose which algorithms appear and set a default.
* **Content filtering**: Exclude notes by type, regex, or tag. Option to hide zero or infinite scores.
* **Performance options**: Incremental indexing, debug modes.

## How it works

1. **Content analysis**: Indexes text with BM25F for similarity.
2. **Graph analysis**: Applies Resource Allocation and PageRank to the note graph.
3. **Context ranking**: Adjusts results based on the current note.

Algorithms combine for efficiency. Example: Link suggestions use text similarity to narrow candidates before applying graph analysis.

## Advanced features

* Real-time updates: Results refresh automatically when notes change.
* Performance: Uses pre-filtering and incremental indexing for large vaults.
* Customization: CSS classes for result rows and exclusion patterns.

## Technical details

* TypeScript 5.x, Svelte 4, Vite.
* Graphology for graph operations.
* Custom BM25F implementation.

**Algorithms**

* Resource Allocation: `RA(a,b) = Σ 1/deg(z)` over shared neighbors z.
* BM25F: Title weight 2×, body weight 1×.
* Personalized PageRank: α = 0.15 damping, boosts for folder/tag proximity.

Performance: Handles vaults with thousands of notes, with sub-second runtime for most queries.

## Installation

From Obsidian Community Plugins:

1. Open **Settings → Community Plugins**.
2. Search “Related Notes.”
3. Install and enable.

## Repository and credits

* Author: [isaaclyon](https://github.com/isaaclyon)
* Repository: [github.com/isaaclyon/related-notes](https://github.com/isaaclyon/related-notes)

Based on prior work from the [Graph Analysis plugin](https://github.com/SkepticMystic/graph-analysis) by SkepticMystic and HEmile.

## Contributing

* Report issues: [GitHub issues](https://github.com/isaaclyon/related-notes/issues)
* Pull requests welcome

## Recent changes

**v0.15.5** – Plugin renamed to “Related Notes.”
**v0.15.4** – Modernization: reduced algorithms from 12+ to 3, improved performance, smaller bundle, updated stack (TypeScript 5, Svelte 4).
