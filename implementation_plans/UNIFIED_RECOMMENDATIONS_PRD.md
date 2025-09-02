# Unified Recommendations - Product Requirements Document

## Vision
Create a "Home" tab that combines all three algorithms into a single, easy-to-understand recommendation list for non-technical users.

## Core Concept
**Simple weighted average of the three algorithms:**
- Link Suggestions (Resource Allocation)
- Relevant Notes (Personalized PageRank) 
- Similar Content (BM25F)

## User Experience

### Main Interface
- **Home tab**: Default view when plugin opens
- **Simple list**: Top 15 recommendations (configurable), no complex scoring
- **Visual similarity indicators**: Up/side/down arrows or similar instead of numbers
- **Algorithm breakdown**: Three small columns showing each algorithm's "vote"

### Similarity Display Options
Instead of raw scores, show:
- ⬆️ **High similarity** (top 33% of scores)
- ➡️ **Medium similarity** (middle 33%)
- ⬇️ **Low similarity** (bottom 33%)

Or alternative visual indicators:
- 🔥 🔥 🔥 = High
- 🔥 🔥 = Medium  
- 🔥 = Low

### Algorithm Columns
Three mini-columns showing each algorithm's assessment:
| Note Title | Link | Content | Relevance |
|------------|------|---------|-----------|
| Meeting Notes | ⬆️ | ➡️ | ⬆️ |
| Project Ideas | ➡️ | ⬆️ | ⬇️ |

## Technical Implementation

### Score Combination
1. **Exclude zeros**: Treat 0 scores as null, don't include in average
2. **Simple weighted average**: `(LinkScore × LinkWeight + ContentScore × ContentWeight + RelevanceScore × RelevanceWeight) / (number of non-zero scores)`
3. **New notes**: Show nothing until at least one algorithm produces a score

### Default Weights (configurable in settings)
- **Link Suggestions**: 33% (good for discovering connections)
- **Similar Content**: 34% (most intuitive for users)
- **Relevant Notes**: 33% (helps with discovery)

### Settings Panel
Simple sliders or input fields:
```
Link Predictions:     [====|====] 33%
Content Similarity:   [=====|===] 34%  
Note Relevance:       [====|====] 33%
Max Results:          [====|====] 15
```

## User Stories

### Primary Use Case
"As a knowledge worker, I want to see the most relevant notes to my current note without understanding graph theory or search algorithms."

### Secondary Use Cases
- "I want to adjust how much the system weighs different types of similarity"
- "I want to see why a note was recommended at a glance"
- "I want this to work immediately for new notes as soon as there's any data"

## Success Criteria
- **Accessibility**: Non-technical users can understand recommendations immediately
- **Flexibility**: Power users can adjust weights if desired
- **Performance**: Same speed as individual algorithms
- **Clarity**: Visual indicators are more intuitive than numeric scores

## Implementation Notes
- Add to existing `Constants.ts` as fourth algorithm type
- Create new `UnifiedTableComponent.svelte` with visual indicators
- Handle missing scores gracefully (new notes, disconnected notes)
- Use consistent visual language across all tabs

## Out of Scope (for now)
- Complex normalization strategies
- Machine learning approaches
- Confidence scoring
- Temporal weighting
- User feedback loops

This keeps the focus on simplicity and user accessibility while providing the flexibility for users who want to customize the weighting.