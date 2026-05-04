<template>
  <div class="home-view">
    <h2 class="page-title">欢迎使用 RSA 密码学算法演示应用</h2>
    
    <div class="info-box">
      <p><strong>RSA 算法</strong>是一种非对称加密算法，由 Ron Rivest、Adi Shamir 和 Leonard Adleman 于 1977 年提出。</p>
      <p style="margin-top: 10px;">它是目前应用最广泛的公钥加密算法之一，被用于数字签名、密钥交换等场景。</p>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <el-icon size="32" color="#667eea"><Key /></el-icon>
        <h3>密钥生成向导</h3>
        <p>分步演示 RSA 密钥生成过程：选择素数 p、q，计算 n、φ(n)，选择 e，计算 d。</p>
        <router-link to="/key-generation" class="feature-link">开始体验 →</router-link>
      </div>

      <div class="feature-card">
        <el-icon size="32" color="#667eea"><Calculator /></el-icon>
        <h3>大整数计算器</h3>
        <p>提供模幂运算演示，展示快速模幂算法的详细计算步骤，帮助理解 RSA 的核心运算。</p>
        <router-link to="/calculator" class="feature-link">开始体验 →</router-link>
      </div>

      <div class="feature-card">
        <el-icon size="32" color="#667eea"><Lock /></el-icon>
        <h3>加密解密功能</h3>
        <p>实现文本消息的加密和解密功能，验证 RSA 算法的正确性，支持实时演示加解密过程。</p>
        <router-link to="/crypto" class="feature-link">开始体验 →</router-link>
      </div>

      <div class="feature-card">
        <el-icon size="32" color="#667eea"><Document /></el-icon>
        <h3>历史记录</h3>
        <p>记录密钥对和加解密历史至 SQLite 数据库，用于教学演示回放，支持查看和管理历史记录。</p>
        <router-link to="/history" class="feature-link">开始体验 →</router-link>
      </div>
    </div>

    <div class="card" style="margin-top: 30px;">
      <h3 class="card-title">RSA 算法原理简介</h3>
      <div class="rsa-principle">
        <div class="principle-step">
          <h4>1. 密钥生成</h4>
          <ul>
            <li>选择两个大素数 <code>p</code> 和 <code>q</code></li>
            <li>计算模数 <code>n = p × q</code></li>
            <li>计算欧拉函数 <code>φ(n) = (p-1) × (q-1)</code></li>
            <li>选择公钥指数 <code>e</code>（与 φ(n) 互质，通常为 65537）</li>
            <li>计算私钥指数 <code>d ≡ e^(-1) mod φ(n)</code></li>
          </ul>
        </div>
        
        <div class="principle-step">
          <h4>2. 加密过程</h4>
          <p>公钥：<code>(e, n)</code></p>
          <p>加密公式：<code>c ≡ m^e mod n</code></p>
          <p>其中 <code>m</code> 是明文，<code>c</code> 是密文</p>
        </div>
        
        <div class="principle-step">
          <h4>3. 解密过程</h4>
          <p>私钥：<code>(d, n)</code></p>
          <p>解密公式：<code>m ≡ c^d mod n</code></p>
          <p>其中 <code>c</code> 是密文，<code>m</code> 是明文</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Key, Calculator, Lock, Document } from '@element-plus/icons-vue'
</script>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 30px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 16px 0 12px;
}

.feature-card p {
  color: #718096;
  line-height: 1.6;
  margin-bottom: 16px;
}

.feature-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.feature-link:hover {
  color: #5a67d8;
}

.rsa-principle {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.principle-step h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
}

.principle-step ul {
  padding-left: 20px;
  color: #4a5568;
  line-height: 1.8;
}

.principle-step p {
  color: #4a5568;
  line-height: 1.8;
  margin: 8px 0;
}

.principle-step code {
  background-color: #f7fafc;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #e53e3e;
}
</style>
