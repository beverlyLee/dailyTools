<template>
  <div class="key-generation-view">
    <h2 class="page-title">RSA 密钥生成向导</h2>
    
    <div class="info-box">
      <p>通过分步向导来了解 RSA 密钥生成的完整过程。您可以手动输入素数，或者让系统随机生成。</p>
    </div>

    <el-steps :active="currentStep" align-center class="steps-header">
      <el-step title="选择素数 p" :description="step1Status" />
      <el-step title="选择素数 q" :description="step2Status" />
      <el-step title="计算 n 和 φ(n)" :description="step3Status" />
      <el-step title="选择公钥 e" :description="step4Status" />
      <el-step title="计算私钥 d" :description="step5Status" />
      <el-step title="生成密钥对" :description="step6Status" />
    </el-steps>

    <div class="card">
      <template v-if="currentStep === 0">
        <h3 class="card-title">步骤 1: 选择素数 p</h3>
        <div class="info-box">
          <p><strong>素数</strong>是指大于1的自然数，除了1和它本身之外没有其他正因数的数。</p>
          <p style="margin-top: 8px;">RSA 算法的安全性依赖于大数分解的困难性，因此需要选择大素数。</p>
        </div>
        
        <el-form label-width="120px" class="form-item">
          <el-form-item label="位长度">
            <el-select v-model="bitLength" style="width: 200px">
              <el-option label="128 位" :value="128" />
              <el-option label="256 位" :value="256" />
              <el-option label="512 位" :value="512" />
              <el-option label="1024 位" :value="1024" />
            </el-select>
            <span style="margin-left: 16px; color: #718096;">
              位长度越大，安全性越高，但计算速度越慢
            </span>
          </el-form-item>
          
          <el-form-item label="手动输入 p">
            <el-input 
              v-model="manualP" 
              type="textarea"
              :rows="2"
              placeholder="输入一个素数（可选）"
              style="width: 400px;"
            />
            <span style="margin-left: 16px; color: #718096;">
              留空则系统自动生成
            </span>
          </el-form-item>
        </el-form>

        <div class="button-group">
          <el-button type="primary" @click="checkPrimeP" :loading="checkingPrime">
            检查是否为素数
          </el-button>
          <el-button type="success" @click="generatePrimeP" :loading="generatingPrime">
            随机生成素数
          </el-button>
          <el-button type="primary" @click="goToStep(1)" :disabled="!pValid">
            下一步
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

        <div v-if="generatedP" class="result-box">
          <div class="result-title">生成的素数 p</div>
          <div class="result-content">{{ generatedP }}</div>
        </div>
      </template>

      <template v-else-if="currentStep === 1">
        <h3 class="card-title">步骤 2: 选择素数 q</h3>
        <div class="info-box">
          <p>选择另一个大素数 <strong>q</strong>，注意 <strong>q 必须与 p 不同</strong>。</p>
        </div>
        
        <el-form label-width="120px" class="form-item">
          <el-form-item label="位长度">
            <el-select v-model="bitLengthQ" style="width: 200px">
              <el-option label="128 位" :value="128" />
              <el-option label="256 位" :value="256" />
              <el-option label="512 位" :value="512" />
              <el-option label="1024 位" :value="1024" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="手动输入 q">
            <el-input 
              v-model="manualQ" 
              type="textarea"
              :rows="2"
              placeholder="输入一个素数（与 p 不同）"
              style="width: 400px;"
            />
          </el-form-item>
        </el-form>

        <div class="button-group">
          <el-button @click="goToStep(0)">上一步</el-button>
          <el-button type="primary" @click="checkPrimeQ" :loading="checkingPrimeQ">
            检查是否为素数
          </el-button>
          <el-button type="success" @click="generatePrimeQ" :loading="generatingPrimeQ">
            随机生成素数
          </el-button>
          <el-button type="primary" @click="goToStep(2)" :disabled="!qValid">
            下一步
          </el-button>
        </div>

        <div v-if="primeCheckResultQ" class="result-box">
          <div class="result-title">素数检查结果</div>
          <div class="result-content">
            <p v-if="primeCheckResultQ.is_prime" class="success-text">
              ✅ {{ primeCheckResultQ.number }} 是素数
            </p>
            <p v-else class="error-text">
              ❌ {{ primeCheckResultQ.number }} 不是素数
            </p>
          </div>
        </div>

        <div v-if="generatedQ" class="result-box">
          <div class="result-title">生成的素数 q</div>
          <div class="result-content">{{ generatedQ }}</div>
        </div>
      </template>

      <template v-else-if="currentStep === 2">
        <h3 class="card-title">步骤 3: 计算 n 和 φ(n)</h3>
        
        <div class="info-box">
          <p><strong>模数 n = p × q</strong> - 这是公钥和私钥的一部分</p>
          <p><strong>欧拉函数 φ(n) = (p-1) × (q-1)</strong> - 用于计算私钥</p>
        </div>

        <div class="calculation-display">
          <div class="calc-item">
            <span class="calc-label">p =</span>
            <span class="calc-value">{{ p }}</span>
          </div>
          <div class="calc-item">
            <span class="calc-label">q =</span>
            <span class="calc-value">{{ q }}</span>
          </div>
          <div class="calc-divider">
            <span class="calc-label">n = p × q =</span>
            <span class="calc-value result">{{ n }}</span>
          </div>
          <div class="calc-divider">
            <span class="calc-label">φ(n) = (p-1) × (q-1) =</span>
            <span class="calc-value result">{{ phiN }}</span>
          </div>
        </div>

        <div class="button-group">
          <el-button @click="goToStep(1)">上一步</el-button>
          <el-button type="primary" @click="calculateNAndPhi" :loading="calculating">
            计算 n 和 φ(n)
          </el-button>
          <el-button type="primary" @click="goToStep(3)" :disabled="!nCalculated">
            下一步
          </el-button>
        </div>
      </template>

      <template v-else-if="currentStep === 3">
        <h3 class="card-title">步骤 4: 选择公钥指数 e</h3>
        
        <div class="info-box">
          <p>公钥指数 <strong>e</strong> 需要满足以下条件：</p>
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li>1 < e < φ(n)</li>
            <li>e 与 φ(n) 互质（即 gcd(e, φ(n)) = 1）</li>
          </ul>
          <p style="margin-top: 8px;"><strong>常用值：65537</strong>（也是推荐值）</p>
        </div>

        <el-form label-width="120px" class="form-item">
          <el-form-item label="公钥指数 e">
            <el-select v-model="selectedE" style="width: 200px" @change="onEChange">
              <el-option label="3" :value="3" />
              <el-option label="5" :value="5" />
              <el-option label="17" :value="17" />
              <el-option label="257" :value="257" />
              <el-option label="65537 (推荐)" :value="65537" />
            </el-select>
            <span style="margin-left: 16px; color: #718096;">
              65537 是最常用的公钥指数
            </span>
          </el-form-item>
        </el-form>

        <div v-if="eValid" class="success-box">
          <p>✅ e = {{ selectedE }} 与 φ(n) = {{ phiN }} 互质，可以使用</p>
        </div>

        <div v-else-if="eChecked" class="warning-box">
          <p>⚠️ e = {{ selectedE }} 与 φ(n) = {{ phiN }} 不互质，请选择其他 e 值</p>
        </div>

        <div class="button-group">
          <el-button @click="goToStep(2)">上一步</el-button>
          <el-button type="primary" @click="checkECoprime" :loading="checkingE">
            检查 e 是否与 φ(n) 互质
          </el-button>
          <el-button type="primary" @click="goToStep(4)" :disabled="!eValid">
            下一步
          </el-button>
        </div>
      </template>

      <template v-else-if="currentStep === 4">
        <h3 class="card-title">步骤 5: 计算私钥指数 d</h3>
        
        <div class="info-box">
          <p>私钥指数 <strong>d</strong> 是 e 关于 φ(n) 的<strong>模逆</strong>，即满足：</p>
          <p style="margin-top: 8px; font-family: monospace; background: #f7fafc; padding: 8px; border-radius: 4px;">
            d ≡ e<sup>-1</sup> mod φ(n)
          </p>
          <p style="margin-top: 8px;">这意味着 (e × d) mod φ(n) = 1</p>
        </div>

        <div class="calculation-display">
          <div class="calc-item">
            <span class="calc-label">e =</span>
            <span class="calc-value">{{ selectedE }}</span>
          </div>
          <div class="calc-item">
            <span class="calc-label">φ(n) =</span>
            <span class="calc-value">{{ phiN }}</span>
          </div>
          <div class="calc-divider" v-if="d">
            <span class="calc-label">d = e<sup>-1</sup> mod φ(n) =</span>
            <span class="calc-value result">{{ d }}</span>
          </div>
        </div>

        <div v-if="d" class="success-box">
          <p>✅ 验证：(e × d) mod φ(n) = {{ (BigInt(selectedE) * BigInt(d)) % BigInt(phiN) }} （应为 1）</p>
        </div>

        <div class="button-group">
          <el-button @click="goToStep(3)">上一步</el-button>
          <el-button type="primary" @click="calculateD" :loading="calculatingD">
            计算私钥 d
          </el-button>
          <el-button type="primary" @click="goToStep(5)" :disabled="!d">
            下一步
          </el-button>
        </div>
      </template>

      <template v-else-if="currentStep === 5">
        <h3 class="card-title">步骤 6: 生成密钥对并保存</h3>
        
        <div class="info-box">
          <p>恭喜！您已完成 RSA 密钥生成的所有步骤。</p>
          <p style="margin-top: 8px;">
            <strong>公钥：</strong>(e, n) - 可以公开分享<br>
            <strong>私钥：</strong>(d, n) - 必须保密
          </p>
        </div>

        <div class="key-pair-display">
          <div class="key-box public-key">
            <h4>公钥 (Public Key)</h4>
            <div class="key-info">
              <p><strong>e:</strong> {{ selectedE }}</p>
              <p><strong>n:</strong> {{ n }}</p>
            </div>
          </div>
          
          <div class="key-box private-key">
            <h4>私钥 (Private Key)</h4>
            <div class="key-info">
              <p><strong>d:</strong> {{ d }}</p>
              <p><strong>n:</strong> {{ n }}</p>
            </div>
          </div>
        </div>

        <div class="key-params">
          <h4>生成参数</h4>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="param-item">
                <span class="param-label">p:</span>
                <span class="param-value">{{ p }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <span class="param-label">q:</span>
                <span class="param-value">{{ q }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <span class="param-label">φ(n):</span>
                <span class="param-value">{{ phiN }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <span class="param-label">e:</span>
                <span class="param-value">{{ selectedE }}</span>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="button-group">
          <el-button @click="goToStep(4)">上一步</el-button>
          <el-button type="primary" @click="generateAndSaveKeyPair" :loading="generatingKeyPair">
            生成并保存密钥对
          </el-button>
          <el-button type="success" @click="resetWizard" v-if="keyPairGenerated">
            重新开始
          </el-button>
        </div>

        <div v-if="keyPairGenerated" class="success-box">
          <p>✅ 密钥对已成功生成并保存到数据库！</p>
          <p style="margin-top: 8px;">
            您可以在 <router-link to="/history" style="color: #276749; text-decoration: underline;">历史记录</router-link> 中查看所有密钥对
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { rsaApi, calculatorApi } from '../services/api'

const currentStep = ref(0)
const bitLength = ref(512)
const bitLengthQ = ref(512)

const manualP = ref('')
const manualQ = ref('')
const p = ref('')
const q = ref('')

const checkingPrime = ref(false)
const checkingPrimeQ = ref(false)
const generatingPrime = ref(false)
const generatingPrimeQ = ref(false)
const primeCheckResult = ref(null)
const primeCheckResultQ = ref(null)
const generatedP = ref('')
const generatedQ = ref('')

const pValid = ref(false)
const qValid = ref(false)
const nCalculated = ref(false)
const eValid = ref(false)
const eChecked = ref(false)
const checkingE = ref(false)
const calculating = ref(false)
const calculatingD = ref(false)
const generatingKeyPair = ref(false)
const keyPairGenerated = ref(false)

const n = ref('')
const phiN = ref('')
const selectedE = ref(65537)
const d = ref('')

const step1Status = computed(() => pValid.value ? '已完成' : '')
const step2Status = computed(() => qValid.value ? '已完成' : '')
const step3Status = computed(() => nCalculated.value ? '已完成' : '')
const step4Status = computed(() => eValid.value ? '已完成' : '')
const step5Status = computed(() => d.value ? '已完成' : '')
const step6Status = computed(() => keyPairGenerated.value ? '已完成' : '')

const goToStep = (step) => {
  currentStep.value = step
}

const checkPrimeP = async () => {
  if (!manualP.value) {
    ElMessage.warning('请输入一个数进行素数检查')
    return
  }
  
  try {
    checkingPrime.value = true
    const num = BigInt(manualP.value)
    const response = await rsaApi.checkPrime(Number(num))
    primeCheckResult.value = response.data
    
    if (response.data.is_prime) {
      p.value = manualP.value
      pValid.value = true
      ElMessage.success('这是一个素数！')
    } else {
      ElMessage.error('这不是一个素数，请重新输入')
    }
  } catch (error) {
    ElMessage.error('检查素数失败：' + error.message)
  } finally {
    checkingPrime.value = false
  }
}

const generatePrimeP = async () => {
  try {
    generatingPrime.value = true
    const response = await rsaApi.generatePrime(bitLength.value)
    generatedP.value = response.data.prime
    p.value = response.data.prime.toString()
    pValid.value = true
    primeCheckResult.value = null
    ElMessage.success('素数生成成功！')
  } catch (error) {
    ElMessage.error('生成素数失败：' + error.message)
  } finally {
    generatingPrime.value = false
  }
}

const checkPrimeQ = async () => {
  if (!manualQ.value) {
    ElMessage.warning('请输入一个数进行素数检查')
    return
  }
  
  if (manualQ.value === p.value) {
    ElMessage.warning('q 不能与 p 相同')
    return
  }
  
  try {
    checkingPrimeQ.value = true
    const num = BigInt(manualQ.value)
    const response = await rsaApi.checkPrime(Number(num))
    primeCheckResultQ.value = response.data
    
    if (response.data.is_prime) {
      q.value = manualQ.value
      qValid.value = true
      ElMessage.success('这是一个素数！')
    } else {
      ElMessage.error('这不是一个素数，请重新输入')
    }
  } catch (error) {
    ElMessage.error('检查素数失败：' + error.message)
  } finally {
    checkingPrimeQ.value = false
  }
}

const generatePrimeQ = async () => {
  try {
    generatingPrimeQ.value = true
    let response
    do {
      response = await rsaApi.generatePrime(bitLengthQ.value)
    } while (response.data.prime.toString() === p.value)
    
    generatedQ.value = response.data.prime
    q.value = response.data.prime.toString()
    qValid.value = true
    primeCheckResultQ.value = null
    ElMessage.success('素数生成成功！')
  } catch (error) {
    ElMessage.error('生成素数失败：' + error.message)
  } finally {
    generatingPrimeQ.value = false
  }
}

const calculateNAndPhi = () => {
  try {
    calculating.value = true
    const bigP = BigInt(p.value)
    const bigQ = BigInt(q.value)
    
    n.value = (bigP * bigQ).toString()
    phiN.value = ((bigP - 1n) * (bigQ - 1n)).toString()
    nCalculated.value = true
    ElMessage.success('n 和 φ(n) 计算成功！')
  } catch (error) {
    ElMessage.error('计算失败：' + error.message)
  } finally {
    calculating.value = false
  }
}

const checkECoprime = async () => {
  try {
    checkingE.value = true
    const response = await calculatorApi.calculateGCD(selectedE.value, Number(BigInt(phiN.value)))
    const gcdResult = response.data.gcd
    eChecked.value = true
    
    if (gcdResult === 1) {
      eValid.value = true
      ElMessage.success('e 与 φ(n) 互质！')
    } else {
      eValid.value = false
      ElMessage.warning('e 与 φ(n) 不互质，请选择其他 e 值')
    }
  } catch (error) {
    ElMessage.error('检查失败：' + error.message)
  } finally {
    checkingE.value = false
  }
}

const onEChange = () => {
  eValid.value = false
  eChecked.value = false
}

const calculateD = async () => {
  try {
    calculatingD.value = true
    const response = await calculatorApi.calculateModInverse(selectedE.value, Number(BigInt(phiN.value)))
    
    if (response.data.d) {
      d.value = response.data.d.toString()
      ElMessage.success('私钥 d 计算成功！')
    } else {
      ElMessage.error('无法计算模逆：' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('计算失败：' + error.message)
  } finally {
    calculatingD.value = false
  }
}

const generateAndSaveKeyPair = async () => {
  try {
    generatingKeyPair.value = true
    const response = await rsaApi.generateKeyPair({
      p: Number(BigInt(p.value)),
      q: Number(BigInt(q.value)),
      e: selectedE.value,
      bit_length: bitLength.value
    })
    
    if (response.data.success) {
      keyPairGenerated.value = true
      ElMessage.success('密钥对生成并保存成功！')
    } else {
      ElMessage.error('生成密钥对失败：' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('生成密钥对失败：' + error.message)
  } finally {
    generatingKeyPair.value = false
  }
}

const resetWizard = () => {
  currentStep.value = 0
  p.value = ''
  q.value = ''
  n.value = ''
  phiN.value = ''
  d.value = ''
  pValid.value = false
  qValid.value = false
  nCalculated.value = false
  eValid.value = false
  eChecked.value = false
  keyPairGenerated.value = false
  manualP.value = ''
  manualQ.value = ''
  primeCheckResult.value = null
  primeCheckResultQ.value = null
  generatedP.value = ''
  generatedQ.value = ''
}
</script>

<style scoped>
.key-generation-view {
  max-width: 1200px;
  margin: 0 auto;
}

.steps-header {
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.calculation-display {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.calc-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.calc-label {
  font-weight: 600;
  color: #4a5568;
  min-width: 200px;
}

.calc-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #2d3748;
  word-break: break-all;
}

.calc-value.result {
  color: #667eea;
  font-weight: 600;
}

.calc-divider {
  display: flex;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #e2e8f0;
}

.key-pair-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin: 20px 0;
}

.key-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
}

.public-key {
  border-left: 4px solid #4299e1;
}

.private-key {
  border-left: 4px solid #f56565;
}

.key-box h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d3748;
}

.key-info p {
  margin: 8px 0;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.key-params {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.key-params h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d3748;
}

.param-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.param-label {
  font-weight: 600;
  color: #4a5568;
  margin-right: 8px;
}

.param-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #2d3748;
  word-break: break-all;
}

.success-text {
  color: #276749;
  font-weight: 600;
}

.error-text {
  color: #c53030;
  font-weight: 600;
}
</style>
