<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import PlaceCard from './components/PlaceCard.svelte';
  import PlaceDetail from './components/PlaceDetail.svelte';
  import FilterBar from './components/FilterBar.svelte';
  import ErrorBoundary from './components/ErrorBoundary.svelte';
  import MapView from './components/MapView.svelte';
  import { api } from './api.js';

  let places = [];
  let filteredPlaces = [];
  let selectedPlace = null;
  let filterType = 'all';
  let minScore = 0;
  let loading = true;
  let error = null;
  let apiHealthy = true;

  async function loadPlaces() {
    try {
      loading = true;
      error = null;
      const response = await api.getPlaces(filterType !== 'all' ? filterType : null, minScore || null);
      places = response.data;
      applyFilters();
    } catch (err) {
      console.error('Failed to load places:', err);
      error = '无法加载数据，请检查后端服务是否正常运行';
      apiHealthy = false;
      places = getMockPlaces();
      filteredPlaces = places;
    } finally {
      loading = false;
    }
  }

  function getMockPlaces() {
    return [
      {
        id: "1",
        name: "星巴克 (国贸店)",
        type: "cafe",
        address: "北京市朝阳区建国门外大街1号国贸商城",
        latitude: 39.9087,
        longitude: 116.4605,
        rating: 4.5,
        price_level: 3,
        avg_price: 45,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%238B4513' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='100'%3E%E2%98%95%3C/text%3E%3Ctext x='400' y='450' text-anchor='middle' fill='white' font-size='36'%3EStarbucks%3C/text%3E%3C/svg%3E",
        opening_hours: "07:00 - 22:00",
        wifi_score: 0.85,
        socket_count: 5,
        noise_level: 0.7,
        office_score: 7.8,
        escape_score: 7.5,
        overall_score: 7.65,
        office_rating: "B级",
        escape_rating: "B级",
        recommendation: "💼 办公摸鱼双栖圣地 | 📶 WiFi速度快",
        socket_tips: ["二楼靠窗位置有插座", "吧台旁边有充电口"],
        socket_locations: [
          { description: "二楼靠窗位置", x: 0.15, y: 0.3 },
          { description: "吧台旁", x: 0.7, y: 0.6 }
        ]
      },
      {
        id: "2",
        name: "西西弗书店 (万象城店)",
        type: "bookstore",
        address: "北京市海淀区中关村大街19号新中关购物中心",
        latitude: 39.9847,
        longitude: 116.3160,
        rating: 4.8,
        price_level: 2,
        avg_price: 35,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%234A3728' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23FFE4B5' font-size='120'%3E%F0%9F%93%9A%3C/text%3E%3Ctext x='400' y='450' text-anchor='middle' fill='white' font-size='36'%3E西西弗书店%3C/text%3E%3C/svg%3E",
        opening_hours: "10:00 - 22:00",
        wifi_score: 0.75,
        socket_count: 8,
        noise_level: 0.9,
        office_score: 8.8,
        escape_score: 9.2,
        overall_score: 9.0,
        office_rating: "A级",
        escape_rating: "S级",
        recommendation: "🎮 摸鱼发呆绝佳去处 | 🤫 非常安静",
        socket_tips: ["进门左手边靠窗有充电口", "咖啡区每个座位都有插座"],
        socket_locations: [
          { description: "咖啡区靠窗", x: 0.1, y: 0.25 },
          { description: "书架旁桌子", x: 0.45, y: 0.5 },
          { description: "角落沙发区", x: 0.8, y: 0.75 }
        ]
      },
      {
        id: "3",
        name: "Manner Coffee (三里屯店)",
        type: "cafe",
        address: "北京市朝阳区三里屯路19号三里屯太古里",
        latitude: 39.9342,
        longitude: 116.4487,
        rating: 4.3,
        price_level: 2,
        avg_price: 25,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%232C3E50' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='80'%3E%E2%98%95%3C/text%3E%3Ctext x='400' y='420' text-anchor='middle' fill='white' font-size='28'%3EManner Coffee%3C/text%3E%3C/svg%3E",
        opening_hours: "08:00 - 21:00",
        wifi_score: 0.65,
        socket_count: 3,
        noise_level: 0.6,
        office_score: 6.2,
        escape_score: 6.5,
        overall_score: 6.35,
        office_rating: "C级",
        escape_rating: "C级",
        recommendation: "☕ 性价比高但人较多",
        socket_tips: ["窗边吧台有几个插座"],
        socket_locations: [
          { description: "窗边吧台", x: 0.2, y: 0.15 }
        ]
      },
      {
        id: "4",
        name: "Page One (北京坊店)",
        type: "bookstore",
        address: "北京市西城区廊坊头条13号院北京坊",
        latitude: 39.9012,
        longitude: 116.3918,
        rating: 4.9,
        price_level: 3,
        avg_price: 55,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%231A1A2E' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='100'%3E%F0%9F%93%96%3C/text%3E%3Ctext x='400' y='430' text-anchor='middle' fill='white' font-size='32'%3EPage One%3C/text%3E%3C/svg%3E",
        opening_hours: "10:00 - 22:00",
        wifi_score: 0.9,
        socket_count: 12,
        noise_level: 0.95,
        office_score: 9.5,
        escape_score: 9.8,
        overall_score: 9.65,
        office_rating: "S级",
        escape_rating: "S级",
        recommendation: "🏆 打工人摸鱼圣地 | 插座超多超安静",
        socket_tips: ["三楼靠窗位置全部有插座", "二楼楼梯旁有充电口", "咖啡区每个座位都有USB"],
        socket_locations: [
          { description: "三楼靠窗区", x: 0.12, y: 0.2 },
          { description: "二楼楼梯旁", x: 0.5, y: 0.55 },
          { description: "咖啡区桌子", x: 0.75, y: 0.35 }
        ]
      },
      {
        id: "5",
        name: "瑞幸咖啡 (中关村店)",
        type: "cafe",
        address: "北京市海淀区中关村大街27号中关村大厦",
        latitude: 39.9831,
        longitude: 116.3147,
        rating: 3.8,
        price_level: 1,
        avg_price: 15,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23005BAC' width='800' height='600'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='80'%3E%E9%B9%BF%3C/text%3E%3Ctext x='400' y='430' text-anchor='middle' fill='white' font-size='32'%3E%E7%91%9E%E5%B9%B8%E5%92%96%E5%95%A1%3C/text%3E%3C/svg%3E",
        opening_hours: "07:00 - 21:00",
        wifi_score: 0.5,
        socket_count: 0,
        noise_level: 0.4,
        office_score: 3.5,
        escape_score: 4.0,
        overall_score: 3.75,
        office_rating: "D级",
        escape_rating: "D级",
        recommendation: "💰 价格便宜 | 不适合久坐办公",
        socket_tips: ["几乎没有充电插座"],
        socket_locations: []
      },
      {
        id: "6",
        name: "Costa Coffee (望京SOHO店)",
        type: "cafe",
        address: "北京市朝阳区望京街10号望京SOHO",
        latitude: 39.9938,
        longitude: 116.4800,
        rating: 4.2,
        price_level: 3,
        avg_price: 40,
        image_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23922B21' width='800' height='600'/%3E%3Ctext x='400' y='300' text-anchor='middle' fill='white' font-size='56'%3ECOSTA%3C/text%3E%3Ctext x='400' y='380' text-anchor='middle' fill='white' font-size='28'%3ECOFFEE%3C/text%3E%3C/svg%3E",
        opening_hours: "07:30 - 21:30",
        wifi_score: 0.8,
        socket_count: 4,
        noise_level: 0.65,
        office_score: 7.2,
        escape_score: 6.8,
        overall_score: 7.0,
        office_rating: "B级",
        escape_rating: "B级",
        recommendation: "📶 WiFi稳定 | 适合临时办公",
        socket_tips: ["吧台位置有插座", "墙角座位有充电口"],
        socket_locations: [
          { description: "吧台位置", x: 0.3, y: 0.6 },
          { description: "墙角座位", x: 0.8, y: 0.25 }
        ]
      }
    ];
  }

  function applyFilters() {
    filteredPlaces = places.filter(place => {
      if (filterType !== 'all' && place.type !== filterType) return false;
      if (place.overall_score < minScore) return false;
      return true;
    });
  }

  function handleFilterChange(e) {
    filterType = e.detail.filterType;
    minScore = e.detail.minScore;
    applyFilters();
  }

  function selectPlace(place) {
    selectedPlace = place;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeDetail() {
    selectedPlace = null;
  }

  function retryLoad() {
    loadPlaces();
  }

  onMount(() => {
    loadPlaces();
  });
</script>

<div class="min-h-screen">
  <Header />
  
  <main class="container mx-auto px-4 py-6">
    {#if !apiHealthy}
      <div class="mb-6 p-4 bg-amber-100 border border-amber-300 rounded-xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-semibold text-amber-800">后端服务连接异常</p>
              <p class="text-sm text-amber-700">当前使用演示数据，部分功能可能不可用</p>
            </div>
          </div>
          <button 
            on:click={retryLoad}
            class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            重新连接
          </button>
        </div>
      </div>
    {/if}

    {#if selectedPlace}
      <div class="mb-6">
        <ErrorBoundary>
          <PlaceDetail place={selectedPlace} on:close={closeDetail} />
        </ErrorBoundary>
      </div>
    {/if}

    {#if filteredPlaces.length > 0}
      <ErrorBoundary>
        <MapView places={filteredPlaces} {selectedPlace} on:select={(e) => selectPlace(e.detail)} />
      </ErrorBoundary>
    {/if}

    <FilterBar on:filterChange={handleFilterChange} />
    
    <div class="mt-6">
      {#if loading}
        <div class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <div class="text-white text-xl">加载中...</div>
        </div>
      {:else if error && filteredPlaces.length === 0}
        <div class="flex flex-col items-center justify-center py-20 bg-white bg-opacity-10 rounded-2xl">
          <div class="text-6xl mb-4">😢</div>
          <p class="text-white text-xl mb-2">{error}</p>
          <button 
            on:click={retryLoad}
            class="mt-4 px-6 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-opacity-90 transition-all"
          >
            点击重试
          </button>
        </div>
      {:else if filteredPlaces.length === 0}
        <div class="text-center py-20">
          <p class="text-white text-xl">没有找到符合条件的地点</p>
          <button 
            on:click={() => { filterType = 'all'; minScore = 0; applyFilters(); }}
            class="mt-4 px-6 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
          >
            重置筛选条件
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each filteredPlaces as place}
            <ErrorBoundary>
              <PlaceCard {place} on:select={() => selectPlace(place)} />
            </ErrorBoundary>
          {/each}
        </div>
      {/if}
    </div>
  </main>

  <footer class="mt-12 py-6 bg-black bg-opacity-20">
    <div class="container mx-auto px-4 text-center text-white text-sm">
      <p>💼 Work Escape Rating | 打工人摸鱼指南</p>
      <p class="mt-2 opacity-75">基于大众点评评论挖掘 · WiFi速度 · 插座数量 · 嘈杂度综合评分</p>
    </div>
  </footer>
</div>
