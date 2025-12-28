import { vi } from 'vitest'

export const mockStorageData = new Map<string, any>()
export const mockListeners = new Set<(...args: any[]) => void>()

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
    return val
  }),
  set: vi.fn(async (key, value) => {
    const oldValue = mockStorageData.get(key)
    mockStorageData.set(key, value)
    triggerListeners(key, oldValue, value, 'chrome')
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

    mockListeners.add(listener)
  }),
  unwatch: vi.fn(() => {
    // Simplification for mock
  }),
}
