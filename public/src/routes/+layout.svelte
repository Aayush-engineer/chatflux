<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let darkMode = false;

  onMount(() => {
    if (!browser) return;
    
    darkMode = localStorage.getItem('darkMode') === 'true' || 
               window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    updateDarkMode();
  });

  function updateDarkMode() {
    if (!browser) return;
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    updateDarkMode();
  }
</script>

<svelte:head>
  <title>ChatFlux - Real-time Chat</title>
  <meta name="description" content="Distributed real-time chat application" />
</svelte:head>

<div class="min-h-screen">
  <slot />

  <!-- Dark Mode Toggle -->
  <button
    on:click={toggleDarkMode}
    class="fixed top-4 right-4 p-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all z-50 hover:scale-110"
    aria-label="Toggle dark mode"
  >
    {#if darkMode}
      <!-- Sun Icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
      </svg>
    {:else}
      <!-- Moon Icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    {/if}
  </button>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
