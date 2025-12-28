import { deepEqual } from './deep-equal'

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
  ) => Promise<any>
}

class ExpectationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpectationError'
  }
}

function expect(actual: any) {
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
]

export async function runStorageTests(
  storage: StorageAdapter,
  logger: (msg: string) => void = console.log
): Promise<boolean> {
  let passedCount = 0
  let failedCount = 0

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    try {
      await testFn()
      logger(`✅ ${name} passed`)
      passedCount++
    } catch (error: any) {
      logger(`❌ ${name} failed: ${error.message}`)
      console.error(error)
      failedCount++
    }
  }

  const cleanup = async () => {
    logger('🧹 Cleaning up test data...')
    for (const key of TEST_KEYS) {
      try {
        await storage.deleteValue(key)
      } catch (error) {
        logger(`⚠️ Failed to cleanup key "${key}": ${error}`)
      }
    }
  }

  logger('🚀 Starting Storage Tests...')

  await cleanup()

  await runTest('should set and get a string value', async () => {
    await storage.setValue('test-key', 'test-value')
    const value = await storage.getValue('test-key')
    expect(value).toBe('test-value')
  })

  await runTest('should return undefined for non-existent key', async () => {
    const value = await storage.getValue('non-existent')
    expect(value).toBeUndefined()
  })

  await runTest(
    'should return default value if key does not exist',
    async () => {
      const value = await storage.getValue('non-existent', 'default')
      expect(value).toBe('default')
    }
  )

  await runTest('should set and get an object value', async () => {
    const obj = { foo: 'bar', num: 123 }
    await storage.setValue('obj-key', obj)
    const value = await storage.getValue('obj-key')
    expect(value).toEqual(obj)
  })

  await runTest('should set and get a number value', async () => {
    await storage.setValue('num-key', 12_345)
    const value = await storage.getValue('num-key')
    expect(value).toBe(12_345)
  })

  await runTest('should set and get a boolean value', async () => {
    await storage.setValue('bool-key', true)
    const value = await storage.getValue('bool-key')
    expect(value).toBe(true)

    await storage.setValue('bool-key-false', false)
    const valueFalse = await storage.getValue('bool-key-false')
    expect(valueFalse).toBe(false)
  })

  await runTest('should set and get a null value', async () => {
    await storage.setValue('null-key', null)
    const value = await storage.getValue('null-key')
    expect(value).toBeNull()
  })

  await runTest('should set and get an array value', async () => {
    const arr = [1, 'two', { three: 3 }, null]
    await storage.setValue('arr-key', arr)
    const value = await storage.getValue('arr-key')
    expect(value).toEqual(arr)
  })

  await runTest('should delete a value', async () => {
    await storage.setValue('del-key', 'val')
    expect(await storage.getValue('del-key')).toBe('val')
    await storage.deleteValue('del-key')
    expect(await storage.getValue('del-key')).toBeUndefined()
  })

  await runTest('should trigger value change listener', async () => {
    let called = false
    let receivedKey
    let receivedNew

    const callback = (key: string, _oldVal: any, newVal: any) => {
      called = true
      receivedKey = key
      receivedNew = newVal
    }

    await storage.addValueChangeListener('watch-key', callback)

    await storage.setValue('watch-key', 'new-val')

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100)
    })

    expect(called).toBe(true)
    expect(receivedKey).toBe('watch-key')
    expect(receivedNew).toBe('new-val')
  })

  await cleanup()

  logger(`\n🏁 Tests completed: ${passedCount} passed, ${failedCount} failed.`)
  return failedCount === 0
}
