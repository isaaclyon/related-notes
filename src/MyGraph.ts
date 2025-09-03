import Graph from 'graphology'

import {
  App,
  TagCache,
} from 'obsidian'
import {
  intersection,
} from './GeneralGraphFn'
import type {
  AnalysisAlg,
  Communities,
  GraphAnalysisSettings,
  ResultMap,
  Subtype,
} from './Interfaces'
import { roundNumber } from './Utility'
import { BM25Service } from './index/BM25Service'
import { LRUCache } from './LRUCache'

export default class MyGraph extends Graph {
  app: App
  settings: GraphAnalysisSettings
  bm25Service: BM25Service
  
  // LRU caches for expensive operations
  private pageRankCache: LRUCache<ResultMap>
  private resourceAllocationCache: LRUCache<ResultMap>
  private similarityCache: LRUCache<ResultMap>
  private unifiedRecommendationsCache: LRUCache<ResultMap>

  constructor(app: App, settings: GraphAnalysisSettings) {
    super()
    this.app = app
    this.settings = settings
    this.bm25Service = new BM25Service()
    
    // Initialize LRU caches
    this.pageRankCache = new LRUCache<ResultMap>(50, 15) // 50 entries, 15 min TTL
    this.resourceAllocationCache = new LRUCache<ResultMap>(200, 30) // 200 entries, 30 min TTL  
    this.similarityCache = new LRUCache<ResultMap>(100, 20) // 100 entries, 20 min TTL
    this.unifiedRecommendationsCache = new LRUCache<ResultMap>(75, 10) // 75 entries, 10 min TTL
  }

  async initGraph(): Promise<MyGraph> {
    const { resolvedLinks, unresolvedLinks } = this.app.metadataCache
    const { exclusionRegex, exclusionTags, allFileExtensions, addUnresolved } =
      this.settings
    const regex = new RegExp(exclusionRegex, 'i')
    let i = 0

    // Clear existing BM25 index
    this.bm25Service.clear()

    const includeTag = (tags: TagCache[] | undefined) =>
      exclusionTags.length === 0 ||
      !tags ||
      tags.findIndex((t) => exclusionTags.includes(t.tag)) === -1
    const includeRegex = (node: string) =>
      exclusionRegex === '' || !regex.test(node)
    const includeExt = (node: string) =>
      allFileExtensions || node.endsWith('md')

    // Index documents for BM25
    const filesToIndex = new Set<string>()

    for (const source in resolvedLinks) {
      const tags = this.app.metadataCache.getCache(source)?.tags
      if (includeTag(tags) && includeRegex(source) && includeExt(source)) {
        filesToIndex.add(source)
        if (!this.hasNode(source)) {
          this.addNode(source, { i })
          i++
        }

        for (const dest in resolvedLinks[source]) {
          const tags = this.app.metadataCache.getCache(dest)?.tags
          if (includeTag(tags) && includeRegex(dest) && includeExt(dest)) {
            filesToIndex.add(dest)
            if (!this.hasNode(dest)) {
              this.addNode(dest, { i })
              i++
            }
            this.addEdge(source, dest, { resolved: true })
          }
        }
      }
    }

    // Index all files for text similarity
    for (const filePath of filesToIndex) {
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (file && 'extension' in file && file.extension === 'md') {
        try {
          const content = await this.app.vault.cachedRead(file)
          const cache = this.app.metadataCache.getCache(filePath)
          const title = cache?.frontmatter?.title || file.basename || 'Untitled'
          
          this.bm25Service.indexDocument(filePath, title, content)
        } catch (error) {
          console.warn(`Failed to index file ${filePath}:`, error)
        }
      }
    }

    if (addUnresolved) {
      for (const source in unresolvedLinks) {
        if (includeRegex(source)) {
          // Add unresolved link sources to BM25 index as well
          filesToIndex.add(source)
          
          if (!this.hasNode(source)) {
            this.addNode(source, { i })
            i++
          }

          for (const dest in unresolvedLinks[source]) {
            const destMD = dest + '.md'
            if (includeRegex(destMD)) {
              // Add unresolved link destinations to BM25 index as well  
              filesToIndex.add(destMD)
              
              if (!this.hasNode(destMD)) {
                this.addNode(destMD, { i })
                i++
              }
              this.addEdge(source, destMD, { resolved: false })
            }
          }
        }
      }
    }

    // Ensure all markdown files in vault are indexed for BM25 similarity (including orphan notes)
    const allFiles = this.app.vault.getMarkdownFiles()
    for (const file of allFiles) {
      const filePath = file.path
      const tags = this.app.metadataCache.getCache(filePath)?.tags
      
      if (includeTag(tags) && includeRegex(filePath) && includeExt(filePath)) {
        filesToIndex.add(filePath)
      }
    }
    return this
  }

  // Cache management methods
  invalidateCache(filePath?: string) {
    if (filePath) {
      // Invalidate caches related to specific file
      this.pageRankCache.invalidate(filePath)
      this.resourceAllocationCache.invalidatePattern(`^${filePath}|:${filePath}$`)
      this.similarityCache.invalidatePattern(`^${filePath}|:${filePath}$`)
      this.unifiedRecommendationsCache.invalidatePattern(`^${filePath}|:${filePath}$`)
    } else {
      // Clear all caches (e.g., on full graph refresh)
      this.pageRankCache.clear()
      this.resourceAllocationCache.clear()
      this.similarityCache.clear()
      this.unifiedRecommendationsCache.clear()
    }
  }

  getCacheStats() {
    return {
      pageRank: this.pageRankCache.getStats(),
      resourceAllocation: this.resourceAllocationCache.getStats(),
      similarity: this.similarityCache.getStats(),
      unifiedRecommendations: this.unifiedRecommendationsCache.getStats()
    }
  }

  algs: {
    [subtype in Subtype]: AnalysisAlg<
      ResultMap | CoCitationMap | Communities | string[] | HITSResult
    >
  } = {
    Home: async (a: string): Promise<ResultMap> => {
      // Check cache first
      const cacheKey = `${a}_${this.settings.homeWeightLinkSuggestions}_${this.settings.homeWeightRelevantNotes}_${this.settings.homeWeightSimilarContent}`
      const cached = this.unifiedRecommendationsCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const results: ResultMap = {}
      
      // Get weights from settings (convert to decimals)
      const linkWeight = this.settings.homeWeightLinkSuggestions / 100
      const relevantWeight = this.settings.homeWeightRelevantNotes / 100
      const contentWeight = this.settings.homeWeightSimilarContent / 100
      
      // Run all three algorithms in parallel
      const [linkResults, relevantResults, contentResults] = await Promise.all([
        this.algs['Link Suggestions'](a),
        this.algs['Relevant Notes'](a),
        this.algs['Similar Content'](a)
      ])
      
      // Get all nodes for min/max normalization
      const allNodes = new Set([
        ...Object.keys(linkResults),
        ...Object.keys(relevantResults), 
        ...Object.keys(contentResults)
      ])
      
      // Calculate min/max for each algorithm (excluding zeros)
      const getLinkMinMax = () => {
        const scores = Object.values(linkResults).map(r => r.measure).filter(s => s > 0)
        return { min: Math.min(...scores), max: Math.max(...scores) }
      }
      
      const getRelevantMinMax = () => {
        const scores = Object.values(relevantResults).map(r => r.measure).filter(s => s > 0)
        return { min: Math.min(...scores), max: Math.max(...scores) }
      }
      
      const getContentMinMax = () => {
        const scores = Object.values(contentResults).map(r => r.measure).filter(s => s > 0)
        return { min: Math.min(...scores), max: Math.max(...scores) }
      }
      
      const linkMinMax = getLinkMinMax()
      const relevantMinMax = getRelevantMinMax()
      const contentMinMax = getContentMinMax()
      
      // Normalize and combine scores
      for (const node of allNodes) {
        if (node === a) continue // Skip self
        
        const linkScore = linkResults[node]?.measure || 0
        const relevantScore = relevantResults[node]?.measure || 0
        const contentScore = contentResults[node]?.measure || 0
        
        // Normalize scores using min/max (only if non-zero)
        const normalizeScore = (score: number, minMax: { min: number, max: number }) => {
          if (score === 0 || minMax.max === minMax.min) return 0
          return (score - minMax.min) / (minMax.max - minMax.min)
        }
        
        const normalizedLink = normalizeScore(linkScore, linkMinMax)
        const normalizedRelevant = normalizeScore(relevantScore, relevantMinMax) 
        const normalizedContent = normalizeScore(contentScore, contentMinMax)
        
        // Count contributing algorithms (exclude zeros)
        const contributingAlgos = [
          linkScore > 0 ? linkWeight : 0,
          relevantScore > 0 ? relevantWeight : 0, 
          contentScore > 0 ? contentWeight : 0
        ].filter(w => w > 0)
        
        // Skip if no algorithms contributed
        if (contributingAlgos.length === 0) continue
        
        // Calculate weighted average (only using contributing algorithms)
        const totalWeight = contributingAlgos.reduce((sum, w) => sum + w, 0)
        const weightedSum = (linkScore > 0 ? normalizedLink * linkWeight : 0) +
                           (relevantScore > 0 ? normalizedRelevant * relevantWeight : 0) +
                           (contentScore > 0 ? normalizedContent * contentWeight : 0)
        
        const unifiedScore = weightedSum / totalWeight
        
        // Create algorithm breakdown for display
        const getIndicator = (score: number, minMax: { min: number, max: number }) => {
          if (score === 0) return '—'
          const normalized = normalizeScore(score, minMax)
          if (normalized >= 0.67) return '🟢'
          if (normalized >= 0.33) return '🟡'
          return '🔴'
        }
        
        const breakdown = [
          getIndicator(linkScore, linkMinMax),
          getIndicator(relevantScore, relevantMinMax),
          getIndicator(contentScore, contentMinMax)
        ]
        
        results[node] = {
          measure: roundNumber(unifiedScore),
          extra: breakdown
        }
      }
      
      // Sort and limit results
      const sortedResults: ResultMap = {}
      const sortedEntries = Object.entries(results)
        .sort(([, a], [, b]) => b.measure - a.measure)
        .slice(0, this.settings.homeMaxResults)
      
      for (const [node, result] of sortedEntries) {
        sortedResults[node] = result
      }
      
      // Cache results
      this.unifiedRecommendationsCache.set(cacheKey, sortedResults)
      
      return sortedResults
    },











    // Tversky: async (a: string): Promise<ResultMap> => {
    //   const results: ResultMap = {}
    //   const nlp = getNLPPlugin(this.app)
    //   if (!nlp) return results

    //   const { Docs } = nlp
    //   const sourceSet = nlp.getNoStopSet(Docs[a])

    //   this.forEachNode(async (to: string) => {
    //     const targetDoc = Docs[to]
    //     if (!targetDoc) {
    //       results[to] = { measure: 0, extra: [] }
    //     }
    //     const targetSet = nlp.getNoStopSet(Docs[to])

    //     const measure = similarity.set.tversky(sourceSet, targetSet)
    //     results[to] = {
    //       measure,
    //       extra: [],
    //     }
    //   })
    //   return results
    // },

    'Similar Content': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      
      // Use BM25 similarity for Similar Content
      const similarNotes = this.bm25Service.getSimilarNotes(a, 100)
      
      // Convert BM25 results to ResultMap format
      for (const result of similarNotes) {
        results[result.path] = {
          measure: result.score,
          extra: []
        }
      }
      
      // Add zero scores for nodes not returned by BM25
      this.forEachNode((node: string) => {
        if (!results[node]) {
          results[node] = { measure: 0, extra: [] }
        }
      })
      
      // Apply min-max normalization to ensure 0-1 range consistency
      const nonZeroScores = Object.values(results)
        .map(r => r.measure)
        .filter(score => score > 0)
      
      if (nonZeroScores.length > 0) {
        const minScore = Math.min(...nonZeroScores)
        const maxScore = Math.max(...nonZeroScores)
        const scoreRange = maxScore - minScore
        
        // Normalize scores to 0-1 range
        for (const [node, result] of Object.entries(results)) {
          if (result.measure > 0 && scoreRange > 0) {
            result.measure = roundNumber((result.measure - minScore) / scoreRange)
          }
        }
      }
      
      return results
    },


    'Link Suggestions': async (a: string): Promise<ResultMap> => {
      // Check cache first
      const cached = this.resourceAllocationCache.get(a)
      if (cached) {
        return cached
      }

      const results: ResultMap = {}
      
      // First, get BM25 similarity candidates to gate the computation
      const similarNotes = this.bm25Service.getSimilarNotes(a, 400)
      const candidates = new Set(similarNotes.map(result => result.path))
      
      // Get neighbors of source node a
      const neighborsA = this.neighbors(a)
      
      // For each candidate (or all nodes if no BM25 gating)
      this.forEachNode((to: string) => {
        // Skip self-comparison
        if (to === a) {
          results[to] = { measure: 0, extra: [] }
          return
        }
        
        // Only compute RA for BM25 candidates (performance optimization)
        if (candidates.size > 0 && !candidates.has(to)) {
          results[to] = { measure: 0, extra: [] }
          return
        }
        
        // Get neighbors of target node
        const neighborsTo = this.neighbors(to)
        
        // Find shared neighbors (intersection)
        const sharedNeighbors = intersection(neighborsA, neighborsTo)
        
        if (sharedNeighbors.length === 0) {
          results[to] = { measure: 0, extra: [] }
          return
        }
        
        // Compute Resource Allocation score: RA(a,to) = Σ_{z ∈ sharedNeighbors} 1/deg(z)
        let raScore = 0
        const explanations: string[] = []
        
        for (const sharedNeighbor of sharedNeighbors) {
          const degree = this.degree(sharedNeighbor)
          if (degree > 0) {
            const contribution = 1 / degree
            raScore += contribution
            // Create explanation for this shared neighbor
            explanations.push(`${sharedNeighbor} (1/${degree})`)
          }
        }
        
        results[to] = {
          measure: roundNumber(raScore),
          extra: explanations
        }
      })
      
      // Cache the results before returning
      this.resourceAllocationCache.set(a, results)
      
      return results
    },

    'Relevant Notes': async (a: string): Promise<ResultMap> => {
      // Check cache first
      const cached = this.pageRankCache.get(a)
      if (cached) {
        return cached
      }

      const results: ResultMap = {}
      const alpha = 0.15 // Restart probability
      const epsilon = 1e-6 // Convergence threshold
      const maxIterations = 100
      const folderTagBoost = 1.1 // Boost for folder/tag relationships
      
      // Get all nodes
      const nodes = this.nodes()
      const nodeCount = nodes.length
      
      if (nodeCount === 0) return results
      
      // Initialize PageRank values: equal probability for all nodes
      let currentPR: { [node: string]: number } = {}
      let previousPR: { [node: string]: number } = {}
      
      const initialValue = 1.0 / nodeCount
      nodes.forEach(node => {
        currentPR[node] = initialValue
        previousPR[node] = initialValue
      })
      
      // Create restart vector (1 for source node a, 0 for others)
      const restartVector: { [node: string]: number } = {}
      nodes.forEach(node => {
        restartVector[node] = node === a ? 1.0 : 0.0
      })
      
      // Get file modification times for time decay (optional feature)
      const getFileModTime = (filePath: string): number => {
        try {
          const file = this.app.vault.getAbstractFileByPath(filePath)
          return file ? file.stat.mtime : 0
        } catch {
          return 0
        }
      }
      
      const currentTime = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      
      // Power iteration
      let iteration = 0
      let converged = false
      
      while (iteration < maxIterations && !converged) {
        // Store previous values
        previousPR = { ...currentPR }
        
        // Reset current values
        nodes.forEach(node => {
          currentPR[node] = 0
        })
        
        // For each node, distribute its PageRank to its neighbors
        nodes.forEach(fromNode => {
          const outNeighbors = this.outNeighbors(fromNode)
          const outDegree = outNeighbors.length
          
          if (outDegree === 0) {
            // Dangling node: distribute equally to all nodes
            const contribution = previousPR[fromNode] / nodeCount
            nodes.forEach(node => {
              currentPR[node] += contribution
            })
          } else {
            // First pass: compute all edge weights and total weight
            const edgeWeights: { [toNode: string]: number } = {}
            let totalWeight = 0
            
            outNeighbors.forEach(toNode => {
              let edgeWeight = 1.0
              
              // Apply folder/tag boost
              try {
                const fromFile = this.app.vault.getAbstractFileByPath(fromNode)
                const toFile = this.app.vault.getAbstractFileByPath(toNode)
                
                if (fromFile && toFile && 'parent' in fromFile && 'parent' in toFile) {
                  // Same folder boost
                  if (fromFile.parent?.path === toFile.parent?.path) {
                    edgeWeight *= folderTagBoost
                  }
                }
                
                // Tag similarity boost (check if notes share tags)
                const fromCache = this.app.metadataCache.getCache(fromNode)
                const toCache = this.app.metadataCache.getCache(toNode)
                const fromTags = fromCache?.tags?.map(t => t.tag) || []
                const toTags = toCache?.tags?.map(t => t.tag) || []
                
                if (fromTags.length > 0 && toTags.length > 0) {
                  const sharedTags = fromTags.filter(tag => toTags.includes(tag))
                  if (sharedTags.length > 0) {
                    edgeWeight *= folderTagBoost
                  }
                }
              } catch {
                // If file operations fail, use base weight
              }
              
              // Optional time decay: boost recently modified files
              const modTime = getFileModTime(toNode)
              const daysSinceModified = (currentTime - modTime) / dayInMs
              const timeDecayFactor = Math.exp(-daysSinceModified * 0.1) // Decay over ~10 days
              edgeWeight *= (1 + timeDecayFactor * 0.2) // Up to 20% boost for recent files
              
              edgeWeights[toNode] = edgeWeight
              totalWeight += edgeWeight
            })
            
            // Second pass: distribute normalized contributions to maintain stochastic property
            outNeighbors.forEach(toNode => {
              // Normalize contribution by total weight to preserve probability mass
              const normalizedContribution = previousPR[fromNode] * (edgeWeights[toNode] / totalWeight)
              currentPR[toNode] += normalizedContribution
            })
          }
        })
        
        // Apply damping factor and restart probability
        nodes.forEach(node => {
          currentPR[node] = (1 - alpha) * currentPR[node] + alpha * restartVector[node]
        })
        
        // Check convergence
        let maxDiff = 0
        nodes.forEach(node => {
          const diff = Math.abs(currentPR[node] - previousPR[node])
          maxDiff = Math.max(maxDiff, diff)
        })
        
        if (maxDiff < epsilon) {
          converged = true
        }
        
        iteration++
      }
      
      // Get min and max scores for normalization (excluding the source node)
      const scoresArray = nodes.filter(node => node !== a).map(node => currentPR[node])
      const minScore = Math.min(...scoresArray)
      const maxScore = Math.max(...scoresArray)
      const scoreRange = maxScore - minScore
      
      // Convert to ResultMap format with influence path explanations
      nodes.forEach(node => {
        if (node === a) {
          results[node] = { measure: 0, extra: [] }
          return
        }
        
        const rawScore = currentPR[node]
        
        // Normalize to 0-1 range using min-max normalization
        const normalizedScore = scoreRange > 0 ? (rawScore - minScore) / scoreRange : 0
        
        const explanations: string[] = []
        
        // Add convergence info
        explanations.push(`Converged in ${iteration} iterations`)
        
        // Add influence explanation (based on raw score for better thresholds)
        if (rawScore > initialValue * 1.5) {
          explanations.push('High influence from source')
        } else if (rawScore > initialValue) {
          explanations.push('Moderate influence from source')
        } else {
          explanations.push('Low influence from source')
        }
        
        // Check if this node has direct or strong indirect connections to source
        const directNeighbors = this.neighbors(a)
        if (directNeighbors.includes(node)) {
          explanations.push('Directly connected')
        } else {
          // Check for two-hop connections
          const twoHopConnected = directNeighbors.some(neighbor => 
            this.neighbors(neighbor).includes(node)
          )
          if (twoHopConnected) {
            explanations.push('Two-hop connection')
          }
        }
        
        results[node] = {
          measure: roundNumber(normalizedScore),
          extra: explanations
        }
      })
      
      // Cache the results before returning
      this.pageRankCache.set(a, results)
      
      return results
    },

    // 'Closeness': (a: string) => {
    //     const paths = graphlib.alg.dijkstra(this, a);
    //     const results: number[] = []
    //     const nNodes = this.nodes().length

    //     const distances = [];
    //     for (const to in paths) {
    //         const dist = paths[to].distance;
    //         if (dist < Infinity) {
    //             distances.push(dist);
    //         }
    //     }

    //     if (distances.length > 0) {
    //         closeness = roundNumber((nNodes - 1) / sum(distances));
    //     } else {
    //         closeness = 0;
    //     }
    //     return results
    // },
  }
}

