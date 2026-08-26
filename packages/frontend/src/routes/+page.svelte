<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { hasToken } from '$lib/api';

  onMount(() => {
    if (hasToken()) {
      goto('/dashboard');
    } else {
      goto('/login');
    }
  });
</script>

<div class="loading-screen">
  <p>Cargando...</p>
</div>

<style>
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--color-text-muted, #64748b);
  }
</style>
