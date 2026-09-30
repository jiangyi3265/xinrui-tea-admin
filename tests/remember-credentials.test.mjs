import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

const saved = new Map()
const storage = {getItem:k=>saved.get(k) ?? null,setItem:(k,v)=>saved.set(k,v)}
globalThis.window = {crypto:webcrypto,localStorage:storage}
const { encrypt, decrypt } = await import('../src/utils/jsencrypt.js')

test('remembered password round trips with a generated per-browser key, never plaintext',()=>{
  saved.clear()
  const value='isolated-test-value'
  const ciphertext=encrypt(value)
  assert.ok(ciphertext)
  assert.notEqual(ciphertext,value)
  assert.equal(decrypt(ciphertext),value)
  assert.equal([...saved.values()].some(x=>x.includes(value)),false)
  const first=saved.get('ruoyi.remember.key.v1')
  assert.equal(decrypt(encrypt('another-test-value')),'another-test-value')
  assert.equal(saved.get('ruoyi.remember.key.v1'),first)
})

test('a different browser and legacy cookies do not reuse the previous private key',()=>{
  const ciphertext=encrypt('isolated-test-value')
  saved.clear()
  assert.equal(decrypt(ciphertext),'')
  assert.equal(decrypt('old-cookie-without-key'),'')
  assert.ok(encrypt('new-local-value'))
  assert.equal(decrypt(ciphertext),'')
})

test('unavailable storage and expired key never fall back to plaintext',()=>{
  saved.clear()
  const ciphertext=encrypt('isolated-test-value')
  const record=JSON.parse(saved.get('ruoyi.remember.key.v1'))
  record.expires=Date.now()-1
  saved.set('ruoyi.remember.key.v1',JSON.stringify(record))
  assert.equal(decrypt(ciphertext),'')
  window.localStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}
  assert.equal(encrypt('isolated-test-value'),'')
  assert.equal(decrypt(ciphertext),'')
  window.localStorage=storage
})
