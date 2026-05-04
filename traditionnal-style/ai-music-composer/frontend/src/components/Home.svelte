<script>
  import { navigate } from 'svelte-routing'

  const features = [
    {
      icon: '🎵',
      title: 'AI 智能作曲',
      description: '输入关键词，AI 自动生成符合描述的国潮音乐片段，支持百度 ERNIE-Music 和昆仑万维 SkyMusic 模型'
    },
    {
      icon: '🎨',
      title: '风格自由调节',
      description: '灵活调节民乐占比和现代感参数，打造传统与现代完美融合的独特音乐风格'
    },
    {
      icon: '🎹',
      title: '钢琴卷帘编辑',
      description: '专业级钢琴卷帘式编辑器，让你可以精确编辑每个音符，释放创作灵感'
    },
    {
      icon: '💾',
      title: '云端存储分享',
      description: '所有作品自动保存到数据库，支持一键分享和二次创作，让音乐传遍全网'
    }
  ]

  const quickStartExamples = [
    { keywords: '赛博朋克+古筝', label: '赛博古筝' },
    { keywords: '春节+喜庆+锣鼓', label: '春节喜庆' },
    { keywords: '古风+笛子', label: '古风悠扬' },
    { keywords: '电子+二胡', label: '电子国风' }
  ]

  function startGenerate(keywords) {
    const url = keywords 
      ? `/generate?keywords=${encodeURIComponent(keywords)}`
      : '/generate'
    navigate(url)
  }
</script>

<div class="home-page">
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="title-accent">国潮</span>音乐生成器
      </h1>
      <p class="hero-subtitle">
        AI 驱动，传统与现代的完美融合
      </p>
      
      <div class="hero-cta">
        <button class="btn btn-primary btn-lg" on:click={() => startGenerate()}>
          开始创作 ✨
        </button>
      </div>

      <div class="quick-start">
        <p class="quick-start-label">快速开始：</p>
        <div class="example-tags">
          {#each quickStartExamples as example}
            <button
              class="example-tag"
              on:click={() => startGenerate(example.keywords)}
            >
              {example.label}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="music-notes">
        {#each ['♪', '♫', '♬', '♩'] as note, i}
          <span class="note" style="--delay: {i * 0.3}s">{note}</span>
        {/each}
      </div>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <h2 class="section-title">核心功能</h2>
      <div class="features-grid">
        {#each features as feature}
          <div class="feature-card">
            <div class="feature-icon">{feature.icon}</div>
            <h3 class="feature-title">{feature.title}</h3>
            <p class="feature-description">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="how-it-works">
    <div class="container">
      <h2 class="section-title">如何使用</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h3>描述你的音乐</h3>
          <p>输入关键词，如「赛博朋克+古筝」或「春节+喜庆」</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>调整风格参数</h3>
          <p>调节民乐占比和现代感，找到最适合你的风格</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>精雕细琢</h3>
          <p>使用钢琴卷帘编辑器，微调每一个音符</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">4</div>
          <h3>分享创作</h3>
          <p>保存、导出、分享你的国潮音乐作品</p>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .home-page {
    min-height: calc(100vh - 64px);
  }

  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 60px 40px;
    background: linear-gradient(135deg, #2c1810 0%, #4a2c20 50%, #6b3a30 100%);
    color: white;
    min-height: 500px;
  }

  .hero-content {
    flex: 1;
    max-width: 600px;
  }

  .hero-title {
    font-size: 56px;
    font-weight: 700;
    margin-bottom: 16px;
    line-height: 1.1;
  }

  .title-accent {
    background: linear-gradient(135deg, var(--secondary-light), var(--secondary-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 40px;
  }

  .hero-cta {
    margin-bottom: 40px;
  }

  .btn-lg {
    padding: 16px 32px;
    font-size: 16px;
  }

  .quick-start {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .quick-start-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
  }

  .example-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .example-tag {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    color: white;
    font-size: 14px;
    transition: var(--transition);
  }

  .example-tag:hover {
    background: rgba(212, 175, 55, 0.3);
    border-color: var(--secondary-color);
  }

  .hero-visual {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .music-notes {
    position: relative;
    width: 300px;
    height: 300px;
  }

  .note {
    position: absolute;
    font-size: 48px;
    color: var(--secondary-light);
    opacity: 0.8;
    animation: float 3s ease-in-out infinite;
    animation-delay: var(--delay);
  }

  .note:nth-child(1) { top: 20%; left: 20%; }
  .note:nth-child(2) { top: 10%; right: 30%; }
  .note:nth-child(3) { bottom: 30%; left: 40%; }
  .note:nth-child(4) { bottom: 20%; right: 20%; }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(10deg); }
  }

  .section-title {
    text-align: center;
    font-size: 32px;
    margin-bottom: 48px;
    color: var(--text-color);
  }

  .features {
    padding: 80px 0;
    background: var(--bg-color);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 32px;
  }

  .feature-card {
    text-align: center;
    padding: 32px;
  }

  .feature-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .feature-title {
    font-size: 20px;
    margin-bottom: 12px;
    color: var(--text-color);
  }

  .feature-description {
    color: var(--text-light);
    line-height: 1.6;
  }

  .how-it-works {
    padding: 80px 0;
    background: white;
  }

  .steps {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .step {
    flex: 1;
    min-width: 200px;
    max-width: 250px;
    text-align: center;
    padding: 24px;
  }

  .step-number {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    margin: 0 auto 16px;
  }

  .step h3 {
    margin-bottom: 8px;
    color: var(--text-color);
  }

  .step p {
    color: var(--text-light);
    font-size: 14px;
  }

  .step-arrow {
    font-size: 32px;
    color: var(--border-color);
    align-self: center;
  }

  @media (max-width: 768px) {
    .hero {
      flex-direction: column;
      text-align: center;
      padding: 40px 20px;
    }

    .hero-title {
      font-size: 36px;
    }

    .hero-visual {
      display: none;
    }

    .quick-start {
      justify-content: center;
    }

    .steps {
      flex-direction: column;
      align-items: center;
    }

    .step-arrow {
      transform: rotate(90deg);
    }
  }
</style>
