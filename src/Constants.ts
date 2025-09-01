import type { GraphAnalysisSettings, SubtypeInfo } from './Interfaces'

export const DEFAULT_SETTINGS: GraphAnalysisSettings = {
  noInfinity: true,
  noZero: true,
  allFileExtensions: true,
  showImgThumbnails: true,
  addUnresolved: true,
  coTags: true,
  defaultSubtypeType: 'Home',
  debugMode: false,
  superDebugMode: false,
  exclusionRegex: '',
  exclusionTags: [],
  algsToShow: [
    'Home',
    'Link Suggestions',
    'Relevant Notes', 
    'Similar Content',
  ],
  homeWeightLinkSuggestions: 33,
  homeWeightRelevantNotes: 33,
  homeWeightSimilarContent: 34,
  homeMaxResults: 15,
  excludeAlreadyLinked: false,
  showRefreshNotice: false,
}

export const DECIMALS = 2

export const VIEW_TYPE_GRAPH_ANALYSIS = 'graph-analysis'

export const LINKED = 'GA-linked'
export const NOT_LINKED = 'GA-not-linked'

export const MEASURE = 'GA-measure'
export const NODE = 'GA-node'

export const ICON = 'GA-icon'

export const ANALYSIS_TYPES: SubtypeInfo[] = [
  {
    anl: 'Unified Recommendations',
    subtype: 'Home',
    desc: 'Combined recommendations using all algorithms. Weighted average of Link Suggestions, Relevant Notes, and Similar Content with visual similarity indicators and algorithm breakdown.',
    global: false,
    nlp: true,
  },
  {
    anl: 'Link Prediction',
    subtype: 'Link Suggestions',
    desc: 'What should this note be linked to? Predicts which notes should be linked based on shared neighbors weighted by their degree using Resource Allocation algorithm. Higher scores indicate stronger link recommendations.',
    global: false,
    nlp: false,
  },
  {
    anl: 'Centrality',
    subtype: 'Relevant Notes',
    desc: 'What else is worth attention? Personalized influence ranking starting from the current note using Personalized PageRank. Uses power iteration with folder/tag boosts and time decay for recent modifications.',
    global: false,
    nlp: false,
  },
  {
    anl: 'Similarity',
    subtype: 'Similar Content',
    desc: 'Most similar notes. Uses advanced BM25F text similarity with field-weighted scoring (title boosted 2x) via Otsuka-Chiai algorithm to find content-similar notes.',
    global: false,
    nlp: true,
  },
]

export const IMG_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']

export const iconSVG = `<path fill="currentColor" stroke="currentColor" d="M88.8,67.5c-3,0-5.7,1.2-7.7,3.1l-12.2-7c0.7-1.9,1.2-3.9,1.2-6.1C70,47.8,62.2,40,52.5,40c-1.3,0-2.6,0.2-3.8,0.5l-5-10.8
c2.3-2.1,3.8-5,3.8-8.4c0-6.2-5-11.3-11.3-11.3S25,15,25,21.3s5,11.3,11.3,11.3c0.1,0,0.3,0,0.4,0l5.2,11.2
c-4.2,3.2-6.9,8.2-6.9,13.8C35,67.2,42.8,75,52.5,75c4.8,0,9.2-1.9,12.3-5.1l12.8,7.3c-0.1,0.5-0.2,1-0.2,1.5
c0,6.2,5,11.3,11.3,11.3S100,85,100,78.7S95,67.5,88.8,67.5z M36.3,25c-2.1,0-3.8-1.7-3.8-3.8s1.7-3.8,3.8-3.8s3.8,1.7,3.8,3.8
S38.3,25,36.3,25z M52.5,67.5c-5.5,0-10-4.5-10-10s4.5-10,10-10s10,4.5,10,10S58,67.5,52.5,67.5z M88.8,82.5c-2.1,0-3.8-1.7-3.8-3.8
s1.7-3.8,3.8-3.8s3.8,1.7,3.8,3.8S90.8,82.5,88.8,82.5z M80.3,41.7l-3-4l-7.5,5.6l3,4L80.3,41.7z M90,40c5.5,0,10-4.5,10-10
s-4.5-10-10-10s-10,4.5-10,10S84.5,40,90,40z M23.8,60h7.5v-5h-7.5V60z M10,47.5c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10
S15.5,47.5,10,47.5z"/>`
