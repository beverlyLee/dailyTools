<script>
  let stats = {
    total_places: 6,
    average_score: 7.5,
    high_score_count: 3
  };
</script>

<header class="bg-black bg-opacity-30 backdrop-blur-lg text-white py-8">
  <div class="container mx-auto px-4">
    <div class="flex flex-col md:flex-row items-center justify-between">
      <div class="text-center md:text-left mb-6 md:mb-0">
        <h1 class="text-4xl font-bold mb-2">
          💼 Work Escape Rating
        </h1>
        <p class="text-xl opacity-90">打工人摸鱼指南 · 寻找最佳办公地点</p>
        <p class="mt-2 text-sm opacity-75">基于评论挖掘 · WiFi速度 · 插座数量 · 嘈杂度综合评分</p>
      </div>
      
      <div class="flex gap-8">
        <div class="text-center">
          <div class="text-3xl font-bold">{stats.total_places}</div>
          <div class="text-sm opacity-75">收录地点</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold">{stats.average_score}</div>
          <div class="text-sm opacity-75">平均评分</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-400">{stats.high_score_count}</div>
          <div class="text-sm opacity-75">高分推荐</div>
        </div>
      </div>
    </div>
  </div>
</header>
