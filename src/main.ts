import { addIcon, Notice, Plugin, WorkspaceLeaf } from 'obsidian'
import { openView, wait } from 'obsidian-community-lib'
import AnalysisView from './AnalysisView'
import {
  ANALYSIS_TYPES,
  DEFAULT_SETTINGS,
  iconSVG,
  VIEW_TYPE_GRAPH_ANALYSIS,
} from './Constants'
import type { GraphAnalysisSettings } from './Interfaces'
import MyGraph from './MyGraph'
import { SampleSettingTab } from './Settings'
import { debug } from './Utility'

export default class GraphAnalysisPlugin extends Plugin {
  settings: GraphAnalysisSettings
  g: MyGraph
  refreshCounter: number = 0
  private updateQueue: Set<string> = new Set()
  private updateTimeout: NodeJS.Timeout | null = null
  private readonly UPDATE_DEBOUNCE_MS = 300

  async onload() {
    console.log('loading graph analysis plugin')

    await this.loadSettings()
    addIcon('GA-ICON', iconSVG)

    this.addCommand({
      id: 'show-graph-analysis-view',
      name: 'Open Related Notes View',
      checkCallback: (checking: boolean) => {
        let checkResult =
          this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)
            .length === 0

        if (checkResult) {
          // Only perform work when checking is false
          if (!checking) {
            openView(this.app, VIEW_TYPE_GRAPH_ANALYSIS, AnalysisView)
          }
          return true
        }
      },
    })

    this.addCommand({
      id: 'refresh-analysis-view',
      name: 'Refresh Related Notes View',
      callback: async () => {
        await this.refreshGraph()
        const currView = await this.getCurrentView()
        await currView.draw(currView.currSubtype)
      },
    })

    ANALYSIS_TYPES.forEach((sub) => {
      this.addCommand({
        id: `open-${sub.subtype}`,
        name: `Open ${sub.subtype}`,
        callback: async () => {
          const currView = await this.getCurrentView()
          await currView.draw(sub.subtype)
        },
      })
    })

    this.addSettingTab(new SampleSettingTab(this.app, this))

    this.registerView(
      VIEW_TYPE_GRAPH_ANALYSIS,
      (leaf: WorkspaceLeaf) => new AnalysisView(leaf, this, null)
    )

    // Register vault event handlers for real-time updates
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file && 'extension' in file && file.extension === 'md') {
          this.queueFileUpdate(file.path)
        }
      })
    )

    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file && 'extension' in file && file.extension === 'md') {
          this.queueFileUpdate(file.path)
        }
      })
    )

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (file && 'extension' in file && file.extension === 'md') {
          this.queueFileUpdate(file.path)
        }
      })
    )

    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        if (file && 'extension' in file && file.extension === 'md') {
          // Handle rename by updating both old and new paths
          this.queueFileUpdate(oldPath)
          this.queueFileUpdate(file.path)
        }
      })
    )

    this.registerEvent(
      this.app.metadataCache.on('resolved', (file) => {
        if (file && 'extension' in file && file.extension === 'md') {
          this.queueFileUpdate(file.path)
        }
      })
    )

    this.app.workspace.onLayoutReady(async () => {
      const noFiles = this.app.vault.getMarkdownFiles().length
      while (!this.resolvedLinksComplete(noFiles)) {
        await wait(1000)
      }

      await this.refreshGraph()
      await openView(this.app, VIEW_TYPE_GRAPH_ANALYSIS, AnalysisView)
    })
  }

  resolvedLinksComplete(noFiles: number) {
    const { resolvedLinks } = this.app.metadataCache
    return Object.keys(resolvedLinks).length === noFiles
  }

  getCurrentView = async (openIfNot = true) => {
    const view = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_GRAPH_ANALYSIS
    )?.[0]?.view as AnalysisView

    if (view) return view
    else if (openIfNot) {
      return await openView(this.app, VIEW_TYPE_GRAPH_ANALYSIS, AnalysisView)
    } else return null
  }

  async refreshGraph() {
    try {
      console.time('Initialise Graph')
      this.g = new MyGraph(this.app, this.settings)
      await this.g.initGraph()
      // Clear all caches after full graph refresh
      this.g.invalidateCache()
      debug(this.settings, { g: this.g })
      console.timeEnd('Initialise Graph')
      if (this.settings.showRefreshNotice) new Notice('Index Refreshed')
    } catch (error) {
      console.log(error)
      new Notice(
        'An error occured with Related Notes, please check the console.'
      )
    }
  }

  private queueFileUpdate(filePath: string) {
    // Add file to update queue
    this.updateQueue.add(filePath)
    
    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
    
    // Set new debounced timeout
    this.updateTimeout = setTimeout(() => {
      this.processQueuedUpdates()
    }, this.UPDATE_DEBOUNCE_MS)
  }

  private async processQueuedUpdates() {
    if (!this.g || this.updateQueue.size === 0) {
      return
    }

    const filesToUpdate = Array.from(this.updateQueue)
    this.updateQueue.clear()
    this.updateTimeout = null

    try {
      console.log(`Processing ${filesToUpdate.length} queued file updates`)
      
      for (const filePath of filesToUpdate) {
        try {
          await this.updateFileIncrementally(filePath)
          // Invalidate caches for updated files
          this.g.invalidateCache(filePath)
        } catch (error) {
          console.error(`Error updating file ${filePath}:`, error)
          // Continue processing other files
        }
      }
      
      // Increment refresh counter to trigger Svelte reactivity
      this.refreshCounter++
      
      // Note: No need to call draw() - let Svelte components react to refreshCounter change
      
      debug(this.settings, `Updated ${filesToUpdate.length} files incrementally`)
    } catch (error) {
      console.error('Error processing queued updates:', error)
      // Fallback to full refresh on error
      await this.refreshGraph()
    }
  }

  private async updateFileIncrementally(filePath: string) {
    if (!this.g) return

    const file = this.app.vault.getAbstractFileByPath(filePath)
    
    // Handle case where file no longer exists (deleted)
    if (!file) {
      // Remove from graph if it exists
      if (this.g.hasNode(filePath)) {
        this.g.dropNode(filePath)
      }
      return
    }

    const { exclusionRegex, exclusionTags, allFileExtensions } = this.settings
    const regex = new RegExp(exclusionRegex, 'i')

    // Check if file should be included based on settings
    const includeRegex = (path: string) => exclusionRegex === '' || !regex.test(path)
    const includeExt = (path: string) => allFileExtensions || path.endsWith('md')
    const includeTag = (tags: any[] | undefined) =>
      exclusionTags.length === 0 ||
      !tags ||
      tags.findIndex((t) => exclusionTags.includes(t.tag)) === -1

    if ('extension' in file && file.extension === 'md') {
      // File exists - update or add
      if (includeRegex(filePath) && includeExt(filePath)) {
        const cache = this.app.metadataCache.getCache(filePath)
        const tags = cache?.tags
        
        if (includeTag(tags)) {
          try {
            // Update BM25 index
            const content = await this.app.vault.cachedRead(file)
            const title = cache?.frontmatter?.title || file.basename || 'Untitled'
            this.g.bm25Service.indexDocument(filePath, title, content)
            
            // Update graph structure (basic - could be optimized further)
            await this.updateGraphStructure(filePath)
            
            debug(this.settings, `Updated file incrementally: ${filePath}`)
          } catch (error) {
            console.warn(`Failed to update file ${filePath}:`, error)
          }
        }
      }
    } else {
      // File doesn't exist or was deleted - remove from index
      this.g.bm25Service.removeDocument(filePath)
      if (this.g.hasNode(filePath)) {
        this.g.dropNode(filePath)
      }
      debug(this.settings, `Removed file from index: ${filePath}`)
    }
  }

  private async updateGraphStructure(filePath: string) {
    // This is a simplified approach - for full optimization, we would
    // need more sophisticated graph edge management
    const { resolvedLinks } = this.app.metadataCache
    
    // Remove existing edges for this node
    if (this.g.hasNode(filePath)) {
      const neighbors = this.g.neighbors(filePath)
      neighbors.forEach(neighbor => {
        if (this.g.hasEdge(filePath, neighbor)) {
          this.g.dropEdge(filePath, neighbor)
        }
        if (this.g.hasEdge(neighbor, filePath)) {
          this.g.dropEdge(neighbor, filePath)
        }
      })
    } else {
      // Add node if it doesn't exist
      const nodeCount = this.g.nodes().length
      this.g.addNode(filePath, { i: nodeCount })
    }
    
    // Add current edges
    if (resolvedLinks[filePath]) {
      for (const dest in resolvedLinks[filePath]) {
        if (this.g.hasNode(dest)) {
          this.g.addEdge(filePath, dest, { resolved: true })
        }
      }
    }
    
    // Also update incoming edges
    for (const source in resolvedLinks) {
      if (resolvedLinks[source][filePath] && this.g.hasNode(source)) {
        this.g.addEdge(source, filePath, { resolved: true })
      }
    }
  }

  onunload() {
    console.log('unloading graph analysis plugin')
    
    // Clean up timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
    
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)
      .forEach((leaf) => {
        leaf.view.unload()
        leaf.detach()
      })
  }

  async loadSettings() {
    const savedData = await this.loadData()
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData)
    
    // Migrate settings: validate defaultSubtypeType exists in current ANALYSIS_TYPES
    const validSubtypes = ANALYSIS_TYPES.map(t => t.subtype)
    if (!validSubtypes.includes(this.settings.defaultSubtypeType)) {
      console.log(`Related Notes: Migrating invalid defaultSubtypeType '${this.settings.defaultSubtypeType}' to '${DEFAULT_SETTINGS.defaultSubtypeType}'`)
      this.settings.defaultSubtypeType = DEFAULT_SETTINGS.defaultSubtypeType
    }
    
    // Migrate settings: filter algsToShow to only include valid algorithms
    const originalAlgsToShow = this.settings.algsToShow.slice()
    this.settings.algsToShow = this.settings.algsToShow.filter(alg => validSubtypes.includes(alg))
    if (this.settings.algsToShow.length !== originalAlgsToShow.length) {
      console.log(`Related Notes: Migrated algsToShow from [${originalAlgsToShow.join(', ')}] to [${this.settings.algsToShow.join(', ')}]`)
    }
    
    // Ensure at least one algorithm is shown
    if (this.settings.algsToShow.length === 0) {
      this.settings.algsToShow = [...DEFAULT_SETTINGS.algsToShow]
      console.log(`Related Notes: Restored default algsToShow since none were valid`)
    }
    
    // Save migrated settings
    if (savedData && (
      !validSubtypes.includes(savedData.defaultSubtypeType) || 
      originalAlgsToShow.length !== this.settings.algsToShow.length
    )) {
      await this.saveSettings()
    }
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
