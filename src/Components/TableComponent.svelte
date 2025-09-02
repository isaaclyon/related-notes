<script lang="ts">
  import type { App } from 'obsidian'
  import { hoverPreview, isInVault, isLinked } from 'obsidian-community-lib'
  import type AnalysisView from '../AnalysisView'
  import {
    ANALYSIS_TYPES,
    ICON,
    LINKED,
    MEASURE,
    NOT_LINKED,
  } from '../Constants'
  import type {
    GraphAnalysisSettings,
    ResultMap,
    Subtype,
  } from '../Interfaces'
  import type GraphAnalysisPlugin from '../main'
  import {
    classExt,
    dropPath,
    getImgBufferPromise,
    isImg,
    openMenu,
    openOrSwitch,
    presentPath,
  } from '../Utility'
  import { onMount } from 'svelte'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import InfiniteScroll from 'svelte-infinite-scroll'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'
  import SubtypeOptions from './SubtypeOptions.svelte'

  export let app: App
  export let plugin: GraphAnalysisPlugin
  export let settings: GraphAnalysisSettings
  export let view: AnalysisView
  export let currSubtype: Subtype

  $: currSubtypeInfo = ANALYSIS_TYPES.find((sub) => sub.subtype === currSubtype) || ANALYSIS_TYPES[0]
  let { noInfinity, noZero } = settings
  let currFile = app.workspace.getActiveFile()

  interface ComponentResults {
    measure: number
    linked: boolean
    to: string
    resolved: boolean
    extra: string[]
    img: Promise<ArrayBuffer> | null
  }

  $: currNode = currFile?.path
  let size = 50
  let current_component: HTMLElement
  let newBatch: ComponentResults[] = []
  let visibleData: ComponentResults[] = []
  let page = 0
  let blockSwitch = false

  let { resolvedLinks } = app.metadataCache

  app.workspace.on('active-leaf-change', () => {
    if (!currSubtypeInfo?.global) {
      blockSwitch = true
      setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
    }
  })

  onMount(() => {
    currNode = currFile?.path
  })

  // Check if current file should be excluded from analysis
  function shouldExcludeFile(filePath: string): boolean {
    if (!filePath) return true
    
    const { exclusionRegex, exclusionTags, allFileExtensions } = settings
    const regex = new RegExp(exclusionRegex, 'i')
    
    const includeRegex = exclusionRegex === '' || !regex.test(filePath)
    const includeExt = allFileExtensions || filePath.endsWith('md')
    
    return !includeRegex || !includeExt
  }

  $: promiseSortedResults =
    !plugin.g || !currNode || !plugin.g.algs || !plugin.g.algs[currSubtype] || shouldExcludeFile(currNode)
      ? null
      : (plugin.refreshCounter, plugin.g.algs[currSubtype](currNode))
          .then((results: ResultMap) => {
            const componentResults: ComponentResults[] = []

            if (!results) {
              console.warn(`Algorithm ${currSubtype} returned null results for ${currNode}`)
              return componentResults
            }

            plugin.g.forEachNode((to) => {
              const result = (results as ResultMap)[to]
              if (!result) return
              
              const { measure, extra } = result
              if (
                !(noInfinity && measure === Infinity) &&
                !(noZero && measure === 0)
              ) {
                const resolved = !to.endsWith('.md') || isInVault(app, to)
                const linked = isLinked(resolvedLinks, currNode, to, false)
                const img =
                  plugin.settings.showImgThumbnails && isImg(to)
                    ? getImgBufferPromise(app, to)
                    : null
                componentResults.push({
                  measure,
                  linked,
                  to,
                  resolved,
                  extra,
                  img,
                })
              }
            })

            // Filter out already linked notes if setting is enabled
            const filteredResults = settings.excludeAlreadyLinked 
              ? componentResults.filter(result => !result.linked)
              : componentResults

            filteredResults.sort((a, b) => {
              return a.measure === b.measure
                ? a.extra?.length > b.extra?.length
                  ? -1
                  : 1
                : a.measure > b.measure
                ? -1
                : 1
            })
            return filteredResults
          })
          .then((res) => {
            page = 0
            visibleData = []
            newBatch = res.slice(0, size)
            setTimeout(() => {
              blockSwitch = false
            }, 100)
            return res
          })
          .catch((error) => {
            console.error(`Error in ${currSubtype} algorithm for ${currNode}:`, error)
            return []
          })

  $: visibleData = [...visibleData, ...newBatch]

  onMount(() => {
    currFile = app.workspace.getActiveFile()
  })
</script>

<SubtypeOptions
  bind:currSubtypeInfo
  {app}
  {plugin}
  {view}
/>

<table class="GA-table markdown-preview-view" bind:this={current_component}>
  <thead>
    <tr>
      <th scope="col">Note</th>
      <th scope="col">Value</th>
    </tr>
  </thead>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as node}
          {#if (currSubtypeInfo?.global || node.to !== currNode) && node !== undefined}
            <!-- svelte-ignore a11y-unknown-aria-attribute -->
            <tr
              class="{node.linked ? LINKED : NOT_LINKED} 
            {classExt(node.to)}"
            >
              <td
                aria-label={node.extra.map(presentPath).join('\n')}
                aria-label-position="left"
                on:click={async (e) => await openOrSwitch(app, node.to, e)}
                on:contextmenu={(e) => openMenu(e, app)}
                on:mouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
              >
                {#if node.linked}
                  <span class={ICON}>
                    <FaLink />
                  </span>
                {/if}

                <ExtensionIcon path={node.to} />

                <span
                  class="internal-link {node.resolved ? '' : 'is-unresolved'}"
                >
                  {presentPath(node.to)}
                </span>
                {#if isImg(node.to)}
                  <ImgThumbnail img={node.img} />
                {/if}
              </td>
              <td class={MEASURE}>{node.measure}</td>
            </tr>
          {/if}
        {/each}

        <InfiniteScroll
          hasMore={sortedResults.length > visibleData.length}
          threshold={100}
          elementScroll={current_component.parentNode}
          on:loadMore={() => {
            if (!blockSwitch) {
              page++
              newBatch = sortedResults.slice(size * page, size * (page + 1) - 1)
              console.log({ newBatch })
            }
          }}
        />
        {visibleData.length} / {sortedResults.length}
      {/key}
    {/await}
  {/if}
</table>

<style>
  table.GA-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
  }
  table.GA-table,
  table.GA-table tr,
  table.GA-table td {
    border: 1px solid var(--background-modifier-border);
  }

  table.GA-table th:first-child,
  table.GA-table td:first-child {
    width: 70%;
  }

  table.GA-table th:last-child,
  table.GA-table td:last-child {
    width: 30%;
    text-align: center;
  }

  table.GA-table td {
    padding: 2px;
    /* font-size: var(--font-size-secondary); */
  }

  .is-unresolved {
    color: var(--text-muted);
  }

  .GA-node {
    overflow: hidden;
  }
</style>
