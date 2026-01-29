# Screenshots Guide

## How to Add Screenshots to Docs

1. **Take screenshots** of the TriBridRAG UI at http://localhost:5175/
2. **Save them** to this directory with descriptive names:
   - `rag-config-interface.png` - RAG tab with fusion weights
   - `search-results.png` - Search interface with results
   - `graph-visualization.png` - Neo4j graph view
   - `model-selector.png` - Model picker interface
   - `cost-calculator.png` - Cost tracking dashboard

3. **Add to docs** using this format:

```markdown
![RAG Configuration Interface](./assets/images/rag-config-interface.png)
*Configure fusion weights, reranking, and search parameters through the intuitive UI*
```

Or with lightbox zoom:

```markdown
<figure markdown>
  ![RAG Configuration](./assets/images/rag-config-interface.png){ loading=lazy }
  <figcaption>Configure tri-brid fusion weights and reranking options</figcaption>
</figure>
```

## Recommended Screenshots

### 1. RAG Configuration Tab
- Show the sliders for fusion weights (vector/sparse/graph)
- Reranker dropdown
- Top-K settings
- Confidence thresholds

### 2. Search Interface
- Query input
- Results panel with chunks
- Relevance scores
- Citation links

### 3. Graph Visualization
- Neo4j entities and relationships
- Community detection
- Entity details panel

### 4. Model Management
- Model picker dropdown (embedding/generation/reranker)
- Provider selection
- Cost calculator
- Context window info

### 5. Glossary/Tooltips
- Show the tooltip system with definitions
- Searchable glossary tab

## Screenshot Tips

- Use dark mode (matches docs theme)
- Capture at ~1920x1080 or similar
- Show real data/results (not empty states)
- Highlight key features with cursor or annotations
- Keep UI clean (close unnecessary panels)
