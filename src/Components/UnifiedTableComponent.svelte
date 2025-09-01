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
    img: Promise<ArrayBuffer>
  }

  let size = 15
  let page = 1
  let visibleData: ComponentResults[] = []
  let newBatch: ComponentResults[] = []
  let blockSwitch = false
  let current_component: HTMLTableElement

  $: currNode = currFile?.path || ''

  const hasNewSize = () => visibleData.length >= size * page

  let { resolvedLinks } = app.metadataCache

  app.workspace.on('active-leaf-change', () => {
    if (!currSubtypeInfo?.global) {
      blockSwitch = true
      newBatch = []
      visibleData = []
      promiseSortedResults = null
      page = 1

      setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
    }
  })

  $: promiseSortedResults = 
    !plugin.g || !currNode
      ? null
      : plugin.g.algs[currSubtype](currNode)
          .then((results: ResultMap) => {
            const componentResults: ComponentResults[] = []
            
            Object.entries(results).forEach(([to, { measure, extra }]) => {
              if (
                !(noInfinity && measure === Infinity) &&
                !(noZero && measure === 0)
              ) {
                const resolved = !to.endsWith('.md') || isInVault(app, to)
                const linked = isLinked(resolvedLinks, currNode, to, false)
                const img = settings.showImgThumbnails && isImg(to)
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
            
            componentResults.sort((a, b) => {
              return a.measure === b.measure
                ? a.extra?.length > b.extra?.length
                  ? -1
                  : 1
                : a.measure > b.measure
                ? -1
                : 1
            })
            return componentResults
          })
          .then((res) => {
            newBatch = res.slice(0, size)
            setTimeout(() => {
              blockSwitch = false
            }, 100)
            return res
          })

  $: visibleData = [...visibleData, ...newBatch]

  onMount(() => {
    currNode = currFile?.path
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
      <th scope="col" style="width: 40%;">Note</th>
      <th scope="col" style="text-align: center; width: 15%;" title="Link Suggestions">Links</th>
      <th scope="col" style="text-align: center; width: 15%;" title="Relevant Notes">Rank</th>
      <th scope="col" style="text-align: center; width: 15%;" title="Similar Content">Similar</th>
      <th scope="col" style="width: 15%; text-align: center;">Score</th>
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
              
              <!-- Algorithm breakdown columns -->
              <td style="text-align: center; font-size: 14px;">{node.extra[0] || '—'}</td>
              <td style="text-align: center; font-size: 14px;">{node.extra[1] || '—'}</td>
              <td style="text-align: center; font-size: 14px;">{node.extra[2] || '—'}</td>
              
              <!-- Combined score -->
              <td class={MEASURE}>{node.measure}</td>
            </tr>
          {/if}
        {/each}
        <InfiniteScroll
          hasMore={hasNewSize()}
          elementScroll={current_component}
          on:loadMore={() => (page += 1)}
        />
      {/key}
    {:catch}
      <p>error</p>
    {/await}
  {:else}
    <p>No Results</p>
  {/if}
</table>

<style>
  .GA-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  
  .GA-table th {
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
  }
  
  .GA-table td {
    border-bottom: 1px solid var(--background-modifier-border-focus);
    padding: 8px;
    vertical-align: middle;
  }
  
  .GA-table td:nth-child(2),
  .GA-table td:nth-child(3),
  .GA-table td:nth-child(4) {
    text-align: center;
    font-size: 16px;
    padding: 8px 4px;
  }
  
  .GA-table th:nth-child(2),
  .GA-table th:nth-child(3),
  .GA-table th:nth-child(4),
  .GA-table th:nth-child(5) {
    text-align: center;
  }
  
  .GA-table tr:hover {
    background-color: var(--background-modifier-hover);
  }
  
  .GA-table td:last-child {
    text-align: center;
  }
</style>