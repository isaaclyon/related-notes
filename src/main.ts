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

  async onload() {
    console.log('loading graph analysis plugin')

    await this.loadSettings()
    addIcon('GA-ICON', iconSVG)

    this.addCommand({
      id: 'show-graph-analysis-view',
      name: 'Open Graph Analysis View',
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
      name: 'Refresh Graph Analysis View',
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
      // await this.g.initData()
      debug(this.settings, { g: this.g })
      console.timeEnd('Initialise Graph')
      new Notice('Index Refreshed')
    } catch (error) {
      console.log(error)
      new Notice(
        'An error occured with Graph Analysis, please check the console.'
      )
    }
  }

  onunload() {
    console.log('unloading graph analysis plugin')
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
      console.log(`Graph Analysis: Migrating invalid defaultSubtypeType '${this.settings.defaultSubtypeType}' to '${DEFAULT_SETTINGS.defaultSubtypeType}'`)
      this.settings.defaultSubtypeType = DEFAULT_SETTINGS.defaultSubtypeType
    }
    
    // Migrate settings: filter algsToShow to only include valid algorithms
    const originalAlgsToShow = this.settings.algsToShow.slice()
    this.settings.algsToShow = this.settings.algsToShow.filter(alg => validSubtypes.includes(alg))
    if (this.settings.algsToShow.length !== originalAlgsToShow.length) {
      console.log(`Graph Analysis: Migrated algsToShow from [${originalAlgsToShow.join(', ')}] to [${this.settings.algsToShow.join(', ')}]`)
    }
    
    // Ensure at least one algorithm is shown
    if (this.settings.algsToShow.length === 0) {
      this.settings.algsToShow = [...DEFAULT_SETTINGS.algsToShow]
      console.log(`Graph Analysis: Restored default algsToShow since none were valid`)
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
