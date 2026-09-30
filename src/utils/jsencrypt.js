import JSEncrypt from 'jsencrypt'

// Remembered credentials are a convenience on a trusted device, not a security
// boundary against XSS or someone who controls that browser. Never ship a shared
// private key. Each browser generates its own key only when remembering a login.
const storageKey = 'ruoyi.remember.key.v1'
const lifetime = 30 * 24 * 60 * 60 * 1000

function browserKey(create) {
  try {
    const storage = window.localStorage
    const saved = JSON.parse(storage.getItem(storageKey) || 'null')
    if (saved && saved.expires > Date.now() && typeof saved.key === 'string') {
      const cipher = new JSEncrypt()
      cipher.setPrivateKey(saved.key)
      if (cipher.getKey()?.d) return cipher
    }
    if (!create || !window.crypto?.getRandomValues) return null
    const cipher = new JSEncrypt({ default_key_size: '2048' })
    const key = cipher.getPrivateKey()
    storage.setItem(storageKey, JSON.stringify({ key, expires: Date.now() + lifetime }))
    return cipher
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
    // Do not save plaintext as a fallback, and do not prevent normal login.
    return null
  }
}

export function encrypt(text) {
  return browserKey(true)?.encrypt(text) || ''
}

export function decrypt(text) {
  // Old cookies encrypted with the removed shared key require one fresh login.
  return browserKey(false)?.decrypt(text) || ''
}

