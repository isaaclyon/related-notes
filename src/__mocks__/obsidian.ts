// Mock implementation of Obsidian API for testing

export interface MockTFile {
  path: string
  name: string
  basename: string
  extension: string
  stat: {
    ctime: number
    mtime: number
    size: number
  }
}

export interface MockCacheItem {
  tags?: { tag: string }[]
  links?: { link: string; displayText?: string }[]
  headings?: { heading: string; level: number }[]
}

export interface MockMetadataCache {
  resolvedLinks: Record<string, Record<string, number>>
  unresolvedLinks: Record<string, Record<string, number>>
  getCache: (path: string) => MockCacheItem | null
  getFirstLinkpathDest: (path: string, sourcePath: string) => MockTFile | null
}

export interface MockVault {
  getFiles: () => MockTFile[]
  getMarkdownFiles: () => MockTFile[]
  read: (file: MockTFile) => Promise<string>
  cachedRead: (file: MockTFile) => Promise<string>
  readBinary: (file: MockTFile) => Promise<ArrayBuffer>
  getAbstractFileByPath: (path: string) => MockTFile | null
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void
}

export interface MockWorkspace {
  getLeavesOfType: (type: string) => MockWorkspaceLeaf[]
  getActiveFile: () => MockTFile | null
  on: (event: string, callback: Function) => void
}

export interface MockWorkspaceLeaf {
  view: any
}

export interface MockApp {
  vault: MockVault
  workspace: MockWorkspace
  metadataCache: MockMetadataCache
}

// Mock classes
export class Plugin {
  app: MockApp
  settings: any = {}

  constructor() {
    this.app = createMockApp()
  }

  async loadSettings(): Promise<any> {
    return this.settings
  }

  async saveSettings(): Promise<void> {
    // Mock implementation
  }

  addCommand(command: any): void {
    // Mock implementation
  }

  addSettingTab(tab: any): void {
    // Mock implementation
  }

  registerView(type: string, viewCreator: Function): void {
    // Mock implementation
  }

  registerEvent(event: any): void {
    // Mock implementation
  }
}

export class ItemView {
  app: MockApp
  leaf: MockWorkspaceLeaf
  contentEl: HTMLElement

  constructor(leaf: MockWorkspaceLeaf) {
    this.leaf = leaf
    this.app = createMockApp()
    this.contentEl = document.createElement('div')
  }

  getViewType(): string {
    return 'mock-view'
  }

  getDisplayText(): string {
    return 'Mock View'
  }

  async onOpen(): Promise<void> {
    // Mock implementation
  }

  onClose(): Promise<void> {
    return Promise.resolve()
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {
    console.log(`Notice: ${message}`)
  }
}

export class Menu {
  addItem(callback: (item: any) => void): this {
    const item = {
      setTitle: (title: string) => item,
      setIcon: (icon: string) => item,
      onClick: (callback: Function) => item
    }
    callback(item)
    return this
  }

  showAtMouseEvent(event: MouseEvent): void {
    // Mock implementation
  }
}

// Mock utility functions
export function addIcon(id: string, svgContent: string): void {
  // Mock implementation
}

export function getAllTags(cache: MockCacheItem): string[] {
  return cache.tags?.map(t => t.tag) || []
}

export function getLinkpath(link: string): string {
  return link.replace(/\[\[|\]\]/g, '')
}

// Factory functions for creating mock data
export function createMockApp(): MockApp {
  return {
    vault: createMockVault(),
    workspace: createMockWorkspace(),
    metadataCache: createMockMetadataCache()
  }
}

export function createMockVault(): MockVault {
  const mockFiles: MockTFile[] = []
  
  return {
    getFiles: () => mockFiles,
    getMarkdownFiles: () => mockFiles.filter(f => f.extension === 'md'),
    read: async (file: MockTFile) => `Mock content for ${file.name}`,
    cachedRead: async (file: MockTFile) => `Mock content for ${file.name}`,
    readBinary: async (file: MockTFile) => new ArrayBuffer(100),
    getAbstractFileByPath: (path: string) => {
      return mockFiles.find(f => f.path === path) || null
    },
    on: (event: string, callback: Function) => {
      // Mock event registration
    },
    off: (event: string, callback: Function) => {
      // Mock event unregistration  
    }
  }
}

export function createMockWorkspace(): MockWorkspace {
  return {
    getLeavesOfType: (type: string) => [],
    getActiveFile: () => null,
    on: (event: string, callback: Function) => {
      // Mock event registration
    }
  }
}

export function createMockMetadataCache(): MockMetadataCache {
  return {
    resolvedLinks: {},
    unresolvedLinks: {},
    getCache: (path: string) => null,
    getFirstLinkpathDest: (path: string, sourcePath: string) => null
  }
}

export function createMockFile(path: string, content = ''): MockTFile {
  const name = path.split('/').pop() || path
  const parts = name.split('.')
  const extension = parts.length > 1 ? parts.pop()! : ''
  const basename = parts.join('.')

  return {
    path,
    name,
    basename,
    extension,
    stat: {
      ctime: Date.now(),
      mtime: Date.now(),
      size: content.length
    }
  }
}

export function createMockCache(overrides: Partial<MockCacheItem> = {}): MockCacheItem {
  return {
    tags: [],
    links: [],
    headings: [],
    ...overrides
  }
}

// Set up mock vault with test data
export function setupMockVaultWithNotes(notes: Array<{path: string, content: string, links?: string[], tags?: string[]}>): MockApp {
  const app = createMockApp()
  const files: MockTFile[] = []
  const resolvedLinks: Record<string, Record<string, number>> = {}
  const caches: Record<string, MockCacheItem> = {}

  notes.forEach(note => {
    const file = createMockFile(note.path, note.content)
    files.push(file)

    // Set up links
    if (note.links?.length) {
      resolvedLinks[note.path] = {}
      note.links.forEach(link => {
        resolvedLinks[note.path][link] = 1
      })
    }

    // Set up cache
    caches[note.path] = createMockCache({
      tags: note.tags?.map(tag => ({ tag })) || [],
      links: note.links?.map(link => ({ link })) || []
    })
  })

  // Update app with test data
  app.vault.getFiles = () => files
  app.vault.getMarkdownFiles = () => files.filter(f => f.extension === 'md')
  app.vault.read = async (file: MockTFile) => {
    const note = notes.find(n => n.path === file.path)
    return note?.content || ''
  }
  app.vault.cachedRead = async (file: MockTFile) => {
    const note = notes.find(n => n.path === file.path)
    return note?.content || ''
  }
  app.vault.getAbstractFileByPath = (path: string) => {
    return files.find(f => f.path === path) || null
  }
  app.metadataCache.resolvedLinks = resolvedLinks
  app.metadataCache.getCache = (path: string) => caches[path] || null

  return app
}

// Export types that might be imported
export type {
  WorkspaceLeaf,
  TFile,
  CacheItem,
  TagCache,
  LinkCache,
  HeadingCache,
  ListItemCache,
  ReferenceCache,
  App
} from 'obsidian'

// Re-export with mock implementations where needed
export interface WorkspaceLeaf extends MockWorkspaceLeaf {}
export interface TFile extends MockTFile {}
export interface CacheItem extends MockCacheItem {}
export interface App extends MockApp {}