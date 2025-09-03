import {
  App, CacheItem,
  EditorRange, LinkCache,
  MarkdownView,
  Menu,
  Notice, ReferenceCache,
  TFile,
  WorkspaceLeaf,
} from 'obsidian'
import {
  copy,
  createNewMDNote,
  isInVault,
  isLinked,
  ResolvedLinks,
} from 'obsidian-community-lib'
import type AnalysisView from './AnalysisView'
import { DECIMALS, IMG_EXTENSIONS, LINKED, NOT_LINKED } from './Constants'
import type {
  ComponentResults,
  GraphAnalysisSettings, LineSentences,
  ResultMap,
  Subtype,
} from './Interfaces'
import type GraphAnalysisPlugin from './main'
import { CoCitation } from './Interfaces'

export const sum = (arr: number[]) => {
  if (arr.length === 0) {
    return 0
  }
  return arr.reduce((a, b) => a + b)
}

export function debug<T>(settings: GraphAnalysisSettings, log: T): void {
  if (settings.debugMode) {
    console.log(log)
  }
}


export function roundNumber(num: number, dec: number = DECIMALS): number {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)
}









/**
 * Adds or updates the given yaml `key` to `value` in the given TFile
 * @param  {string} key
 * @param  {string} value
 * @param  {TFile} file
 * @param  {App} app
 */





export function getCounts(arr: any[]) {
  const counts: { [item: string]: number } = {}
  for (const num of arr) {
    counts[num] = counts[num] ? counts[num] + 1 : 1
  }
  return counts
}

export function getMaxKey(obj: Record<string, number>) {
  // Using random resolving of equality
  return Object.keys(obj).reduce((a, b) =>
    obj[a] === obj[b] ? (Math.random() < 0.5 ? a : b) : obj[a] > obj[b] ? a : b
  )
}



export function findSentence(sentences: [string], link: CacheItem): [number, number, number] {
  let aggrSentenceLength = 0
  let count = 0
  for (const sentence of sentences) {
    const nextLength = aggrSentenceLength + sentence.length
    // Edge case that does not work: If alias has end of sentences.
    if (link.position.end.col <= nextLength) {
      return [count, aggrSentenceLength, nextLength]
    }
    aggrSentenceLength = nextLength
    count += 1
  }
  return [-1, 0, aggrSentenceLength]
}

export const dropPath = (path: string) => {
  return path.split('/').last()
}

export const dropExt = (path: string) =>
  path.split('.').length === 1 ? path : path.split('.').slice(0, -1).join('.')
export const getExt = (path: string) => path.split('.').last()

export const classExt = (path: string) => `GA-${getExt(path)}`

export const presentPath = (path: string) => dropExt(dropPath(path))

export const isImg = (path: string) =>
  IMG_EXTENSIONS.includes(path.split('.').last())

export function getImgBufferPromise(app: App, fileName: string) {
  const file = app.metadataCache.getFirstLinkpathDest(fileName, '')
  return file ? app.vault.readBinary(file) : null
}

export function openMenu(
  event: MouseEvent,
  app: App,
  copyObj: { toCopy: string } = undefined
) {
  const tdEl = event.target
  const menu = new Menu(app)

  if (copyObj) {
    menu.addItem((item) =>
      item
        .setTitle('Copy community')
        .setIcon('graph')
        .onClick(async () => {
          await copy(copyObj.toCopy)
        })
    )
  } else {
    menu.addItem((item) =>
      item
        .setTitle('Create Link: Current')
        .setIcon('documents')
        .onClick((e) => {
          try {
            const currFile = app.workspace.getActiveFile()
            // @ts-expect-error - event.target is EventTarget, lacks innerText in typings
            const targetStr = tdEl.innerText
            // Note: createOrUpdateYaml was removed - this functionality is disabled
            new Notice('YAML functionality disabled')
          } catch (error) {
            new Notice('Write failed')
          }
        })
    )

    menu.addItem((item) =>
      item
        .setTitle('Create Link: Target')
        .setIcon('documents')
        .onClick((e) => {
          const currStr = app.workspace.getActiveFile().basename

          const { target } = event
          // @ts-expect-error - EventTarget does not have innerText in typings
          const targetStr = target.innerText
          const targetFile = app.metadataCache.getFirstLinkpathDest(
            targetStr,
            ''
          )
          if (!targetFile) {
            new Notice(`${targetStr} does not exist in your vault yet`)
            return
          } else {
            // Note: createOrUpdateYaml was removed - this functionality is disabled
            new Notice('YAML functionality disabled')
          }
        })
    )
  }
  menu.showAtMouseEvent(event)
}

export async function openOrSwitch(
  app: App,
  dest: string,
  event: MouseEvent,
  options: {
    createNewFile: boolean
  } = { createNewFile: true }
): Promise<void> {
  const { workspace } = app
  let destFile = app.metadataCache.getFirstLinkpathDest(dest, '')

  // If dest doesn't exist, make it
  if (!destFile && options.createNewFile) {
    destFile = await createNewMDNote(app, dest)
  } else if (!destFile && !options.createNewFile) return

  // Check if it's already open
  const leavesWithDestAlreadyOpen: WorkspaceLeaf[] = []
  workspace.iterateAllLeaves((leaf) => {
    if (leaf.view instanceof MarkdownView) {
      if (leaf.view?.file?.basename === dropExt(dest)) {
        leavesWithDestAlreadyOpen.push(leaf)
      }
    }
  })

  // Rather switch to it if it is open
  if (leavesWithDestAlreadyOpen.length > 0) {
    workspace.setActiveLeaf(leavesWithDestAlreadyOpen[0])
  } else {
    // @ts-expect-error - vault.getConfig is not in type defs
    const mode = app.vault.getConfig('defaultViewMode') as string
    const leaf =
      event.ctrlKey || event.getModifierState('Meta')
        ? workspace.splitActiveLeaf()
        : workspace.getUnpinnedLeaf()

    await leaf.openFile(destFile, { active: true, mode })
  }
}

export function jumpToSelection(app: App, line: number, sentence: string) {
  const view = app.workspace.getActiveViewOfType(MarkdownView)
  // Make sure the user is editing a Markdown file.
  if (view && view.getMode() === 'source') {
    const { editor } = view

    // Creat sel
    const lineStartPos = { ch: 0, line }
    const markStart = editor.posToOffset(lineStartPos)

    const markEnd = markStart + sentence.length

    const markSel: EditorRange = {
      from: editor.offsetToPos(markStart),
      to: editor.offsetToPos(markEnd),
    }

    editor.setSelection(markSel.from, markSel.to)
    editor.scrollIntoView(markSel)

    const doc = editor.cm.getDoc()
    const marker = doc.markText(markSel.from, markSel.to, {
      className: 'GA-highlight-sentence',
    })

    setTimeout(() => {
      marker.clear()
    }, 1000)
  } else if (view && view.getMode() === 'preview') {
    // Handle preview mode
  }
}

export function addPreCocitation(preCocitations: { [name: string]: [number, CoCitation[]] },
                                 linkPath: string,
                                 measure: number,
                                 sentence: string[],
                                 source: string,
                                 line: number) {
  preCocitations[linkPath][0] = Math.max(
    preCocitations[linkPath][0],
    measure
  )
  preCocitations[linkPath][1].push({
    sentence,
    measure,
    source,
    line,
  })
}
