export interface ScoredResult {
  path: string
  score: number
  title: string
}

export interface DocumentFields {
  title: string
  content: string
  length: number
}

export interface InvertedIndexEntry {
  df: number // document frequency
  postings: Map<string, FieldFrequencies> // path -> field frequencies
}

export interface FieldFrequencies {
  title: number
  content: number
}

export class BM25Service {
  private index: Map<string, InvertedIndexEntry> = new Map()
  private documents: Map<string, DocumentFields> = new Map()
  private totalDocuments = 0
  private avgDocLength = 0
  private totalLength = 0

  // BM25F parameters
  private readonly k1 = 1.2
  private readonly b = 0.75
  
  // Field weights
  private readonly fieldWeights = {
    title: 2.0,
    content: 1.0
  }

  // Basic English stopwords
  private readonly stopwords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
    'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
    'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
    'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so',
    'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
    'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
    'him', 'know', 'take', 'people', 'into', 'year', 'your',
    'good', 'some', 'could', 'them', 'see', 'other', 'than',
    'then', 'now', 'look', 'only', 'come', 'its', 'over',
    'think', 'also', 'back', 'after', 'use', 'two', 'how',
    'our', 'work', 'first', 'well', 'way', 'even', 'new',
    'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
  ])

  /**
   * Tokenize text with normalization and stopword removal
   */
  private tokenize(text: string): string[] {
    if (!text) return []
    
    return text
      .toLowerCase()
      .normalize('NFD') // ASCII folding for diacritics
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopwords.has(token))
  }

  /**
   * Calculate field frequencies for a document
   */
  private calculateFieldFrequencies(title: string, content: string): FieldFrequencies {
    const titleTokens = this.tokenize(title)
    const contentTokens = this.tokenize(content)
    
    const frequencies: FieldFrequencies = { title: 0, content: 0 }
    
    // Count title term frequencies
    const titleCounts = new Map<string, number>()
    for (const token of titleTokens) {
      titleCounts.set(token, (titleCounts.get(token) || 0) + 1)
    }
    
    // Count content term frequencies
    const contentCounts = new Map<string, number>()
    for (const token of contentTokens) {
      contentCounts.set(token, (contentCounts.get(token) || 0) + 1)
    }
    
    return { 
      title: titleCounts.size,
      content: contentCounts.size
    }
  }

  /**
   * Update document length statistics
   */
  private updateLengthStats(): void {
    let totalLen = 0
    for (const doc of this.documents.values()) {
      totalLen += doc.length
    }
    this.totalLength = totalLen
    this.avgDocLength = this.totalDocuments > 0 ? totalLen / this.totalDocuments : 0
  }

  /**
   * Add or update a document in the index
   */
  indexDocument(path: string, title: string, content: string): void {
    // Remove existing document if it exists
    if (this.documents.has(path)) {
      this.removeDocument(path)
    }

    const titleTokens = this.tokenize(title)
    const contentTokens = this.tokenize(content)
    const allTokens = [...titleTokens, ...contentTokens]
    const docLength = allTokens.length

    // Store document
    this.documents.set(path, { title, content, length: docLength })
    this.totalDocuments++
    
    // Count term frequencies per field
    const titleTf = new Map<string, number>()
    const contentTf = new Map<string, number>()
    
    for (const token of titleTokens) {
      titleTf.set(token, (titleTf.get(token) || 0) + 1)
    }
    
    for (const token of contentTokens) {
      contentTf.set(token, (contentTf.get(token) || 0) + 1)
    }
    
    // Update inverted index
    const uniqueTerms = new Set([...titleTf.keys(), ...contentTf.keys()])
    
    for (const term of uniqueTerms) {
      if (!this.index.has(term)) {
        this.index.set(term, {
          df: 0,
          postings: new Map()
        })
      }
      
      const entry = this.index.get(term)!
      
      // If this document doesn't already contain this term, increment df
      if (!entry.postings.has(path)) {
        entry.df++
      }
      
      entry.postings.set(path, {
        title: titleTf.get(term) || 0,
        content: contentTf.get(term) || 0
      })
    }
    
    this.updateLengthStats()
  }

  /**
   * Remove a document from the index
   */
  removeDocument(path: string): void {
    if (!this.documents.has(path)) return
    
    // Remove from document frequency counts
    for (const [term, entry] of this.index.entries()) {
      if (entry.postings.has(path)) {
        entry.df--
        entry.postings.delete(path)
        
        // Remove term if no documents contain it
        if (entry.df === 0) {
          this.index.delete(term)
        }
      }
    }
    
    this.documents.delete(path)
    this.totalDocuments--
    this.updateLengthStats()
  }

  /**
   * Calculate BM25F score for a document given query terms
   */
  private calculateBM25Score(docPath: string, queryTerms: string[]): number {
    const doc = this.documents.get(docPath)
    if (!doc) return 0
    
    let score = 0
    
    for (const term of queryTerms) {
      const indexEntry = this.index.get(term)
      if (!indexEntry || !indexEntry.postings.has(docPath)) continue
      
      const fieldFreqs = indexEntry.postings.get(docPath)!
      const df = indexEntry.df
      const idf = Math.log((this.totalDocuments - df + 0.5) / (df + 0.5))
      
      // BM25F field scoring
      let fieldScore = 0
      
      // Title field
      if (fieldFreqs.title > 0) {
        const normalizedTf = fieldFreqs.title / (1 + this.b * (doc.length / this.avgDocLength - 1))
        fieldScore += this.fieldWeights.title * (normalizedTf / (this.k1 + normalizedTf))
      }
      
      // Content field
      if (fieldFreqs.content > 0) {
        const normalizedTf = fieldFreqs.content / (1 + this.b * (doc.length / this.avgDocLength - 1))
        fieldScore += this.fieldWeights.content * (normalizedTf / (this.k1 + normalizedTf))
      }
      
      score += idf * fieldScore
    }
    
    return score
  }

  /**
   * Search for documents matching a query
   */
  search(query: string, limit = 10): ScoredResult[] {
    const queryTerms = this.tokenize(query)
    if (queryTerms.length === 0) return []
    
    const scores: ScoredResult[] = []
    
    // Get candidate documents (documents containing at least one query term)
    const candidates = new Set<string>()
    for (const term of queryTerms) {
      const entry = this.index.get(term)
      if (entry) {
        for (const docPath of entry.postings.keys()) {
          candidates.add(docPath)
        }
      }
    }
    
    // Score all candidates
    for (const docPath of candidates) {
      const doc = this.documents.get(docPath)
      if (!doc) continue
      
      const score = this.calculateBM25Score(docPath, queryTerms)
      if (score > 0) {
        scores.push({
          path: docPath,
          score,
          title: doc.title
        })
      }
    }
    
    // Sort by score descending and apply L2 normalization
    scores.sort((a, b) => b.score - a.score)
    
    // L2 normalize scores
    if (scores.length > 0) {
      const sumSquares = scores.reduce((sum, result) => sum + result.score ** 2, 0)
      const norm = Math.sqrt(sumSquares)
      
      if (norm > 0) {
        for (const result of scores) {
          result.score = result.score / norm
        }
      }
    }
    
    return scores.slice(0, limit)
  }

  /**
   * Find similar notes to a given note
   */
  getSimilarNotes(notePath: string, limit = 10): ScoredResult[] {
    const doc = this.documents.get(notePath)
    if (!doc) return []
    
    // Use document content as query
    const query = `${doc.title} ${doc.content}`.substring(0, 500) // Limit query length
    return this.search(query, limit + 1) // +1 to exclude self
      .filter(result => result.path !== notePath)
      .slice(0, limit)
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.totalDocuments,
      totalTerms: this.index.size,
      avgDocLength: this.avgDocLength
    }
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.index.clear()
    this.documents.clear()
    this.totalDocuments = 0
    this.avgDocLength = 0
    this.totalLength = 0
  }
}