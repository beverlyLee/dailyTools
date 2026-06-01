<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let filterType = 'all';
  let minScore = 0;

  const typeOptions = [
    { value: 'all', label: '全部' },
    { value: 'cafe', label: '咖啡馆 ☕' },
    { value: 'bookstore', label: '书店 📚' }
  ];

  const scoreOptions = [
    { value: 0, label: '全部评分' },
    { value: 7, label: '7分以上' },
    { value: 8, label: '8分以上' },
    { value: 9, label: '9分以上' }
  ];

  function handleChange() {
    dispatch('filterChange', { filterType, minScore });
  }
</script>

<div class="bg-white bg-opacity-95 backdrop-blur rounded-2xl shadow-xl p-6">
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-gray-600 font-medium">🔍 筛选:</span>
    </div>
    
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <label class="text-gray-600 text-sm">类型:</label>
        <select 
          bind:value={filterType}
          on:change={handleChange}
          class="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          {#each typeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-gray-600 text-sm">最低评分:</label>
        <select 
          bind:value={minScore}
          on:change={handleChange}
          class="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          {#each scoreOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <button 
        class="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
        on:click={handleChange}
      >
        应用筛选
      </button>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <span class="text-xs text-gray-500">快捷筛选:</span>
    <button 
      on:click={() => { filterType = 'all'; minScore = 8; handleChange(); }}
      class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
    >
      ✨ 8分以上
    </button>
    <button 
      on:click={() => { filterType = 'all'; minScore = 0; handleChange(); }}
      class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
    >
      🔄 重置
    </button>
    <button 
      on:click={() => { filterType = 'cafe'; minScore = 0; handleChange(); }}
      class="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors"
    >
      ☕ 咖啡馆
    </button>
    <button 
      on:click={() => { filterType = 'bookstore'; minScore = 0; handleChange(); }}
      class="px-3 py-1 text-xs bg-rose-100 text-rose-700 rounded-full hover:bg-rose-200 transition-colors"
    >
      📚 书店
    </button>
  </div>
</div>
