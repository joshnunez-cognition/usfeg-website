import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildHostedCheckoutUrl,
  buildMockGatewayResult,
  buildRefundPost,
  createTpsHash,
  sandboxApproves,
  verifyBpStamp,
} from '../src/server/bluepay'

describe('BluePay seals', () => {
  it('matches the published bp10emu MD5 vector', () => {
    // Secret + MERCHANT + TRANSACTION_TYPE + AMOUNT, from the bp10emu spec example.
    assert.equal(createTpsHash('raouhc.jbefiougb', 'demoSALE10.00', 'MD5'), '9515409f78817e9da5ee396fb24fea7d')
  })

  it('builds a hosted form URL and never puts a card number on it', () => {
    const url = buildHostedCheckoutUrl({
      accountId: '123412341234',
      secretKey: 'test-secret-key',
      hashType: 'MD5',
      shpfHashType: 'MD5',
      mode: 'TEST',
      amount: '495.00',
      returnUrl: 'https://members.usfeg.org/api/payments/bluepay/return',
      customId: 'abc123abc123',
      customId2: 'dues_signup',
      rebilling: true,
      rebFirstDate: '1 YEAR',
      rebExpr: '1 YEAR',
      rebAmount: '495.00',
    })
    assert.ok(url.startsWith('https://secure.bluepay.com/interfaces/shpf?'))
    assert.equal(url.includes('CC_NUM'), false)
    assert.equal(url.includes('CVV'), false)
    // The official PHP encoder percent-encodes everything outside A–Z a–z 0–9, including "_" and ".".
    assert.ok(url.includes('AMOUNT=495%2E00'))
    assert.ok(url.includes('MODE=TEST'))
    assert.ok(url.includes('REBILLING=1'))
    assert.ok(url.includes('CUSTOM%5FID=abc123abc123'))
    const seal = new URL(url).searchParams.get('TAMPER_PROOF_SEAL')
    assert.ok(seal && /^[a-f0-9]{32}$/.test(seal))
  })

  it('rejects a response whose stamp was flipped', () => {
    const fields = buildMockGatewayResult({
      secretKey: 'test-secret-key',
      hashType: 'MD5',
      accountId: '123412341234',
      amount: '495.00',
      customId: 'abc123abc123',
      transId: 'trans1234',
      rebilling: true,
    })
    assert.equal(verifyBpStamp('test-secret-key', fields, 'MD5'), true)
    fields.AMOUNT = '1.00'
    assert.equal(verifyBpStamp('test-secret-key', fields, 'MD5'), false)
    assert.equal(sandboxApproves('495.00'), true)
    assert.equal(sandboxApproves('100.00'), false)
  })

  it('seals a refund without card data', () => {
    const post = buildRefundPost({
      accountId: '123412341234',
      secretKey: 'test-secret-key',
      hashType: 'MD5',
      mode: 'TEST',
      rrno: 'trans1234',
      amount: '495.00',
    })
    assert.equal(post.url, 'https://secure.bluepay.com/interfaces/bp10emu')
    assert.equal('CC_NUM' in post.fields, false)
    assert.equal(post.fields.TRANSACTION_TYPE, 'REFUND')
    assert.equal(post.fields.RRNO, 'trans1234')
  })
})
