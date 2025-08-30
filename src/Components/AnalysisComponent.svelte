<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from '../AnalysisView'
  import type { GraphAnalysisSettings, Subtype } from '../Interfaces'
  import type GraphAnalysisPlugin from '../main'
  import ScrollSelector from './ScrollSelector.svelte'
  import TableComponent from './TableComponent.svelte'

  export let app: App
  export let plugin: GraphAnalysisPlugin
  export let settings: GraphAnalysisSettings
  export let view: AnalysisView
  export let currSubtype: Subtype

  $: props = {
    app,
    plugin,
    settings,
    view,
    currSubtype,
  }
</script>

<ScrollSelector bind:currSubtype {view} />

{#if currSubtype === 'Resource Allocation'}
  <TableComponent {...props} />
{:else if currSubtype === 'Personalized PageRank'}
  <TableComponent {...props} />
{:else if currSubtype === 'Otsuka-Chiai'}
  <TableComponent {...props} />
{:else}
  <!-- Fallback for any undefined algorithms -->
  <TableComponent {...props} />
{/if}
