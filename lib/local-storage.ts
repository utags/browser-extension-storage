import { safeJsonParse, safeJsonParseWithFallback } from './json-utils'

const listeners = new Map<
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
let listenerIdCounter = 0

const prefix = 'extension.'

const getNamespacedKey = (key: string) => prefix + key

const getUnnamespacedKey = (key: string) => key.slice(prefix.length)

const _getValue = (key: string) => {
  const val = localStorage.getItem(key)
  return val === null || val === 'undefined' ? undefined : val
}

const _setValue = (key: string, value: string | undefined) => {
  const oldValue = _getValue(key)
  if (oldValue === value) return

  if (value === undefined) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, value)
  }

  for (const listener of listeners.values()) {
    if (listener.key === key) {
      listener.callback(getUnnamespacedKey(key), oldValue, value, false)
    }
  }
}

const _addValueChangeListener = async (
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number> => {
  const id = ++listenerIdCounter
  listeners.set(id, { key, callback: func })
  return id
}

if (globalThis.window !== undefined) {
  globalThis.addEventListener('storage', (event) => {
    if (
      event.storageArea === localStorage &&
      event.key &&
      event.key.startsWith(prefix)
    ) {
      const key = event.key
      for (const listener of listeners.values()) {
        if (listener.key === key) {
          listener.callback(
            getUnnamespacedKey(key),
            event.oldValue === null ? undefined : event.oldValue,
            event.newValue === null ? undefined : event.newValue,
            true
          )
        }
      }
    }
  })
}

const getValue = async <T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> => {
  const value = _getValue(getNamespacedKey(key))
  return safeJsonParse(value, defaultValue)
}

const setValue = async (key: string, value: any): Promise<void> => {
  // Stay (Safari, Chrome): GM.setValue does not support saving undefined and null values.
  // Reading will error...
  _setValue(
    getNamespacedKey(key),
    value === undefined || value === null ? undefined : JSON.stringify(value)
  )
}

const deleteValue = async (key: string): Promise<void> => {
  _setValue(getNamespacedKey(key), undefined)
}

const listValues = () => {
  const length = localStorage.length
  const keys: string[] = []
  for (let i = 0; i < length; i++) {
    const key = localStorage.key(i)
    if (key !== null) {
      keys.push(getUnnamespacedKey(key))
    }
  }

  return keys
}

const addValueChangeListener = async (
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number> =>
  _addValueChangeListener(
    getNamespacedKey(key),
    (k, oldVal, newVal, remote) => {
      const parsedOld = safeJsonParseWithFallback(oldVal)
      const parsedNew = safeJsonParseWithFallback(newVal)

      func(k, parsedOld, parsedNew, remote)
    }
  )

export const removeValueChangeListener = async (id: number): Promise<void> => {
  listeners.delete(id)
}

export { getValue, setValue, deleteValue, addValueChangeListener }
