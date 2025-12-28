import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as chromeModule from '../lib/chrome'
import * as localStorageModule from '../lib/local-storage'
import * as userscriptModule from '../lib/userscript'
import * as userscriptStringModule from '../lib/userscript-string'
import {
  mockChromeStorage,
  mockStorageData,
  mockListeners,
} from './chrome-mock'

vi.mock('@plasmohq/storage', async () => {
  const { mockChromeStorage } = await import('./chrome-mock')
  return {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    Storage: class {
      constructor() {
        // eslint-disable-next-line no-constructor-return
        return mockChromeStorage
      }
    },
  }
})

const modules = [
  { name: 'chrome', mod: chromeModule, type: 'chrome' },
  { name: 'local-storage', mod: localStorageModule, type: 'local-storage' },
  { name: 'userscript', mod: userscriptModule, type: 'userscript' },
  {
    name: 'userscript-string',
    mod: userscriptStringModule,
    type: 'userscript-string',
  },
]

describe('Storage Modules Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageData.clear()
    mockListeners.clear()
    localStorage.clear()

    // Setup Globals

    // Chrome
    globalThis.chrome = {
      storage: {
        local: {}, // Mocked via plasmohq
      },
    } as any

    // GM
    const gmStore = new Map()
    const gmListeners = new Map()
    let gmListenerId = 0

    ;(globalThis as any).GM = {
      getValue: vi.fn(async (key, def) =>
        gmStore.has(key) ? gmStore.get(key) : def
      ),
      setValue: vi.fn(async (key, val) => {
        const old = gmStore.get(key)
        gmStore.set(key, val)
        // Trigger listeners
        for (const [id, cb] of gmListeners) {
          cb(key, old, val, false)
        }
      }),
      deleteValue: vi.fn(async (key) => {
        const old = gmStore.get(key)
        gmStore.delete(key)
        for (const [id, cb] of gmListeners) {
          cb(key, old, undefined, false)
        }
      }),
      listValues: vi.fn(async () => Array.from(gmStore.keys())),
      addValueChangeListener: vi.fn((key, cb) => {
        const id = ++gmListenerId
        gmListeners.set(id, cb)
        return id
      }),
      removeValueChangeListener: vi.fn((id) => {
        gmListeners.delete(id)
      }),
      xmlHttpRequest: vi.fn(),
      setClipboard: vi.fn(),
      openInTab: vi.fn(),
      addStyle: vi.fn(),
      registerMenuCommand: vi.fn(),
      unregisterMenuCommand: vi.fn(),
    } as any

    if (!globalThis.BroadcastChannel) {
      globalThis.BroadcastChannel = class {
        name: string
        constructor(name) {
          this.name = name
        }

        postMessage() {}
        addEventListener() {}
        removeEventListener() {}
        close() {}
      } as any
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe.each(modules)('Module: $name', ({ name, mod }) => {
    it('should set and get a string value', async () => {
      await mod.setValue('test-key', 'test-value')
      const value = await mod.getValue('test-key')
      expect(value).toBe('test-value')
    })

    it('should return undefined for non-existent key', async () => {
      const value = await mod.getValue('non-existent')
      expect(value).toBeUndefined()
    })

    it('should return default value if key does not exist', async () => {
      const value = await mod.getValue('non-existent', 'default')
      expect(value).toBe('default')
    })

    it('should set and get an object value', async () => {
      const obj = { foo: 'bar', num: 123 }
      await mod.setValue('obj-key', obj)
      const value = await mod.getValue('obj-key')
      expect(value).toEqual(obj)
    })

    it('should set and get a number value', async () => {
      await mod.setValue('num-key', 12_345)
      const value = await mod.getValue('num-key')
      expect(value).toBe(12_345)
    })

    it('should set and get a boolean value', async () => {
      await mod.setValue('bool-key', true)
      const value = await mod.getValue('bool-key')
      expect(value).toBe(true)

      await mod.setValue('bool-key-false', false)
      const valueFalse = await mod.getValue('bool-key-false')
      expect(valueFalse).toBe(false)
    })

    it('should set and get a null value', async () => {
      await mod.setValue('null-key', null)
      const value = await mod.getValue('null-key')
      expect(value).toBeNull()
    })

    it('should set and get an array value', async () => {
      const arr = [1, 'two', { three: 3 }, null]
      await mod.setValue('arr-key', arr)
      const value = await mod.getValue('arr-key')
      expect(value).toEqual(arr)
    })

    it('should delete a value', async () => {
      await mod.setValue('del-key', 'val')
      expect(await mod.getValue('del-key')).toBe('val')
      await mod.deleteValue('del-key')
      expect(await mod.getValue('del-key')).toBeUndefined()
    })

    it('should trigger value change listener', async () => {
      const callback = vi.fn()
      await mod.addValueChangeListener('watch-key', callback)

      await mod.setValue('watch-key', 'new-val')

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100)
      })

      expect(callback).toHaveBeenCalled()
      const call = callback.mock.calls[0]
      expect(call[0]).toBe('watch-key')
      expect(call[2]).toBe('new-val')
    })
  })
})
