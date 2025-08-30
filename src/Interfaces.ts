import type { TFile } from 'obsidian'
import { ReferenceCache } from 'obsidian'

export interface ResolvedLinks {
  [from: string]: {
    [to: string]: number
  }
}

export type SubtypeInfo = {
  subtype: Subtype
  global: boolean
  desc: string
  anl: Analyses
  nlp: boolean
}

export type Analyses =
  | 'Centrality'
  | 'Link Prediction'
  | 'Similarity'
  | 'Co-Citations'
  | 'Community Detection'
  | 'NLP'

export type Subtype =
  | 'HITS'
  | 'Adamic Adar'
  // | 'Common Neighbours'
  | 'Jaccard'
  | 'Co-Citations'
  | 'Label Propagation'
  | 'Louvain'
  | 'Overlap'
  | 'Clustering Coefficient'
  | 'BoW'
  // | 'Tversky'
  | 'Otsuka-Chiai'
  | 'Sentiment'
  | 'Resource Allocation'
  | 'Personalized PageRank'

export interface Communities {
  [group: string]: string[]
}
export interface ResultMap {
  [to: string]: { measure: number; extra: string[] }
}

export type HITSResult = {
  converged: boolean
  authorities: { [node: string]: number }
  hubs: { [node: string]: number }
}

export interface ComponentResults {
  measure: number
  linked: boolean
  to: string
  resolved: boolean
  extra: any
  img: Promise<ArrayBuffer>
}

export interface CoCitation {
  sentence: string[]
  measure: number
  source: string
  line: number
}

export interface CoCitationRes {
  measure: number
  resolved: boolean
  coCitations: CoCitation[]
}

export interface CoCitationMap {
  [linkName: string]: CoCitationRes
}

export interface LineSentences {
  line: number
  linkSentence: number
  linkSentenceStart: number
  linkSentenceEnd: number
  sentences: [string]
  link: ReferenceCache
}

export type AnalysisAlg<T> = (a: string, options?: {}) => Promise<T>

export interface GraphAnalysisSettings {
  noInfinity: boolean
  noZero: boolean
  allFileExtensions: boolean
  showImgThumbnails: boolean
  addUnresolved: boolean
  coTags: boolean
  defaultSubtypeType: Subtype
  debugMode: boolean
  superDebugMode: boolean
  exclusionRegex: string
  exclusionTags: string[]
  algsToShow: Subtype[]
}


declare module 'obsidian' {
  interface App {
    plugins: {
      plugins: {
        metaedit: {
          api: {
            createYamlProperty(
              key: string,
              value: string,
              file: TFile
            ): Promise<void>
            update(key: string, value: string, file: TFile): Promise<void>
          }
        }
      }
    }
  }
  interface Editor {
    cm: {
      findWordAt: (pos: EditorPosition) => EditorSelection | null
      state: {
        wordAt: (offset: number) => { fromOffset: number; toOffset: number }
      }
      getDoc: () => Doc
      getScrollInfo: () => { top: number; left: number; clientHeight: number }
    }
  }

  interface Doc {
    markText: (
      from: EditorPosition,
      to: EditorPosition,
      options?: { className?: string }
    ) => TextMarker
    children: LeafChunk[]
  }

  interface LeafChunk {
    lines: Line[]
  }

  interface TextMarker {
    className: string
    doc: Doc
    id: number
    lines: Line[]
    type: string
    clear: () => void
  }

  interface Line {
    markedSpans: MarkedSpan[]
    text: string
    parent: LeafChunk
  }

  interface MarkedSpan {
    from: number
    to: number
    marker: TextMarker
  }

  interface WorkspaceItem {
    side: 'left' | 'right'
  }
}
