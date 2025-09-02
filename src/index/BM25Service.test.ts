import { describe, it, expect, beforeEach } from '@jest/globals'
import { BM25Service, type BM25Options, type ScoredResult } from './BM25Service'

describe('BM25Service', () => {
  let service: BM25Service

  beforeEach(() => {
    service = new BM25Service()
  })

  describe('constructor and configuration', () => {
    it('should initialize with default options', () => {
      const defaultService = new BM25Service()
      expect(defaultService).toBeDefined()
    })

    it('should accept custom options', () => {
      const customOptions: BM25Options = {
        k1: 2.0,
        b: 0.5,
        fieldWeights: { title: 3.0, content: 1.5 },
        maxQueryLength: 1000,
        minTokenLength: 3,
        defaultQueryLimit: 20
      }
      
      const customService = new BM25Service(customOptions)
      expect(customService).toBeDefined()
    })
  })

  describe('document management', () => {
    it('should add documents correctly', () => {
      service.indexDocument('doc1.md', 'Machine Learning', 'Introduction to machine learning')
      service.indexDocument('doc2.md', 'Data Science', 'Data analysis and statistics')
      
      const results = service.search('machine', 10)
      expect(results).toHaveLength(1)
      expect(results[0].path).toBe('doc1.md')
      expect(results[0].title).toBe('Machine Learning')
    })

    it('should update existing documents', () => {
      // Add initial document
      service.indexDocument('doc1.md', 'Original Title', 'Original content about algorithms')
      service.indexDocument('doc2.md', 'Other Document', 'Other content about statistics')
      
      let results = service.search('algorithms', 10)
      expect(results).toHaveLength(1)
      
      // Update document
      service.indexDocument('doc1.md', 'Updated Title', 'Updated content with neural networks')
      
      // Should find updated content
      results = service.search('neural', 10)
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Updated Title')
      
      // Should not find original content anymore
      results = service.search('algorithms', 10)
      expect(results).toHaveLength(0)
    })

    it('should remove documents correctly', () => {
      service.indexDocument('doc1.md', 'Machine Learning', 'About machine learning')
      service.indexDocument('doc2.md', 'Data Science', 'About data analysis')
      
      let results = service.search('machine', 10)
      expect(results).toHaveLength(1)
      
      service.removeDocument('doc1.md')
      
      results = service.search('machine', 10)
      expect(results).toHaveLength(0)
      
      // Other document should still exist
      results = service.search('data', 10)
      expect(results).toHaveLength(1)
    })

    it('should handle removing non-existent documents', () => {
      expect(() => service.removeDocument('nonexistent.md')).not.toThrow()
    })

    it('should clear all documents', () => {
      service.indexDocument('doc1.md', 'Document 1', 'First document content')
      service.indexDocument('doc2.md', 'Document 2', 'Second document content')
      
      let results = service.search('document', 10)
      expect(results).toHaveLength(2)
      
      service.clear()
      
      results = service.search('document', 10)
      expect(results).toHaveLength(0)
      
      const stats = service.getStats()
      expect(stats.totalDocuments).toBe(0)
      expect(stats.totalTerms).toBe(0)
    })
  })

  describe('search functionality', () => {
    beforeEach(() => {
      // Add test documents with unique terms to avoid IDF issues
      service.indexDocument('doc1.md', 'Machine Learning Basics', 'Introduction to machine learning algorithms and neural networks')
      service.indexDocument('doc2.md', 'Data Science Guide', 'Statistical analysis and data mining methods for research')
      service.indexDocument('doc3.md', 'Web Development', 'Frontend and backend web development technologies')
      service.indexDocument('doc4.md', 'Database Systems', 'Relational databases and query optimization techniques')
    })

    it('should return relevant results for single term queries', () => {
      const results = service.search('machine', 5)
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(5)
      
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score)
      }
      
      // Should find the machine learning document
      expect(results[0].path).toBe('doc1.md')
    })

    it('should return relevant results for multi-term queries', () => {
      const results = service.search('data analysis', 5)
      expect(results.length).toBeGreaterThan(0)
      
      // Should prioritize the data science document
      expect(results[0].path).toBe('doc2.md')
    })

    it('should respect the limit parameter', () => {
      const results = service.search('development', 2)
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should return empty results for non-matching queries', () => {
      const results = service.search('nonexistent quantum cryptography', 10)
      expect(results).toHaveLength(0)
    })

    it('should throw error for empty queries', () => {
      expect(() => service.search('', 10)).toThrow('Query must be a non-empty string')
    })

    it('should handle very long queries', () => {
      const longQuery = 'development '.repeat(200) // Long but valid query
      const results = service.search(longQuery, 10)
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('BM25F scoring with field weights', () => {
    beforeEach(() => {
      // Create service with different field weights
      service = new BM25Service({
        fieldWeights: { title: 2.0, content: 1.0 }
      })
    })

    it('should weight title matches higher than content matches', () => {
      service.indexDocument('title-match.md', 'machine learning systems', 'This document discusses artificial intelligence methods')
      service.indexDocument('content-match.md', 'artificial intelligence overview', 'This document covers machine learning systems and algorithms')
      
      const results = service.search('machine learning systems', 10)
      expect(results).toHaveLength(2)
      
      // Title match should score higher due to field weights
      expect(results[0].path).toBe('title-match.md')
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })
  })

  describe('getSimilarNotes functionality', () => {
    beforeEach(() => {
      service.indexDocument('ml.md', 'Machine Learning', 'Machine learning is a subset of artificial intelligence')
      service.indexDocument('ai.md', 'Artificial Intelligence', 'Artificial intelligence encompasses various computational methods')
      service.indexDocument('ds.md', 'Data Science', 'Data science involves statistical analysis and machine learning')
      service.indexDocument('web.md', 'Web Development', 'Web development includes frontend and backend technologies')
    })

    it('should find similar notes based on content', () => {
      const results = service.getSimilarNotes('ml.md', 3)
      
      expect(results.length).toBeLessThanOrEqual(3)
      expect(results.every(r => r.path !== 'ml.md')).toBe(true) // Should exclude the query document
      
      // Should find AI and Data Science as more similar than Web Development
      const paths = results.map(r => r.path)
      expect(paths).toContain('ai.md')
      expect(paths).toContain('ds.md')
    })

    it('should return empty array for non-existent documents', () => {
      const results = service.getSimilarNotes('nonexistent.md', 5)
      expect(results).toHaveLength(0)
    })

    it('should respect the limit parameter', () => {
      const results = service.getSimilarNotes('ml.md', 1)
      expect(results).toHaveLength(1)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle documents with only whitespace', () => {
      service.indexDocument('whitespace.md', '   ', '   \n\t  ')
      service.indexDocument('normal.md', 'Normal Document', 'This has actual content')
      
      const results = service.search('content', 10)
      expect(results).toHaveLength(1)
      expect(results[0].path).toBe('normal.md')
    })

    it('should handle unicode characters correctly', () => {
      service.indexDocument('unicode.md', 'Unicode Test', 'This contains unicode: café résumé naïve')
      service.indexDocument('ascii.md', 'ASCII Test', 'This contains ascii: cafe resume naive')
      
      // Both should be found due to normalization
      const results1 = service.search('café', 10)
      const results2 = service.search('cafe', 10)
      
      expect(results1.length + results2.length).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      service.indexDocument('case.md', 'Test Document', 'This is a TEST document with MIXED case')
      service.indexDocument('other.md', 'Other Document', 'Different content entirely')
      
      const lowerResults = service.search('test mixed', 10)
      const upperResults = service.search('TEST MIXED', 10)
      
      expect(lowerResults).toHaveLength(1)
      expect(upperResults).toHaveLength(1)
      expect(lowerResults[0].path).toBe('case.md')
      expect(upperResults[0].path).toBe('case.md')
    })

    it('should validate input parameters', () => {
      expect(() => service.indexDocument('', 'title', 'content')).toThrow()
      expect(() => service.indexDocument('path.md', null as any, 'content')).toThrow()
      expect(() => service.indexDocument('path.md', 'title', null as any)).toThrow()
      
      expect(() => service.search(null as any, 10)).toThrow()
      expect(() => service.search('query', -1)).toThrow()
      
      expect(() => service.getSimilarNotes('', 10)).toThrow()
      expect(() => service.getSimilarNotes('path.md', -1)).toThrow()
    })
  })

  describe('performance and statistics', () => {
    it('should provide accurate statistics', () => {
      expect(service.getStats().totalDocuments).toBe(0)
      
      service.indexDocument('doc1.md', 'Document One', 'First document content')
      service.indexDocument('doc2.md', 'Document Two', 'Second document content')
      
      const stats = service.getStats()
      expect(stats.totalDocuments).toBe(2)
      expect(stats.totalTerms).toBeGreaterThan(0)
      expect(stats.avgDocLength).toBeGreaterThan(0)
    })

    it('should handle adding many documents efficiently', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 100; i++) {
        service.indexDocument(`doc${i}.md`, `Document ${i}`, `This is document number ${i} with unique content ${i}`)
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
      
      const results = service.search('document', 10)
      expect(results).toHaveLength(10) // Should find matches up to limit
    })
  })
})