<script lang="ts">
  import Workspace from './Workspace.svelte';
  import Goals from '../../../../routes/(app)/metas/+page.svelte';
  import Categories from '../../../../routes/(app)/categorias/+page.svelte';
  let { path='/metas' }: {path?:string}=$props();
</script>
<Workspace {path}>{#if path==='/metas'}<Goals/>{:else}<Categories/>{/if}</Workspace>
