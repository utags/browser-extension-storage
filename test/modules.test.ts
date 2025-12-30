import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { wait } from '../lib/test-utils'
import { runStorageTests } from '../lib/test'
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

let triggerGmListener: (
  key: string,
  oldVal: any,
  newVal: any,
  remote: boolean
) => void

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

    triggerGmListener = (key, oldVal, newVal, remote) => {
      for (const [id, cb] of gmListeners) {
        cb(key, oldVal, newVal, remote)
      }
    }

    ;(globalThis as any).GM = {
      getValue: vi.fn(async (key, def) =>
        gmStore.has(key) ? gmStore.get(key) : def
      ),
      setValue: vi.fn(async (key, val) => {
        const old = gmStore.get(key)
        if (old === val) return
        gmStore.set(key, val)
        // Trigger listeners
        for (const [id, cb] of gmListeners) {
          cb(key, old, val, false)
        }
      }),
      deleteValue: vi.fn(async (key) => {
        const old = gmStore.get(key)
        if (old === undefined) return
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
    if (name.startsWith('userscript')) {
      it('should allow disabling polling', async () => {
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
        const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

        const originalGM = (globalThis as any).GM
        ;(globalThis as any).GM = {
          ...originalGM,
          addValueChangeListener: undefined,
        }

        const cb = vi.fn()
        await (mod as any).setPolling(true)
        const id = await mod.addValueChangeListener('poll-key', cb)
        expect(setIntervalSpy).toHaveBeenCalled()
        await (mod as any).setPolling(false)
        expect(clearIntervalSpy).toHaveBeenCalled()
        await (mod as any).setPolling(true)
        expect(setIntervalSpy).toHaveBeenCalledTimes(2)
        await (mod as any).removeValueChangeListener(id)
        ;(globalThis as any).GM = originalGM
        await (mod as any).setPolling(true)
      })
    }

    void runStorageTests(
      {
        getValue: mod.getValue,
        setValue: mod.setValue,
        deleteValue: mod.deleteValue,
        addValueChangeListener: mod.addValueChangeListener,
        removeValueChangeListener:
          (mod as any).removeValueChangeListener ??
          (async () => {
            /* no-op for adapters not supporting removal */
          }),
      },
      console.log,
      { it, expect }
    )
  })
})
