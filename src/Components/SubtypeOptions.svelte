<script lang="ts">
  import type { App, TFile } from 'obsidian'
  import type AnalysisView from '../AnalysisView'
  import type { SubtypeInfo } from '../Interfaces'
  import type GraphAnalysisPlugin from '../main'
  import IoMdRefresh from 'svelte-icons/io/IoMdRefresh.svelte'
  import InfoIcon from './InfoIcon.svelte'

  export let currSubtypeInfo: SubtypeInfo | undefined
  export let plugin: GraphAnalysisPlugin
  export let app: App
  export let view: AnalysisView
</script>

<span class="GA-Subtype-Options">
  <InfoIcon {currSubtypeInfo} />

  <span
    class="GA-Option-span"
    aria-label="Refresh Index"
    on:click={async () => {
      await plugin.refreshGraph()
      await view.draw(currSubtypeInfo?.subtype || 'Link Suggestions')
    }}
  >
    <span class="icon">
      <IoMdRefresh />
    </span>
  </span>
</span>

<style>
  .GA-Subtype-Options {
    margin-left: 10px;
  }
  .icon {
    color: var(--text-normal);
    display: inline-block;
    padding-top: 5px !important;
    width: 20px;
    height: 20px;
  }

  .GA-Option-span {
    padding: 2px;
  }
</style>
