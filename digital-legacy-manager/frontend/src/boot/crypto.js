import { boot } from 'quasar/wrappers'
import sodium from 'libsodium-wrappers'

let sodiumReady = false

async function ensureSodiumReady() {
  if (!sodiumReady) {
    await sodium.ready
    sodiumReady = true
  }
}

const cryptoUtils = {
  ensureReady: ensureSodiumReady,

  secureWipe(array) {
    if (array instanceof Uint8Array) {
      sodium.memzero(array)
    }
  },

  toBase64(bytes) {
    return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL)
  },

  fromBase64(str) {
    return sodium.from_base64(str, sodium.base64_variants.ORIGINAL)
  },

  randomBytes(length) {
    return sodium.randombytes_buf(length)
  },

  async deriveKeyFromPassword(password, salt = null) {
    await ensureSodiumReady()
    
    const actualSalt = salt || sodium.randombytes_buf(16)
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_SENSITIVE
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_SENSITIVE
    const algorithm = sodium.crypto_pwhash_ALG_ARGON2ID13
    
    const key = sodium.crypto_pwhash(
      32,
      password,
      actualSalt,
      opsLimit,
      memLimit,
      algorithm
    )
    
    return {
      key,
      salt: actualSalt
    }
  },

  async encrypt(data, key) {
    await ensureSodiumReady()
    
    const nonce = sodium.randombytes_buf(24)
    const additionalData = new Uint8Array(0)
    
    const ciphertextAndTag = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      typeof data === 'string' ? sodium.from_string(data) : data,
      additionalData,
      null,
      nonce,
      key
    )
    
    const tag = ciphertextAndTag.slice(ciphertextAndTag.length - 16)
    const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - 16)
    
    return {
      ciphertext,
      nonce,
      tag
    }
  },

  async decrypt(encrypted, key) {
    await ensureSodiumReady()
    
    const { ciphertext, nonce, tag } = encrypted
    const additionalData = new Uint8Array(0)
    
    const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length)
    ciphertextWithTag.set(ciphertext, 0)
    ciphertextWithTag.set(tag, ciphertext.length)
    
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertextWithTag,
      additionalData,
      null,
      nonce,
      key
    )
    
    return sodium.to_string(plaintext)
  }
}

export default boot(({ app }) => {
  app.config.globalProperties.$crypto = cryptoUtils
})

export { cryptoUtils }
