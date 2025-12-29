import { deepEqual } from './deep-equal'

export { runStorageTests } from './test.js'

const valueChangeListeners = new Map<
  number,
  {
    key: string
    callback: (
      key: string,
      oldValue: any,
      newValue: any,
      remote: boolean
    ) => void
  }
>()
let valueChangeListenerIdCounter = 0
const valueChangeBroadcastChannel = new BroadcastChannel(
  'gm_value_change_channel'
)
const lastKnownValues = new Map<string, unknown>()
let pollingIntervalId: any = null

function startPolling() {
  if (pollingIntervalId || isNativeListenerSupported()) return
  pollingIntervalId = setInterval(async () => {
    const keys = new Set(
      Array.from(valueChangeListeners.values()).map((l) => l.key)
    )
    for (const key of keys) {
      const newValue = await getValue(key)
      if (!lastKnownValues.has(key)) {
        lastKnownValues.set(key, newValue)
        continue
      }

      const oldValue = lastKnownValues.get(key)
      if (!deepEqual(oldValue, newValue)) {
        lastKnownValues.set(key, newValue)
        triggerValueChangeListeners(key, oldValue, newValue, true)
        valueChangeBroadcastChannel.postMessage({ key, oldValue, newValue })
      }
    }
  }, 1500)
}

const getScriptHandler = () => {
  if (typeof GM !== 'undefined' && (GM as any).info) {
    return ((GM as any).info.scriptHandler || '') as string
  }

  return ''
}

export const scriptHandler = getScriptHandler().toLowerCase()
const isIgnoredHandler =
  scriptHandler === 'tamp' || scriptHandler.includes('stay')

const isNativeListenerSupported = () =>
  !isIgnoredHandler &&
  typeof GM !== 'undefined' &&
  typeof GM.addValueChangeListener === 'function'

function triggerValueChangeListeners(
  key: string,
  oldValue: unknown,
  newValue: unknown,
  remote: boolean
) {
  const list = Array.from(valueChangeListeners.values()).filter(
    (l) => l.key === key
  )
  for (const l of list) {
    l.callback(key, oldValue, newValue, remote)
  }
}

valueChangeBroadcastChannel.addEventListener('message', (event) => {
  const { key, oldValue, newValue } = event.data
  lastKnownValues.set(key, newValue)
  triggerValueChangeListeners(key, oldValue, newValue, true)
})

export async function getValue<T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') {
    try {
      return await GM.getValue<T>(key, defaultValue as T)
    } catch (error) {
      console.warn('GM.getValue failed', error)
    }
  }

  return defaultValue
}

async function updateValue(
  key: string,
  newValue: unknown,
  updater: () => void | Promise<void>
) {
  let oldValue: unknown
  if (!isNativeListenerSupported()) {
    oldValue = await getValue(key)
  }

  await updater()

  if (!isNativeListenerSupported()) {
    if (deepEqual(oldValue, newValue)) {
      return
    }

    lastKnownValues.set(key, newValue)
    triggerValueChangeListeners(key, oldValue, newValue, false)

    valueChangeBroadcastChannel.postMessage({ key, oldValue, newValue })
  }
}

export async function setValue(key: string, value: unknown): Promise<void> {
  await updateValue(key, value, async () => {
    if (typeof GM !== 'undefined') {
      // Stay (Safari, Chrome): GM.setValue does not support saving undefined and null values.
      // Reading will error...
      if (value === undefined || value === null) {
        if (typeof GM.deleteValue === 'function') {
          await GM.deleteValue(key)
        }
      } else if (typeof GM.setValue === 'function') {
        await GM.setValue(key, value)
      }
    }
  })
}

export async function deleteValue(key: string): Promise<void> {
  await updateValue(key, undefined, async () => {
    if (typeof GM !== 'undefined' && typeof GM.deleteValue === 'function') {
      await GM.deleteValue(key)
    }
  })
}

export async function addValueChangeListener(
  key: string,
  callback: (
    key: string,
    oldValue: unknown,
    newValue: unknown,
    remote: boolean
  ) => void
): Promise<number> {
  if (
    isNativeListenerSupported() &&
    typeof GM !== 'undefined' &&
    typeof GM.addValueChangeListener === 'function'
  ) {
    return GM.addValueChangeListener(key, callback)
  }

  const id = ++valueChangeListenerIdCounter
  valueChangeListeners.set(id, { key, callback })
  if (!lastKnownValues.has(key)) {
    // eslint-disable-next-line promise/prefer-await-to-then
    void getValue(key).then((v) => {
      lastKnownValues.set(key, v)
    })
  }

  startPolling()
  return id
}

export async function removeValueChangeListener(id: number): Promise<void> {
  if (
    isNativeListenerSupported() &&
    typeof GM !== 'undefined' &&
    typeof GM.removeValueChangeListener === 'function'
  ) {
    await GM.removeValueChangeListener(id)
    return
  }

  valueChangeListeners.delete(id)
  if (valueChangeListeners.size === 0 && pollingIntervalId) {
    clearInterval(pollingIntervalId)
    pollingIntervalId = null
    lastKnownValues.clear()
  }
}
