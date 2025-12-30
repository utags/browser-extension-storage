import { vi } from 'vitest'

export const mockStorageData = new Map<string, any>()
export const mockListeners = new Set<(...args: any[]) => void>()
const watchMap = new Map<any, any>()

export const triggerListeners = (
  key: string,
  oldValue: any,
  newValue: any,
  source: string
) => {
  for (const l of mockListeners) {
    l(key, oldValue, newValue)
  }
}

export const mockChromeStorage = {
  get: vi.fn(async (key) => {
    const val = mockStorageData.get(key)
    // eslint-disable-next-line unicorn/prefer-structured-clone
    return val ? JSON.parse(JSON.stringify(val)) : val
  }),
  set: vi.fn(async (key, value) => {
    const oldValue = mockStorageData.get(key)
    const storedValue =
      // eslint-disable-next-line unicorn/prefer-structured-clone
      value === undefined ? undefined : JSON.parse(JSON.stringify(value))
    mockStorageData.set(key, storedValue)
    triggerListeners(key, oldValue, storedValue, 'chrome')
  }),
  remove: vi.fn(async (key) => {
    const oldValue = mockStorageData.get(key)
    mockStorageData.delete(key)
    triggerListeners(key, oldValue, undefined, 'chrome')
  }),
  getAll: vi.fn(async () => Object.fromEntries(mockStorageData)),
  watch: vi.fn((callbackMap) => {
    const listener = (key: string, oldValue: any, newValue: any) => {
      if (callbackMap[key]) {
        callbackMap[key]({ oldValue, newValue })
      }
    }

    watchMap.set(callbackMap, listener)
    mockListeners.add(listener)
  }),
  unwatch: vi.fn((callbackMap) => {
    const listener = watchMap.get(callbackMap)
    if (listener) {
      mockListeners.delete(listener)
      watchMap.delete(callbackMap)
    }
  }),
}
