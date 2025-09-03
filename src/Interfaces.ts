import type { TFile } from 'obsidian'


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
  | 'Unified Recommendations'

export type Subtype =
  | 'Home'
  | 'Link Suggestions'
  | 'Relevant Notes'
  | 'Similar Content'

export interface Communities {
  [group: string]: string[]
}
export interface ResultMap {
  [to: string]: { measure: number; extra: string[] }
}







export type AnalysisAlg<T> = (a: string, options?: object) => Promise<T>

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
  homeWeightLinkSuggestions: number
  homeWeightRelevantNotes: number
  homeWeightSimilarContent: number
  homeMaxResults: number
  excludeAlreadyLinked: boolean
  showRefreshNotice: boolean
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
