<template>
  <div class="calculator-view">
    <h2 class="page-title">大整数计算器</h2>
    
    <div class="info-box">
      <p><strong>模幂运算</strong>是 RSA 算法的核心运算，公式为：<code>c ≡ m^e mod n</code></p>
      <p style="margin-top: 8px;">本计算器使用<strong>快速模幂算法</strong>（也称为平方-乘算法），可以高效计算大整数的模幂运算。</p>
    </div>

    <el-row :gutter="24">
      <el-col :span="12">
        <div class="card">
          <h3 class="card-title">模幂运算计算器</h3>
          
          <el-form label-width="120px" class="form-item">
            <el-form-item label="底数 (base)">
              <el-input 
                v-model="base" 
                type="number" 
                placeholder="请输入底数"
              />
            </el-form-item>
            
            <el-form-item label="指数 (exponent)">
              <el-input 
                v-model="exponent" 
                type="number" 
                placeholder="请输入指数"
              />
            </el-form-item>
            
            <el-form-item label="模数 (modulus)">
              <el-input 
                v-model="modulus" 
                type="number" 
                placeholder="请输入模数（必须大于 0）"
              />
            </el-form-item>
          </el-form>

          <div class="button-group">
            <el-button type="primary" @click="calculateModExp" :loading="calculating">
              计算模幂
            </el-button>
            <el-button @click="clearAll">
              清空
            </el-button>
          </div>

          <div v-if="modExpResult" class="result-box">
            <div class="result-title">计算结果</div>
            <div class="result-content">
              <p><strong>{{ base }}<sup>{{ exponent }}</sup> mod {{ modulus }} = {{ modExpResult }}</strong></p>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">常用计算工具</h3>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="GCD 计算" name="gcd">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="数 a">
                  <el-input v-model="gcdA" type="number" placeholder="请输入数 a" />
                </el-form-item>
                <el-form-item label="数 b">
                  <el-input v-model="gcdB" type="number" placeholder="请输入数 b" />
                </el-form-item>
              </el-form>
              <div class="button-group">
                <el-button type="primary" @click="calculateGCD" :loading="calculatingGCD">
                  计算 GCD
                </el-button>
              </div>
              <div v-if="gcdResult !== null" class="result-box">
                <div class="result-title">GCD 结果</div>
                <div class="result-content">
                  <p>gcd({{ gcdA }}, {{ gcdB }}) = {{ gcdResult }}</p>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="模逆计算" name="modinv">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="数 e">
                  <el-input v-model="modInvE" type="number" placeholder="请输入数 e" />
                </el-form-item>
                <el-form-item label="模数 φ">
                  <el-input v-model="modInvPhi" type="number" placeholder="请输入模数 φ" />
                </el-form-item>
              </el-form>
              <div class="button-group">
                <el-button type="primary" @click="calculateModInverse" :loading="calculatingModInv">
                  计算模逆
                </el-button>
              </div>
              <div v-if="modInvResult" class="result-box">
                <div class="result-title">模逆结果</div>
                <div class="result-content">
                  <p>d ≡ {{ modInvE }}<sup>-1</sup> mod {{ modInvPhi }} = {{ modInvResult }}</p>
                </div>
              </div>
              <div v-if="modInvError" class="warning-box">
                <p>{{ modInvError }}</p>
              </div>
            </el-tab-pane>

            <el-tab-pane label="素数检查" name="prime">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="待检查数">
                  <el-input v-model="primeCheckNum" type="number" placeholder="请输入一个整数" />
                </el-form-item>
              </el-form>
              <div class="button-group">
                <el-button type="primary" @click="checkPrimeNumber" :loading="checkingPrime">
                  检查是否为素数
                </el-button>
                <el-button type="success" @click="generateRandomPrime" :loading="generatingPrime">
                  随机生成素数
                </el-button>
              </div>
              <div v-if="primeCheckResult" class="result-box">
                <div class="result-title">素数检查结果</div>
                <div class="result-content">
                  <p v-if="primeCheckResult.is_prime" class="success-text">
                    ✅ {{ primeCheckResult.number }} 是素数
                  </p>
                  <p v-else class="error-text">
                    ❌ {{ primeCheckResult.number }} 不是素数
                  </p>
                </div>
              </div>
              <div v-if="generatedPrime" class="result-box">
                <div class="result-title">生成的素数</div>
                <div class="result-content">{{ generatedPrime }}</div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <h3 class="card-title">计算步骤演示</h3>
          
          <div v-if="steps.length > 0" class="steps-demo">
            <div class="steps-header">
              <h4>快速模幂算法步骤</h4>
              <p>计算 {{ base }}<sup>{{ exponent }}</sup> mod {{ modulus }}</p>
            </div>
            
            <div class="steps-list">
              <div 
                v-for="(step, index) in steps" 
                :key="index" 
                class="step-item"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">{{ step }}</div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <el-icon size="48" color="#cbd5e0"><Calculator /></el-icon>
            <p>输入数值并点击"计算模幂"查看详细计算步骤</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">算法原理</h3>
          
          <div class="principle-content">
            <h4>快速模幂算法（平方-乘算法）</h4>
            
            <div class="principle-section">
              <h5>核心思想</h5>
              <p>
                通过将指数分解为二进制形式，利用平方运算来减少乘法次数，
                将时间复杂度从 O(n) 降低到 O(log n)。
              </p>
            </div>

            <div class="principle-section">
              <h5>算法步骤</h5>
              <ol>
                <li>初始化 result = 1</li>
                <li>base = base mod modulus</li>
                <li>当 exponent > 0 时：
                  <ul>
                    <li>如果 exponent 是奇数，result = (result × base) mod modulus</li>
                    <li>exponent = exponent / 2</li>
                    <li>base = (base × base) mod modulus</li>
                  </ul>
                </li>
                <li>返回 result</li>
              </ol>
            </div>

            <div class="principle-section">
              <h5>示例</h5>
              <p>计算 3<sup>13</sup> mod 7：</p>
              <p>13 的二进制是 1101</p>
              <p>3<sup>13</sup> = 3<sup>8</sup> × 3<sup>4</sup> × 3<sup>1</sup></p>
              <p>计算：3 mod 7 = 3，3<sup>2</sup> mod 7 = 2，3<sup>4</sup> mod 7 = 4，3<sup>8</sup> mod 7 = 2</p>
              <p>结果：(2 × 4 × 3) mod 7 = 24 mod 7 = 3</p>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Calculator } from '@element-plus/icons-vue'
import { rsaApi, calculatorApi } from '../services/api'

const base = ref('')
const exponent = ref('')
const modulus = ref('')
const calculating = ref(false)
const modExpResult = ref('')
const steps = ref([])

const activeTab = ref('gcd')

const gcdA = ref('')
const gcdB = ref('')
const gcdResult = ref(null)
const calculatingGCD = ref(false)

const modInvE = ref('')
const modInvPhi = ref('')
const modInvResult = ref('')
const modInvError = ref('')
const calculatingModInv = ref(false)

const primeCheckNum = ref('')
const primeCheckResult = ref(null)
const generatedPrime = ref('')
const checkingPrime = ref(false)
const generatingPrime = ref(false)

const calculateModExp = async () => {
  if (!base.value || !exponent.value || !modulus.value) {
    ElMessage.warning('请填写所有参数')
    return
  }
  
  const mod = Number(modulus.value)
  if (mod <= 0) {
    ElMessage.warning('模数必须大于 0')
    return
  }
  
  try {
    calculating.value = true
    const response = await calculatorApi.calculateModExp(
      Number(base.value),
      Number(exponent.value),
      mod
    )
    
    modExpResult.value = response.data.result
    steps.value = response.data.steps
    ElMessage.success('计算完成！')
  } catch (error) {
    ElMessage.error('计算失败：' + error.message)
  } finally {
    calculating.value = false
  }
}

const calculateGCD = async () => {
  if (!gcdA.value || !gcdB.value) {
    ElMessage.warning('请填写所有参数')
    return
  }
  
  try {
    calculatingGCD.value = true
    const response = await calculatorApi.calculateGCD(
      Number(gcdA.value),
      Number(gcdB.value)
    )
    
    gcdResult.value = response.data.gcd
    ElMessage.success('GCD 计算完成！')
  } catch (error) {
    ElMessage.error('计算失败：' + error.message)
  } finally {
    calculatingGCD.value = false
  }
}

const calculateModInverse = async () => {
  if (!modInvE.value || !modInvPhi.value) {
    ElMessage.warning('请填写所有参数')
    return
  }
  
  const phi = Number(modInvPhi.value)
  if (phi <= 0) {
    ElMessage.warning('模数必须大于 0')
    return
  }
  
  try {
    calculatingModInv.value = true
    modInvError.value = ''
    const response = await calculatorApi.calculateModInverse(
      Number(modInvE.value),
      phi
    )
    
    if (response.data.d) {
      modInvResult.value = response.data.d
      ElMessage.success('模逆计算完成！')
    } else {
      modInvError.value = response.data.message
      ElMessage.warning(response.data.message)
    }
  } catch (error) {
    ElMessage.error('计算失败：' + error.message)
  } finally {
    calculatingModInv.value = false
  }
}

const checkPrimeNumber = async () => {
  if (!primeCheckNum.value) {
    ElMessage.warning('请输入一个数')
    return
  }
  
  try {
    checkingPrime.value = true
    const response = await rsaApi.checkPrime(Number(primeCheckNum.value))
    primeCheckResult.value = response.data
    generatedPrime.value = ''
  } catch (error) {
    ElMessage.error('检查失败：' + error.message)
  } finally {
    checkingPrime.value = false
  }
}

const generateRandomPrime = async () => {
  try {
    generatingPrime.value = true
    const response = await rsaApi.generatePrime(512)
    generatedPrime.value = response.data.prime
    primeCheckResult.value = null
    ElMessage.success('素数生成成功！')
  } catch (error) {
    ElMessage.error('生成失败：' + error.message)
  } finally {
    generatingPrime.value = false
  }
}

const clearAll = () => {
  base.value = ''
  exponent.value = ''
  modulus.value = ''
  modExpResult.value = ''
  steps.value = []
}
</script>

<style scoped>
.calculator-view {
  max-width: 1400px;
  margin: 0 auto;
}

.steps-demo {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
}

.steps-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.steps-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.steps-header p {
  color: #718096;
}

.steps-list {
  max-height: 500px;
  overflow-y: auto;
}

.step-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

.step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
  margin-right: 12px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9rem;
  color: #4a5568;
  line-height: 1.6;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
}

.empty-state p {
  margin-top: 16px;
}

.principle-content {
  line-height: 1.8;
}

.principle-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.principle-section {
  margin-bottom: 20px;
}

.principle-section h5 {
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 12px;
}

.principle-section p {
  color: #718096;
  margin-bottom: 8px;
}

.principle-section ol,
.principle-section ul {
  padding-left: 20px;
  color: #718096;
}

.principle-section li {
  margin-bottom: 6px;
}

.principle-section code {
  background-color: #f7fafc;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #e53e3e;
}
</style>
