import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import hits from 'graphology-metrics/centrality/hits'

import {
  App,
  CacheItem,
  HeadingCache, ListItemCache,
  Notice,
  ReferenceCache,
  TagCache,
} from 'obsidian'
import { getAllTags, getLinkpath } from 'obsidian'
import tokenizer from 'sbd'
import {
  clusteringCoefficient,
  gatherCommunities,
  intersection,
} from './GeneralGraphFn'
import type {
  AnalysisAlg,
  CoCitation,
  CoCitationMap, CoCitationRes,
  Communities,
  GraphAnalysisSettings,
  HITSResult, LineSentences,
  ResultMap,
  Subtype,
} from './Interfaces'
import { addPreCocitation, findSentence, getCounts, getMaxKey, roundNumber, sum } from './Utility'
import { BM25Service, type ScoredResult, type BM25Options } from './index/BM25Service'

export default class MyGraph extends Graph {
  app: App
  settings: GraphAnalysisSettings
  bm25Service: BM25Service

  constructor(app: App, settings: GraphAnalysisSettings) {
    super()
    this.app = app
    this.settings = settings
    this.bm25Service = new BM25Service()
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

  algs: {
    [subtype in Subtype]: AnalysisAlg<
      ResultMap | CoCitationMap | Communities | string[] | HITSResult
    >
  } = {
    Jaccard: async (a: string): Promise<ResultMap> => {
      const Na = this.neighbors(a)
      const results: ResultMap = {}
      this.forEachNode((to) => {
        const Nb = this.neighbors(to)
        const Nab = intersection(Na, Nb)
        const denom = Na.length + Nb.length - Nab.length
        let measure = denom !== 0 ? roundNumber(Nab.length / denom) : Infinity

        results[to] = { measure, extra: Nab }
      })
      return results
    },

    HITS: async (a: string) => {
      return hits(this)
    },

    Overlap: async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.neighbors(a)
      this.forEachNode((to) => {
        const Nb = this.neighbors(to)
        const Nab = intersection(Na, Nb)
        let measure =
          Na.length !== 0 && Nb.length !== 0
            ? // The square weights the final result by the number of nodes in the overlap
              roundNumber(Nab.length ** 2 / Math.min(Na.length, Nb.length))
            : Infinity

        results[to] = { measure, extra: Nab }
      })
      return results
    },

    'Adamic Adar': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.neighbors(a)

      this.forEachNode((to) => {
        const Nb = this.neighbors(to)
        const Nab = intersection(Na, Nb)
        let measure = Infinity
        if (Nab.length) {
          const neighbours: number[] = Nab.map(
            (n) => this.outNeighbors(n).length
          )
          measure = roundNumber(
            sum(neighbours.map((neighbour) => 1 / Math.log(neighbour)))
          )
        }
        results[to] = { measure, extra: Nab }
      })
      return results
    },

    // 'Common Neighbours': async (a: string): Promise<ResultMap> => {
    //   const Na = this.neighbors(a)
    //   const results: ResultMap = {}

    //   this.forEachNode((to) => {
    //     const Nb = this.neighbors(to)
    //     const Nab = intersection(Na, Nb)
    //     const measure = Nab.length
    //     results[to] = { measure, extra: Nab }
    //   })
    //   return results
    // },

    'Co-Citations': async (a: string): Promise<CoCitationMap> => {
      const mdCache = this.app.metadataCache
      const results = {} as CoCitationMap
      const { settings } = this

      // const pres = this.inNeighbors(a)
      // for (const preI in pres) {
      //   const pre = pres[preI]
      this.forEachInNeighbor(a, async (pre) => {
        const file = mdCache.getFirstLinkpathDest(pre, '')
        if (!file) return

        const cache = mdCache.getFileCache(file)

        const preCocitations: { [name: string]: [number, CoCitation[]] } = {}
        const allLinks = [...cache.links]
        if (cache.embeds) {
          allLinks.push(...cache.embeds)
        }
        const ownLinks = allLinks.filter((link) => {
          const linkFile = mdCache.getFirstLinkpathDest(
            getLinkpath(link.link),
            file.path
          )
          if (!linkFile) return false

          const extensionQ =
            settings.allFileExtensions || linkFile.extension === 'md'
          return linkFile.path === a && extensionQ
        })

        const cachedRead = await this.app.vault.cachedRead(file)
        const lines = cachedRead.split('\n')

        // Find the sentence the link is in
        const ownSentences: LineSentences[] =
          ownLinks.map((link) => {
            let line = lines[link.position.end.line]
            const sentences = tokenizer.sentences(line, {
              preserve_whitespace: true,
            })
            let [linkSentence, linkSentenceStart, linkSentenceEnd] = findSentence(sentences, link)
            return {sentences, link, line: link.position.end.line, linkSentence, linkSentenceStart, linkSentenceEnd}

          })

        const ownListItems: ListItemCache[] = cache.listItems ?
          cache.listItems.filter((listItem) => {
            return ownLinks.find((link) =>
              link.position.start.line >= listItem.position.start.line &&
              link.position.end.line <= listItem.position.end.line)
            }) : []

        // Find the section the link is in
        const ownSections = ownLinks.map((link) =>
          cache.sections.find(
            (section) =>
              section.position.start.line <= link.position.start.line &&
              section.position.end.line >= link.position.end.line
          )
        )

        // Find the headings the link is under
        let minHeadingLevel = 7
        let maxHeadingLevel = 0
        const ownHeadings: [HeadingCache, number][] = []
        ownLinks.forEach((link) => {
          if (!cache.headings) return
          cache.headings.forEach((heading, index) => {
            minHeadingLevel = Math.min(minHeadingLevel, heading.level)
            maxHeadingLevel = Math.max(maxHeadingLevel, heading.level)
            // The link falls under this header!
            if (heading.position.start.line <= link.position.start.line) {
              for (const j of Array(cache.headings.length - index - 1).keys()) {
                let nextHeading = cache.headings[j + index + 1]
                // Scan for the next header with at least as low of a level
                if (nextHeading.level >= heading.level) {
                  if (
                    nextHeading.position.start.line <= link.position.start.line
                  )
                    return
                  ownHeadings.push([heading, nextHeading.position.start.line])
                  return
                }
              }
              // No more headers after this one. Use arbitrarily number for length to keep things simple...
              ownHeadings.push([heading, 100000000000])
            }
          })
        })
        minHeadingLevel =
          cache.headings && cache.headings.length > 0 ? minHeadingLevel : 0
        maxHeadingLevel =
          cache.headings && cache.headings.length > 0 ? maxHeadingLevel : 0

        // Intuition of weight: The least specific heading will give the weight 2 + maxHeadingLevel - minHeadingLevel
        // We want to weight it 1 factor less.
        const minScore = 1 / Math.pow(2, 4 + maxHeadingLevel - minHeadingLevel)

        const coCiteCandidates: CacheItem[] = [...allLinks]
        if (cache.tags && settings.coTags) {
          coCiteCandidates.push(...cache.tags)
        }
        coCiteCandidates.forEach((item) => {
          let linkPath: string = null
          if ('link' in item) {
            const linkFile = mdCache.getFirstLinkpathDest(
              getLinkpath((item as ReferenceCache)?.link ?? '') ?? '',
              file.path
            )
            if (!linkFile) {
              linkPath = (item as ReferenceCache).link
            }
            // If you don't want to check all extensions AND the extension is not .md, return
            // The negation is, if you want to check all files, OR the extension is .md, then don't return yet
            else if (
              !settings.allFileExtensions &&
              linkFile.extension !== 'md'
            ) {
              return
            } else {
              // Something is happening here where imgs aren't being added to preCocitations...
              // I think it's because only the basename is being added as a key, but the whole path is needed when accessing it for `results`
              linkPath = linkFile.path
              if (linkPath === a) return
            }
          } else if ('tag' in item) {
            linkPath = (item as TagCache).tag
          } else return

          // Initialize to 0 if not set yet
          if (!(linkPath in preCocitations)) {
            preCocitations[linkPath] = [0, []]
          }

          const lineContent = lines[item.position.start.line]
          // Check if the link is on the same line
          let hasOwnLine = false
          ownSentences.forEach((lineSentence) => {
            // On the same line
            if (item.position.start.line === lineSentence.line) {
              const [itemSentence, itemSentenceStart, itemSentenceEnd] = findSentence(lineSentence.sentences, item)
              const ownLink = lineSentence.link
              const m1Start = Math.min(
                item.position.start.col,
                ownLink.position.start.col
              )
              const m1End = Math.min(
                item.position.end.col,
                ownLink.position.end.col
              )
              const m2Start = Math.max(
                item.position.start.col,
                ownLink.position.start.col
              )
              const m2End = Math.max(
                item.position.end.col,
                ownLink.position.end.col
              )
              // Break sentence up between the two links. Used for rendering
              const slicedSentence = [
                lineContent.slice(Math.min(itemSentenceStart, lineSentence.linkSentenceStart), m1Start),
                lineContent.slice(m1Start, m1End),
                lineContent.slice(m1End, m2Start),
                lineContent.slice(m2Start, m2End),
                lineContent.slice(m2End, Math.max(itemSentenceEnd, lineSentence.linkSentenceEnd)),
              ]

              let measure = 1 / 2
              const sentenceDist = Math.abs(itemSentence - lineSentence.linkSentence)

              // Granularity of sentence distance scores
              if (sentenceDist === 0) {
                measure = 1
              }
              else if (sentenceDist === 1) {
                measure = 0.85
              }
              else if (sentenceDist === 2) {
                measure = 0.7
              }
              else if (sentenceDist === 3) {
                measure = 0.6
              }

              preCocitations[linkPath][0] = Math.max(measure, preCocitations[linkPath][0])
              preCocitations[linkPath][1].push({
                sentence: slicedSentence,
                measure,
                source: pre,
                line: lineSentence.line,
              })

              // We have to run this for every OwnSentence since there might be multiple on the same line
              hasOwnLine = true
            }
          })
          if (hasOwnLine) return

          const sentence = [
            lineContent.slice(0, item.position.start.col),
            lineContent.slice(item.position.start.col, item.position.end.col),
            lineContent.slice(item.position.end.col, lineContent.length),
          ]

          // Check if in an outline hierarchy
          const listItem: ListItemCache =
            cache?.listItems?.find((listItem) =>
                item.position.start.line >= listItem.position.start.line &&
                item.position.end.line <= listItem.position.end.line
            )
          let foundHierarchy = false
          if (listItem) {
            ownListItems.forEach((ownListItem) => {
              // Shared parent is good!
              if (ownListItem.parent === listItem.parent) {
                addPreCocitation(preCocitations, linkPath, 0.4, sentence, pre, item.position.start.line)
                foundHierarchy = true
                return
              }

              // If one of the appearances is further down the hierachy,
              //   but in the same one,
              //   that is also nice! But has to be done in both directions
              // First, up from ownListItem
              const findInHierarchy = function(from: ListItemCache, to: ListItemCache): boolean {
                let iterListItem: ListItemCache = from
                let distance = 1
                // Negative parents denote top-level list items
                while (iterListItem.parent > 0) {
                  if (iterListItem.parent === to.position.start.line) {
                    let measure = 0.3
                    if (distance === 1) {
                      measure = 0.6
                    }
                    else if (distance === 2) {
                      measure = 0.5
                    }
                    else if (distance === 3) {
                      measure = 0.4
                    }
                    else if (distance === 4) {
                      measure = 0.35
                    }
                    addPreCocitation(preCocitations, linkPath, measure, sentence, pre, item.position.start.line)
                    return true
                  }
                  distance += 1
                  // Move to the parent
                  iterListItem = cache.listItems.find((litem) =>
                    iterListItem.parent === litem.position.start.line)
                }
                return false
              }
              if (findInHierarchy(ownListItem, listItem) || findInHierarchy(listItem, ownListItem)) {
                foundHierarchy = true
              }
            })
          }
          if (foundHierarchy) return


          // Check if it is in the same paragraph
          const sameParagraph = ownSections.find(
            (section) =>
              section.position.start.line <= item.position.start.line &&
              section.position.end.line >= item.position.end.line
          )
          if (sameParagraph) {
            addPreCocitation(preCocitations, linkPath, 1 / 4, sentence, pre, item.position.start.line)
            return
          }

          // Find the best corresponding heading
          const headingMatches = ownHeadings.filter(
            ([heading, end]) =>
              heading.position.start.line <= item.position.start.line &&
              end > item.position.end.line
          )
          if (headingMatches.length > 0) {
            const bestLevel = Math.max(
              ...headingMatches.map(([heading, _]) => heading.level)
            )
            // Intuition: If they are both under the same 'highest'-level heading, they get weight 1/4
            // Then, maxHeadingLevel - bestLevel = 0, so we get 1/(2^2)=1/4. If the link appears only under
            // less specific headings, the weight will decrease.
            const score = 1 / Math.pow(2, 3 + maxHeadingLevel - bestLevel)
            addPreCocitation(preCocitations, linkPath, score, sentence, pre, item.position.start.line)
            return
          }

          // The links appear together in the same document, but not under a shared heading
          addPreCocitation(preCocitations, linkPath, minScore, sentence, pre, item.position.start.line)
        })

        if (settings.coTags) {
          getAllTags(cache).forEach((tag) => {
            if (!(tag in preCocitations)) {
              // Tag defined in YAML. Gets the lowest score (has no particular position)

              preCocitations[tag] = [
                minScore,
                [
                  {
                    measure: minScore,
                    sentence: ['', '', ''],
                    source: pre,
                    line: 0,
                  },
                ],
              ]
            }
          })
        }

        // Add the found weights to the results
        for (let key in preCocitations) {
          const file = mdCache.getFirstLinkpathDest(key, '')
          let name = null
          let resolved = true
          if (file) {
            name = file.path
          } else if (key[0] === '#') {
            name = key
          } else if (settings.addUnresolved) {
            name = key + '.md'
            resolved = false
          } else {
            continue
          }
          let cocitation = preCocitations[key]
          if (name in results) {
            results[name].measure += cocitation[0]
            results[name].coCitations.push(...cocitation[1])
          } else {
            results[name] = {
              measure: cocitation[0],
              coCitations: cocitation[1],
              resolved
            };
          }
        }
      })
      results[a] = { measure: 0, coCitations: [], resolved: true };

      return results
    },

    'Label Propagation': async (
      a: string,
      options: { iterations: number }
    ): Promise<Communities> => {
      let labeledNodes: { [node: string]: string } = {}
      this.forEachNode((node) => {
        labeledNodes[node] = node
      })

      for (let i = 0; i < options.iterations; i++) {
        const newLabeledNodes: { [node: string]: string } = {}
        this.forEachNode((node) => {
          const neighbours = this.neighbors(node)
          if (neighbours.length) {
            const neighbourLabels = neighbours.map(
              // Take the label from the not-yet-updated-labels
              (neighbour) => labeledNodes[neighbour]
            )
            const counts = getCounts(neighbourLabels)
            newLabeledNodes[node] = getMaxKey(counts)
          }
        })
        // Update the labels
        labeledNodes = newLabeledNodes
      }

      // Create the communities
      return gatherCommunities(labeledNodes)
    },

    Louvain: async (
      a: string,
      options: { resolution: number } = { resolution: 10 }
    ): Promise<string[]> => {
      const labelledNodes = louvain(this, options)
      const labelOfA = labelledNodes[a]
      const currComm: string[] = []
      this.forEachNode((node) => {
        if (labelledNodes[node] === labelOfA) {
          currComm.push(node)
        }
      })
      return currComm
    },

    'Clustering Coefficient': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}

      this.forEachNode((to: string) => {
        const { coeff, triangles } = clusteringCoefficient(this, to)
        results[to] = {
          measure: roundNumber(coeff),
          extra: triangles.map((group) => group.join(', ')),
        }
      })
      return results
    },

    BoW: async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      
      // Use BM25 similarity instead of bag-of-words cosine similarity
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
      
      return results
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
      
      return results
    },

    Sentiment: async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      
      // Sentiment analysis removed - returning empty results
      // This was dependent on wink-nlp which has been removed
      this.forEachNode((node) => {
        results[node] = { measure: 0, extra: [] }
      })
      
      return results
    },

    'Link Suggestions': async (a: string): Promise<ResultMap> => {
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
      
      return results
    },

    'Relevant Notes': async (a: string): Promise<ResultMap> => {
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
      
      // Convert to ResultMap format with influence path explanations
      nodes.forEach(node => {
        if (node === a) {
          results[node] = { measure: 0, extra: [] }
          return
        }
        
        const score = currentPR[node]
        const explanations: string[] = []
        
        // Add convergence info
        explanations.push(`Converged in ${iteration} iterations`)
        
        // Add influence explanation
        if (score > initialValue * 1.5) {
          explanations.push('High influence from source')
        } else if (score > initialValue) {
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
          measure: roundNumber(score),
          extra: explanations
        }
      })
      
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

