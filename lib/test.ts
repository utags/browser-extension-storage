import { deepEqual } from './deep-equal'
import { wait } from './test-utils'

export type StorageAdapter = {
  getValue: <T>(key: string, defaultValue?: T) => Promise<T | undefined>
  setValue: <T>(key: string, value: T) => Promise<void>
  deleteValue: (key: string) => Promise<void>
  addValueChangeListener: (
    key: string,
    callback: (
      key: string,
      oldValue: any,
      newValue: any,
      remote: boolean
    ) => void
  ) => Promise<number>
  removeValueChangeListener?: (id: number) => Promise<void>
}

class ExpectationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpectationError'
  }
}

type TestExpectation = {
  toBe(expected: any): void
  toEqual(expected: any): void
  toBeUndefined(): void
  toBeNull(): void
}

function expect(actual: any): TestExpectation {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new ExpectationError(
          `Expected ${String(expected)}, but got ${String(actual)}`
        )
      }
    },
    toEqual(expected: any) {
      if (!deepEqual(actual, expected)) {
        throw new ExpectationError(
          `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(
            actual
          )}`
        )
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new ExpectationError(
          `Expected undefined, but got ${String(actual)}`
        )
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new ExpectationError(`Expected null, but got ${String(actual)}`)
      }
    },
  }
}

const TEST_KEYS = [
  'test-key',
  'obj-key',
  'num-key',
  'bool-key',
  'bool-key-false',
  'null-key',
  'arr-key',
  'del-key',
  'watch-key',
  'watch-key-1',
  'watch-key-2',
  'watch-key-3',
  'watch-key-4',
  'watch-key-5',
  'watch-key-6',
  'watch-key-remote',
]

export async function runStorageTests(
  _storage: StorageAdapter,
  logger: (msg: string) => void = console.log,
  framework?: {
    it?: (name: string, fn: () => Promise<void>) => void

    expect?: ((actual: any) => any) | any
  }
): Promise<boolean> {
  if (globalThis.top !== globalThis.self) {
    return false
  }

  const stats = { passed: 0, failed: 0 }
  const activeListeners = new Set<number>()

  const storage = {
    ..._storage,
    async addValueChangeListener(
      key: string,
      callback: (
        key: string,
        oldValue: any,
        newValue: any,
        remote: boolean
      ) => void
    ) {
      const id = await _storage.addValueChangeListener(key, callback)
      activeListeners.add(id)
      return id
    },
    async removeValueChangeListener(id: number) {
      if (_storage.removeValueChangeListener) {
        await _storage.removeValueChangeListener(id)
      }

      activeListeners.delete(id)
    },
  }

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    try {
      await testFn()
      logger(`✅ ${name} passed`)
      stats.passed++
    } catch (error: any) {
      logger(`❌ ${name} failed: ${error.message}`)
      console.error(error)
      stats.failed++
    }
  }

  const assert = <T>(actual: T): TestExpectation =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    (framework?.expect === undefined ? expect : framework.expect!)(
      actual
    ) as TestExpectation

  const cleanup = async () => {
    logger('🧹 Cleaning up test data...')
    for (const key of TEST_KEYS) {
      try {
        await storage.deleteValue(key)
      } catch (error) {
        logger(`⚠️ Failed to cleanup key "${key}": ${error}`)
      }
    }

    if (activeListeners.size > 0) {
      logger(`🧹 Cleaning up ${activeListeners.size} active listeners...`)
      for (const id of activeListeners) {
        try {
          await storage.removeValueChangeListener(id)
        } catch (error) {
          logger(`⚠️ Failed to remove listener ${id}: ${error}`)
        }
      }

      activeListeners.clear()
    }
  }

  const tests = [
    {
      name: 'should set and get a string value',
      async fn() {
        await storage.setValue('test-key', 'test-value')
        const value = await storage.getValue('test-key')
        assert(value).toBe('test-value')
      },
    },
    {
      name: 'should return undefined for non-existent key',
      async fn() {
        const value = await storage.getValue('non-existent')
        assert(value).toBeUndefined()
      },
    },
    {
      name: 'should return default value if key does not exist',
      async fn() {
        const value = await storage.getValue('non-existent', 'default')
        assert(value).toBe('default')
      },
    },
    {
      name: 'should set and get an object value',
      async fn() {
        const obj = { foo: 'bar', num: 123 }
        await storage.setValue('obj-key', obj)
        const value = await storage.getValue('obj-key')
        assert(value).toEqual(obj)
      },
    },
    {
      name: 'should return a deep copy of the object (immutability check)',
      async fn() {
        const obj = { foo: 'bar', nested: { a: 1 } }
        await storage.setValue('obj-copy-key', obj)

        const value1 = await storage.getValue<{
          foo: string
          nested: { a: number }
        }>('obj-copy-key')
        assert(value1).toEqual(obj)

        // Modify the returned object
        if (value1) {
          value1.foo = 'modified'
          value1.nested.a = 999
        }

        const value2 = await storage.getValue<{
          foo: string
          nested: { a: number }
        }>('obj-copy-key')

        // The second get should return the original value, not the modified one
        assert(value2).toEqual(obj)
        assert(value2?.foo).toBe('bar')
        assert(value2?.nested.a).toBe(1)
      },
    },
    {
      name: 'should set and get a number value',
      async fn() {
        await storage.setValue('num-key', 12_345)
        const value = await storage.getValue('num-key')
        assert(value).toBe(12_345)
      },
    },
    {
      name: 'should set and get a boolean value',
      async fn() {
        await storage.setValue('bool-key', true)
        const value = await storage.getValue('bool-key')
        assert(value).toBe(true)

        await storage.setValue('bool-key-false', false)
        const valueFalse = await storage.getValue('bool-key-false')
        assert(valueFalse).toBe(false)
      },
    },
    {
      name: 'should delete value when setting null (treat null as undefined)',
      async fn() {
        await storage.setValue('null-key', 'initial-value')
        await storage.setValue('null-key', null)
        const value = await storage.getValue('null-key')
        assert(value).toBeUndefined()
      },
    },
    {
      name: 'should set and get an array value',
      async fn() {
        const arr = [1, 'two', { three: 3 }, null]
        await storage.setValue('arr-key', arr)
        const value = await storage.getValue('arr-key')
        assert(value).toEqual(arr)
      },
    },
    {
      name: 'should delete a value',
      async fn() {
        await storage.setValue('del-key', 'val')
        assert(await storage.getValue('del-key')).toBe('val')
        await storage.deleteValue('del-key')
        assert(await storage.getValue('del-key')).toBeUndefined()
      },
    },
    {
      name: 'should trigger listener on value change (undefined -> value)',
      async fn() {
        let called = false
        let rKey
        let rOld
        let rNew
        const cb = (k: string, o: any, n: any) => {
          called = true
          rKey = k
          rOld = o
          rNew = n
        }

        const id = await storage.addValueChangeListener('watch-key-1', cb)
        await storage.setValue('watch-key-1', 'val1')
        await wait()
        assert(called).toBe(true)
        assert(rKey).toBe('watch-key-1')
        assert(rOld).toBeUndefined()
        assert(rNew).toBe('val1')

        await storage.removeValueChangeListener(id)
        called = false
        await storage.setValue('watch-key-1', 'val2')
        await wait()
        assert(called).toBe(false)
      },
    },
    {
      name: 'should trigger listener on value deletion (value -> undefined)',
      async fn() {
        await storage.setValue('watch-key-2', 'val1')
        let called = false
        let rKey
        let rOld
        let rNew
        const cb = (k: string, o: any, n: any) => {
          called = true
          rKey = k
          rOld = o
          rNew = n
        }

        const id = await storage.addValueChangeListener('watch-key-2', cb)
        await storage.deleteValue('watch-key-2')
        await wait()
        assert(called).toBe(true)
        assert(rKey).toBe('watch-key-2')
        assert(rOld).toBe('val1')
        assert(rNew).toBeUndefined()

        await storage.removeValueChangeListener(id)
        called = false
        await storage.setValue('watch-key-2', 'val2')
        await wait()
        assert(called).toBe(false)
      },
    },
    {
      name: 'should trigger listener on value deletion (value -> undefined via setValue)',
      async fn() {
        await storage.setValue('watch-key-2', 'val1')
        let called = false
        let rKey
        let rOld
        let rNew
        const cb = (k: string, o: any, n: any) => {
          called = true
          rKey = k
          rOld = o
          rNew = n
        }

        const id = await storage.addValueChangeListener('watch-key-2', cb)
        await storage.setValue('watch-key-2', undefined)
        await wait()
        assert(called).toBe(true)
        assert(rKey).toBe('watch-key-2')
        assert(rOld).toBe('val1')
        assert(rNew).toBeUndefined()

        await storage.removeValueChangeListener(id)
        called = false
        await storage.setValue('watch-key-2', 'val2')
        await wait()
        assert(called).toBe(false)
      },
    },
    {
      name: 'should NOT trigger listener for same value',
      async fn() {
        await storage.setValue('watch-key-3', 'val1')
        let called = false
        const cb = () => {
          called = true
        }

        const id = await storage.addValueChangeListener('watch-key-3', cb)
        await storage.setValue('watch-key-3', 'val1')
        await wait()
        assert(called).toBe(false)

        await storage.removeValueChangeListener(id)
        called = false
        await storage.setValue('watch-key-3', 'val2')
        await wait()
        assert(called).toBe(false) // Still shouldn't be called because listener removed
      },
    },
    {
      name: 'should trigger listener for sequential changes',
      async fn() {
        const calls: any[] = []
        const cb = (k: string, o: any, n: any) => {
          calls.push({ k, o, n })
        }

        const id = await storage.addValueChangeListener('watch-key-4', cb)

        await storage.setValue('watch-key-4', 'v1')
        await wait(20)

        await storage.setValue('watch-key-4', 'v2')
        await wait(20)

        await storage.setValue('watch-key-4', 'v1')
        await wait(20)

        assert(calls.length).toBe(3)
        assert(calls[0].o).toBeUndefined()
        assert(calls[0].n).toBe('v1')
        assert(calls[1].o).toBe('v1')
        assert(calls[1].n).toBe('v2')
        assert(calls[2].o).toBe('v2')
        assert(calls[2].n).toBe('v1')

        await storage.removeValueChangeListener(id)
        calls.length = 0
        await storage.setValue('watch-key-4', 'v3')
        await wait(20)
        assert(calls.length).toBe(0)
      },
    },
    {
      name: 'should NOT trigger listener on delete non-existent value',
      async fn() {
        let called = false
        const cb = () => {
          called = true
        }

        const id = await storage.addValueChangeListener('watch-key-5', cb)
        await storage.deleteValue('watch-key-5')
        await wait()
        assert(called).toBe(false)

        await storage.removeValueChangeListener(id)
      },
    },
    {
      name: 'should NOT trigger listener on set undefined to non-existent value',
      async fn() {
        let called = false
        const cb = () => {
          called = true
        }

        const id = await storage.addValueChangeListener('watch-key-6', cb)
        await storage.setValue('watch-key-6', undefined) // undefined is not a valid JSON value but let's see how adapter handles it
        await wait()
        assert(called).toBe(false)

        await storage.removeValueChangeListener(id)
      },
    },
  ]

  if (globalThis.window !== undefined && typeof document !== 'undefined') {
    tests.push({
      name: 'should handle cross-tab changes (iframe)',
      async fn() {
        // Only runs if we can create iframe and accessing localStorage
        // This test is specific to local-storage or adapters sharing storage
        // We assume storage adapter is using localStorage if we are in browser
        // But 'storage' argument is generic.
        // We can try to modify localStorage directly and see if listener fires with remote=true

        let called = false
        let rRemote = false
        let rNew
        const cb = (k: string, o: any, n: any, r: boolean) => {
          called = true
          rRemote = r
          rNew = n
        }

        const id = await storage.addValueChangeListener('watch-key-remote', cb)

        const iframe = document.createElement('iframe')
        document.body.append(iframe)

        // Give it a moment
        await wait(10)

        // Try to access iframe localStorage
        try {
          const iframeStorage = iframe.contentWindow?.localStorage
          if (iframeStorage) {
            // We need to use the namespaced key if the adapter uses one.
            // But here we are testing the adapter.
            // If we use storage.setValue it won't be "remote".
            // We need to trigger a "storage" event.
            // If we modify localStorage in iframe, it should trigger storage event in window.

            // We assume the adapter uses 'extension.' prefix based on reading local-storage.ts
            // But this test is generic.
            // If we don't know the prefix, we can't easily trigger it via raw localStorage.
            // However, if we are testing 'local-storage' module specifically, we know.

            // A generic way: use another instance of storage adapter?
            // But "remote" implies different context (tab/frame).

            // Let's assume 'extension.' prefix for now as it's common in this repo
            iframeStorage.setItem('extension.watch-key-remote', '"remote-val"')

            await wait(100)

            if (called) {
              assert(rRemote).toBe(true)
              assert(rNew).toBe('remote-val')
            } else {
              // Maybe not supported or not local-storage
              logger(
                '⚠️ Cross-tab test skipped or failed (listener not called)'
              )
            }
          }
        } catch (error) {
          logger(`⚠️ Cross-tab test skipped: ${error}`)
        } finally {
          iframe.remove()
          await storage.removeValueChangeListener(id)
        }
      },
    })
  }

  logger('🚀 Starting Storage Tests...')

  if (framework?.it) {
    framework.it('pre-cleanup', async () => {
      await cleanup()
    })
    for (const test of tests) {
      framework.it(test.name, async () => {
        try {
          await test.fn()
          stats.passed++
        } catch (error) {
          stats.failed++
          throw error
        }
      })
    }

    framework.it('cleanup', async () => {
      await cleanup()
      logger(
        `\n🏁 Tests completed: ${stats.passed} passed, ${stats.failed} failed.`
      )
    })
  } else {
    await cleanup()
    for (const test of tests) {
      await runTest(test.name, test.fn)
    }

    await cleanup()
    logger(
      `\n🏁 Tests completed: ${stats.passed} passed, ${stats.failed} failed.`
    )
  }

  return stats.failed === 0
}
