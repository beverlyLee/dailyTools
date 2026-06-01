<script>
  import { createEventDispatcher } from 'svelte';

  export let place;
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('select', place);
  }

  function getScoreColor(score) {
    if (score >= 9) return 'text-green-600 bg-green-100';
    if (score >= 8) return 'text-blue-600 bg-blue-100';
    if (score >= 7) return 'text-yellow-600 bg-yellow-100';
    if (score >= 6) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  }

  function getTypeLabel(type) {
    if (type === 'cafe') return '☕ 咖啡馆';
    if (type === 'bookstore') return '📚 书店';
    return type;
  }
</script>

<div 
  class="card-hover bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer"
  on:click={handleClick}
>
  <div class="relative h-48 overflow-hidden">
    <img 
      src={place.image_url} 
      alt={place.name}
      class="w-full h-full object-cover"
    />
    <div class="absolute top-3 left-3">
      <span class="px-3 py-1 bg-black bg-opacity-60 text-white text-xs rounded-full">
        {getTypeLabel(place.type)}
      </span>
    </div>
    <div class="absolute top-3 right-3">
      <span class="rating-badge px-3 py-1 text-white text-sm font-bold rounded-full">
        {place.overall_score.toFixed(1)}
      </span>
    </div>
  </div>

  <div class="p-5">
    <h3 class="text-lg font-bold text-gray-800 mb-1 truncate">{place.name}</h3>
    <p class="text-sm text-gray-500 mb-3 truncate">📍 {place.address}</p>

    <div class="grid grid-cols-3 gap-2 mb-4">
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-500">WiFi</div>
        <div class="font-bold text-blue-600">{(place.wifi_score * 10).toFixed(0)}</div>
      </div>
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-500">插座</div>
        <div class="font-bold text-green-600">{place.socket_count}</div>
      </div>
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-500">安静</div>
        <div class="font-bold text-purple-600">{(place.noise_level * 10).toFixed(0)}</div>
      </div>
    </div>

    <div class="flex gap-2 mb-4">
      <div class="flex-1 text-center p-2 rounded-lg {getScoreColor(place.office_score)}">
        <div class="text-xs">💼 办公</div>
        <div class="font-bold">{place.office_rating}</div>
      </div>
      <div class="flex-1 text-center p-2 rounded-lg {getScoreColor(place.escape_score)}">
        <div class="text-xs">🎮 摸鱼</div>
        <div class="font-bold">{place.escape_rating}</div>
      </div>
    </div>

    <p class="text-sm text-gray-600 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg">
      {place.recommendation}
    </p>
  </div>
</div>
