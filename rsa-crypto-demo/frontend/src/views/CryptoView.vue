<template>
  <div class="crypto-view">
    <h2 class="page-title">加密解密功能</h2>
    
    <div class="info-box">
      <p>使用 RSA 算法进行文本消息的加密和解密。您可以：</p>
      <ul style="margin-top: 8px; padding-left: 20px;">
        <li>使用已保存的密钥对进行加解密</li>
        <li>手动输入公钥/私钥参数进行加解密</li>
        <li>测试 RSA 加解密的正确性</li>
      </ul>
    </div>

    <el-row :gutter="24">
      <el-col :span="12">
        <div class="card">
          <h3 class="card-title">加密功能</h3>
          
          <el-tabs v-model="encryptTab">
            <el-tab-pane label="使用已保存的密钥" name="saved">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="选择密钥对">
                  <el-select 
                    v-model="selectedKeyPair" 
                    placeholder="请选择密钥对"
                    style="width: 100%;"
                    @change="onKeyPairChange"
                  >
                    <el-option
                      v-for="keyPair in keyPairs"
                      :key="keyPair.id"
                      :label="`密钥对 #${keyPair.id} (${keyPair.key_size}位)`"
                      :value="keyPair"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="明文消息">
                  <el-input
                    v-model="plainText"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入要加密的文本消息"
                  />
                </el-form-item>
              </el-form>
              
              <div class="button-group">
                <el-button type="primary" @click="encryptWithSavedKey" :loading="encrypting">
                  加密
                </el-button>
                <el-button @click="refreshKeyPairs">
                  刷新密钥列表
                </el-button>
              </div>
            </el-tab-pane>

            <el-tab-pane label="手动输入公钥" name="manual">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="公钥指数 e">
                  <el-input
                    v-model="manualE"
                    type="number"
                    placeholder="请输入公钥指数 e"
                  />
                </el-form-item>
                
                <el-form-item label="模数 n">
                  <el-input
                    v-model="manualN"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入模数 n"
                  />
                </el-form-item>
                
                <el-form-item label="明文消息">
                  <el-input
                    v-model="plainTextManual"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入要加密的文本消息"
                  />
                </el-form-item>
              </el-form>
              
              <div class="button-group">
                <el-button type="primary" @click="encryptWithManualKey" :loading="encryptingManual">
                  加密
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>

          <div v-if="encryptedResult" class="result-box">
            <div class="result-title">加密结果</div>
            <div class="result-content">
              <div class="encrypted-info">
                <p><strong>明文：</strong>{{ encryptedResult.plain_text }}</p>
                <p><strong>密文（十六进制）：</strong></p>
                <div class="cipher-display">
                  {{ encryptedResult.cipher_text.join(', ') }}
                </div>
                <p style="margin-top: 12px;"><strong>密文数字：</strong></p>
                <div class="cipher-display">
                  {{ encryptedResult.cipher_numbers.join(', ') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">测试 RSA 加解密</h3>
          
          <el-form label-width="120px" class="form-item">
            <el-form-item label="测试消息">
              <el-input
                v-model="testMessage"
                placeholder="请输入测试消息"
              />
            </el-form-item>
            
            <el-form-item label="密钥位数">
              <el-select v-model="testBitLength" style="width: 200px">
                <el-option label="256 位" :value="256" />
                <el-option label="512 位" :value="512" />
                <el-option label="1024 位" :value="1024" />
              </el-select>
            </el-form-item>
          </el-form>

          <div class="button-group">
            <el-button type="primary" @click="testEncryptionDecryption" :loading="testing">
              运行测试
            </el-button>
          </div>

          <div v-if="testResult" class="result-box">
            <div class="result-title">测试结果</div>
            <div class="result-content">
              <p v-if="testResult.is_correct" class="success-text" style="font-size: 1.1rem;">
                ✅ 加密解密测试成功！
              </p>
              <p v-else class="error-text" style="font-size: 1.1rem;">
                ❌ 加密解密测试失败！
              </p>
              <div class="test-details">
                <p><strong>原始消息：</strong>{{ testResult.original_message }}</p>
                <p><strong>解密后消息：</strong>{{ testResult.decrypted }}</p>
                <p style="margin-top: 12px;"><strong>公钥 e：</strong>{{ testResult.key_pair.e }}</p>
                <p><strong>私钥 d：</strong>{{ testResult.key_pair.d }}</p>
                <p><strong>模数 n：</strong>{{ testResult.key_pair.n }}</p>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <h3 class="card-title">解密功能</h3>
          
          <el-tabs v-model="decryptTab">
            <el-tab-pane label="使用已保存的密钥" name="saved">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="选择密钥对">
                  <el-select 
                    v-model="selectedDecryptKeyPair" 
                    placeholder="请选择密钥对"
                    style="width: 100%;"
                  >
                    <el-option
                      v-for="keyPair in keyPairs"
                      :key="keyPair.id"
                      :label="`密钥对 #${keyPair.id} (${keyPair.key_size}位)`"
                      :value="keyPair"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="密文数字列表">
                  <el-input
                    v-model="cipherNumbersText"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入密文数字，用逗号或空格分隔"
                  />
                </el-form-item>
              </el-form>
              
              <div class="button-group">
                <el-button type="primary" @click="decryptWithSavedKey" :loading="decrypting">
                  解密
                </el-button>
              </div>
            </el-tab-pane>

            <el-tab-pane label="手动输入私钥" name="manual">
              <el-form label-width="120px" class="form-item">
                <el-form-item label="私钥指数 d">
                  <el-input
                    v-model="manualD"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入私钥指数 d"
                  />
                </el-form-item>
                
                <el-form-item label="模数 n">
                  <el-input
                    v-model="manualND"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入模数 n"
                  />
                </el-form-item>
                
                <el-form-item label="密文数字列表">
                  <el-input
                    v-model="cipherNumbersTextManual"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入密文数字，用逗号或空格分隔"
                  />
                </el-form-item>
              </el-form>
              
              <div class="button-group">
                <el-button type="primary" @click="decryptWithManualKey" :loading="decryptingManual">
                  解密
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>

          <div v-if="decryptedResult" class="result-box">
            <div class="result-title">解密结果</div>
            <div class="result-content">
              <div class="decrypted-info">
                <p><strong>明文消息：</strong></p>
                <div class="plain-display" style="font-size: 1.2rem; color: #276749;">
                  {{ decryptedResult.plain_text }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">RSA 加解密原理</h3>
          
          <div class="principle-content">
            <h4>加密过程</h4>
            <div class="formula">
              <p><strong>公钥：</strong>(e, n)</p>
              <p><strong>加密公式：</strong>c ≡ m<sup>e</sup> mod n</p>
            </div>
            
            <h4>解密过程</h4>
            <div class="formula">
              <p><strong>私钥：</strong>(d, n)</p>
              <p><strong>解密公式：</strong>m ≡ c<sup>d</sup> mod n</p>
            </div>
            
            <h4>数学证明</h4>
            <div class="proof">
              <p>根据欧拉定理和模逆的定义：</p>
              <p>e × d ≡ 1 mod φ(n)</p>
              <p>因此存在整数 k，使得：e × d = 1 + k × φ(n)</p>
              <p>解密时：c<sup>d</sup> ≡ (m<sup>e</sup>)<sup>d</sup> ≡ m<sup>ed</sup> ≡ m<sup>1 + kφ(n)</sup> ≡ m × (m<sup>φ(n)</sup>)<sup>k</sup> ≡ m × 1<sup>k</sup> ≡ m mod n</p>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { rsaApi, cryptoApi } from '../services/api'

const encryptTab = ref('saved')
const decryptTab = ref('saved')

const keyPairs = ref([])
const selectedKeyPair = ref(null)
const selectedDecryptKeyPair = ref(null)

const plainText = ref('')
const plainTextManual = ref('')
const manualE = ref('65537')
const manualN = ref('')

const cipherNumbersText = ref('')
const cipherNumbersTextManual = ref('')
const manualD = ref('')
const manualND = ref('')

const encrypting = ref(false)
const encryptingManual = ref(false)
const decrypting = ref(false)
const decryptingManual = ref(false)
const testing = ref(false)

const encryptedResult = ref(null)
const decryptedResult = ref(null)
const testResult = ref(null)

const testMessage = ref('Hello RSA! 这是一个测试消息。')
const testBitLength = ref(512)

const loadKeyPairs = async () => {
  try {
    const response = await rsaApi.getKeyPairs(0, 50)
    keyPairs.value = response.data.key_pairs
  } catch (error) {
    console.error('加载密钥对失败：', error)
  }
}

const refreshKeyPairs = () => {
  loadKeyPairs()
  ElMessage.success('密钥列表已刷新')
}

const onKeyPairChange = () => {
  encryptedResult.value = null
}

const encryptWithSavedKey = async () => {
  if (!selectedKeyPair.value) {
    ElMessage.warning('请选择一个密钥对')
    return
  }
  
  if (!plainText.value) {
    ElMessage.warning('请输入要加密的消息')
    return
  }
  
  try {
    encrypting.value = true
    const response = await cryptoApi.encrypt({
      message: plainText.value,
      e: Number(selectedKeyPair.value.e),
      n: Number(BigInt(selectedKeyPair.value.n)),
      key_pair_id: selectedKeyPair.value.id
    })
    
    if (response.data.success) {
      encryptedResult.value = response.data
      ElMessage.success('加密成功！')
    } else {
      ElMessage.error(response.data.message)
    }
  } catch (error) {
    ElMessage.error('加密失败：' + error.message)
  } finally {
    encrypting.value = false
  }
}

const encryptWithManualKey = async () => {
  if (!manualE.value || !manualN.value) {
    ElMessage.warning('请输入公钥参数')
    return
  }
  
  if (!plainTextManual.value) {
    ElMessage.warning('请输入要加密的消息')
    return
  }
  
  try {
    encryptingManual.value = true
    const response = await cryptoApi.encrypt({
      message: plainTextManual.value,
      e: Number(manualE.value),
      n: Number(BigInt(manualN.value))
    })
    
    if (response.data.success) {
      encryptedResult.value = response.data
      ElMessage.success('加密成功！')
    } else {
      ElMessage.error(response.data.message)
    }
  } catch (error) {
    ElMessage.error('加密失败：' + error.message)
  } finally {
    encryptingManual.value = false
  }
}

const parseCipherNumbers = (text) => {
  if (!text) return []
  return text.trim().split(/[\s,]+/).filter(n => n).map(n => BigInt(n))
}

const decryptWithSavedKey = async () => {
  if (!selectedDecryptKeyPair.value) {
    ElMessage.warning('请选择一个密钥对')
    return
  }
  
  const cipherNumbers = parseCipherNumbers(cipherNumbersText.value)
  if (cipherNumbers.length === 0) {
    ElMessage.warning('请输入密文数字')
    return
  }
  
  try {
    decrypting.value = true
    const response = await cryptoApi.decrypt({
      cipher_numbers: cipherNumbers.map(n => Number(n)),
      d: Number(BigInt(selectedDecryptKeyPair.value.d)),
      n: Number(BigInt(selectedDecryptKeyPair.value.n)),
      key_pair_id: selectedDecryptKeyPair.value.id
    })
    
    if (response.data.success) {
      decryptedResult.value = response.data
      ElMessage.success('解密成功！')
    } else {
      ElMessage.error(response.data.message)
    }
  } catch (error) {
    ElMessage.error('解密失败：' + error.message)
  } finally {
    decrypting.value = false
  }
}

const decryptWithManualKey = async () => {
  if (!manualD.value || !manualND.value) {
    ElMessage.warning('请输入私钥参数')
    return
  }
  
  const cipherNumbers = parseCipherNumbers(cipherNumbersTextManual.value)
  if (cipherNumbers.length === 0) {
    ElMessage.warning('请输入密文数字')
    return
  }
  
  try {
    decryptingManual.value = true
    const response = await cryptoApi.decrypt({
      cipher_numbers: cipherNumbers.map(n => Number(n)),
      d: Number(BigInt(manualD.value)),
      n: Number(BigInt(manualND.value))
    })
    
    if (response.data.success) {
      decryptedResult.value = response.data
      ElMessage.success('解密成功！')
    } else {
      ElMessage.error(response.data.message)
    }
  } catch (error) {
    ElMessage.error('解密失败：' + error.message)
  } finally {
    decryptingManual.value = false
  }
}

const testEncryptionDecryption = async () => {
  if (!testMessage.value) {
    ElMessage.warning('请输入测试消息')
    return
  }
  
  try {
    testing.value = true
    const response = await cryptoApi.testEncryption(testMessage.value, testBitLength.value)
    testResult.value = response.data
    ElMessage.success(response.data.message)
  } catch (error) {
    ElMessage.error('测试失败：' + error.message)
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadKeyPairs()
})
</script>

<style scoped>
.crypto-view {
  max-width: 1400px;
  margin: 0 auto;
}

.cipher-display,
.plain-display {
  background: #f7fafc;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
  margin-top: 8px;
}

.encrypted-info,
.decrypted-info,
.test-details {
  line-height: 1.8;
}

.encrypted-info p,
.decrypted-info p,
.test-details p {
  margin: 4px 0;
}

.principle-content {
  line-height: 1.8;
}

.principle-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 12px;
  margin-top: 20px;
}

.principle-content h4:first-child {
  margin-top: 0;
}

.formula,
.proof {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.formula p,
.proof p {
  color: #4a5568;
  margin: 6px 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.95rem;
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
