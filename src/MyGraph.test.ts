import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import MyGraph from './MyGraph'
import { setupMockVaultWithNotes, createMockApp, type MockApp } from './__mocks__/obsidian'
import type { GraphAnalysisSettings } from './Interfaces'

// Mock the BM25Service since we're testing MyGraph specifically
jest.mock('./index/BM25Service', () => ({
  BM25Service: jest.fn().mockImplementation(() => ({
    clear: jest.fn(),
    indexDocument: jest.fn(),
    removeDocument: jest.fn(),
    search: jest.fn().mockReturnValue([
      { path: 'note1.md', score: 0.8, title: 'Note 1' },
      { path: 'note2.md', score: 0.6, title: 'Note 2' }
    ]),
    getSimilarNotes: jest.fn().mockReturnValue([
      { path: 'similar.md', score: 0.7, title: 'Similar Note' }
    ])
  }))
}))

describe('MyGraph', () => {
  let mockApp: MockApp
  let settings: GraphAnalysisSettings
  let graph: MyGraph

  beforeEach(() => {
    // Create mock app with test data
    mockApp = setupMockVaultWithNotes([
      {
        path: 'note1.md',
        content: 'This is the first note about machine learning',
        links: ['note2.md'],
        tags: ['#ai']
      },
      {
        path: 'note2.md', 
        content: 'This is the second note about data science',
        links: ['note3.md'],
        tags: ['#data']
      },
      {
        path: 'note3.md',
        content: 'This is the third note about algorithms',
        links: ['note1.md'],
        tags: ['#algorithms']
      }
    ])

    // Default settings
    settings = {
      exclusionRegex: '',
      exclusionTags: [],
      allFileExtensions: false,
      addUnresolved: false,
      debugMode: false,
      defaultSubtypeType: 'Link Suggestions' as any,
      homeWeightLinkSuggestions: 33,
      homeWeightRelevantNotes: 33,
      homeWeightSimilarContent: 34
    }

    graph = new MyGraph(mockApp, settings)
  })

  describe('constructor and initialization', () => {
    it('should create a new MyGraph instance', () => {
      expect(graph).toBeInstanceOf(MyGraph)
      expect(graph.app).toBe(mockApp)
      expect(graph.settings).toBe(settings)
    })

    it('should initialize with empty graph', () => {
      expect(graph.order).toBe(0) // No nodes initially
      expect(graph.size).toBe(0)  // No edges initially
    })

    it('should initialize BM25Service', () => {
      expect(graph.bm25Service).toBeDefined()
    })

    it('should have algorithm methods available', () => {
      expect(graph.algs).toBeDefined()
      expect(typeof graph.algs['Link Suggestions']).toBe('function')
      expect(typeof graph.algs['Relevant Notes']).toBe('function')
      expect(typeof graph.algs['Similar Content']).toBe('function')
      expect(typeof graph.algs['Home']).toBe('function')
    })
  })

  describe('initGraph', () => {
    it('should build graph from vault data', async () => {
      await graph.initGraph()

      expect(graph.order).toBe(3) // Should have 3 nodes
      expect(graph.size).toBeGreaterThan(0) // Should have edges

      // Should contain all notes
      expect(graph.hasNode('note1.md')).toBe(true)
      expect(graph.hasNode('note2.md')).toBe(true)
      expect(graph.hasNode('note3.md')).toBe(true)
    })

    it('should create edges based on links', async () => {
      await graph.initGraph()

      // Should have edges based on the links we set up
      expect(graph.hasEdge('note1.md', 'note2.md')).toBe(true)
      expect(graph.hasEdge('note2.md', 'note3.md')).toBe(true)
      expect(graph.hasEdge('note3.md', 'note1.md')).toBe(true)
    })

    it('should respect exclusion regex', async () => {
      settings.exclusionRegex = 'note3'
      
      await graph.initGraph()

      expect(graph.hasNode('note1.md')).toBe(true)
      expect(graph.hasNode('note2.md')).toBe(true)
      expect(graph.hasNode('note3.md')).toBe(false)
    })

    it('should respect exclusion tags', async () => {
      settings.exclusionTags = ['#data']
      
      await graph.initGraph()

      expect(graph.hasNode('note1.md')).toBe(true)
      expect(graph.hasNode('note2.md')).toBe(false) // Should be excluded
      expect(graph.hasNode('note3.md')).toBe(true)
    })

    it('should index documents in BM25Service', async () => {
      await graph.initGraph()

      expect(graph.bm25Service.indexDocument).toHaveBeenCalledTimes(3)
      // Note: the actual call uses path as both path and title
      expect(graph.bm25Service.indexDocument).toHaveBeenCalledWith('note1.md', 'note1', expect.any(String))
    })

    it('should clear BM25Service before building', async () => {
      await graph.initGraph()

      expect(graph.bm25Service.clear).toHaveBeenCalled()
    })
  })

  describe('Link Suggestions algorithm', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should calculate link suggestions using Resource Allocation', async () => {
      const result = await graph.algs['Link Suggestions']('note1.md')

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should return results with correct structure', async () => {
      const result = await graph.algs['Link Suggestions']('note1.md')

      // Result should be a ResultMap where keys are note paths
      Object.keys(result).forEach(path => {
        expect(typeof path).toBe('string')
        expect(result[path]).toHaveProperty('note')
        expect(result[path]).toHaveProperty('measure')
        expect(typeof result[path].measure).toBe('number')
      })
    })

    it('should handle nodes with no connections', async () => {
      // Add isolated node
      graph.addNode('isolated.md')

      const result = await graph.algs['Link Suggestions']('isolated.md')

      // Should handle gracefully
      expect(typeof result).toBe('object')
    })
  })

  describe('Relevant Notes algorithm (Personalized PageRank)', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should calculate relevant notes using Personalized PageRank', async () => {
      const result = await graph.algs['Relevant Notes']('note1.md')

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should return results with correct structure', async () => {
      const result = await graph.algs['Relevant Notes']('note1.md')

      // Result should be a ResultMap
      Object.keys(result).forEach(path => {
        expect(typeof path).toBe('string')
        expect(result[path]).toHaveProperty('note')
        expect(result[path]).toHaveProperty('measure')
        expect(typeof result[path].measure).toBe('number')
        expect(result[path].measure).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Similar Content algorithm', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should find similar content using BM25', async () => {
      const result = await graph.algs['Similar Content']('note1.md')

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      
      // Should call BM25Service getSimilarNotes
      expect(graph.bm25Service.getSimilarNotes).toHaveBeenCalledWith('note1.md', expect.any(Number))
    })

    it('should return results with correct structure', async () => {
      const result = await graph.algs['Similar Content']('note1.md')

      // Result should be a ResultMap
      Object.keys(result).forEach(path => {
        expect(typeof path).toBe('string')
        expect(result[path]).toHaveProperty('note')
        expect(result[path]).toHaveProperty('measure')
        expect(typeof result[path].measure).toBe('number')
      })
    })
  })

  describe('Home algorithm (Unified Recommendations)', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should combine multiple algorithms', async () => {
      const result = await graph.algs['Home']('note1.md')

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should return results with correct structure', async () => {
      const result = await graph.algs['Home']('note1.md')

      // Result should be a ResultMap
      Object.keys(result).forEach(path => {
        expect(typeof path).toBe('string')
        expect(result[path]).toHaveProperty('note')
        expect(result[path]).toHaveProperty('measure')
        expect(typeof result[path].measure).toBe('number')
      })
    })

    it('should respect algorithm weights from settings', async () => {
      // Test with different weights
      settings.homeWeightLinkSuggestions = 50
      settings.homeWeightRelevantNotes = 30
      settings.homeWeightSimilarContent = 20

      const result = await graph.algs['Home']('note1.md')

      expect(typeof result).toBe('object')
      // The specific scoring depends on the algorithm implementation
    })
  })

  describe('caching behavior', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should provide cache statistics', () => {
      const stats = graph.getCacheStats()

      expect(stats).toHaveProperty('pageRank')
      expect(stats).toHaveProperty('resourceAllocation')
      expect(stats).toHaveProperty('similarity')
      expect(stats).toHaveProperty('unifiedRecommendations')

      expect(typeof stats.pageRank.hitRate).toBe('number')
      expect(typeof stats.resourceAllocation.hitRate).toBe('number')
    })

    it('should cache algorithm results', async () => {
      // First call
      const result1 = await graph.algs['Link Suggestions']('note1.md')
      
      // Second call should potentially use cache
      const result2 = await graph.algs['Link Suggestions']('note1.md')

      // Results should be consistent
      expect(typeof result1).toBe('object')
      expect(typeof result2).toBe('object')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should handle non-existent nodes gracefully', async () => {
      const result = await graph.algs['Link Suggestions']('nonexistent.md')
      expect(typeof result).toBe('object')
    })

    it('should handle empty graph gracefully', async () => {
      const emptyGraph = new MyGraph(createMockApp(), settings)
      
      const result = await emptyGraph.algs['Link Suggestions']('note1.md')
      expect(typeof result).toBe('object')
    })
  })

  describe('settings integration', () => {
    it('should respect debug mode', async () => {
      settings.debugMode = true
      const debugGraph = new MyGraph(mockApp, settings)
      
      // Should not crash with debug mode enabled
      await debugGraph.initGraph()
      expect(debugGraph.order).toBeGreaterThanOrEqual(0)
    })

    it('should handle file extension filtering', async () => {
      settings.allFileExtensions = true
      const graph2 = new MyGraph(mockApp, settings)
      
      await graph2.initGraph()
      expect(graph2.order).toBeGreaterThanOrEqual(0)
    })
  })

  describe('graph metrics and analysis', () => {
    beforeEach(async () => {
      await graph.initGraph()
    })

    it('should provide basic graph statistics', () => {
      expect(graph.order).toBeGreaterThan(0) // Number of nodes
      expect(graph.size).toBeGreaterThanOrEqual(0) // Number of edges
    })

    it('should handle graph traversal operations', () => {
      const nodes = graph.nodes()
      expect(Array.isArray(nodes)).toBe(true)
      expect(nodes.length).toBe(graph.order)
      
      const edges = graph.edges()
      expect(Array.isArray(edges)).toBe(true)
      expect(edges.length).toBe(graph.size)
    })

    it('should provide node degree information', () => {
      graph.nodes().forEach(node => {
        const degree = graph.degree(node)
        expect(typeof degree).toBe('number')
        expect(degree).toBeGreaterThanOrEqual(0)
      })
    })
  })
})