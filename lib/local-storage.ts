import { safeJsonParse, safeJsonParseWithFallback } from './json-utils'

const listeners: Record<
  string,
  Array<(key: string, oldValue: any, newValue: any, remote: boolean) => void>
> = {}

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

  if (listeners[key]) {
    for (const func of listeners[key]) {
      func(getUnnamespacedKey(key), oldValue, value, false)
    }
  }
}

const _addValueChangeListener = async (
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number> => {
  listeners[key] = listeners[key] || []
  listeners[key].push(func)
  return 0
}

const getValue = async <T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> => {
  const value = _getValue(getNamespacedKey(key))
  return safeJsonParse(value, defaultValue)
}

const setValue = async (key: string, value: any): Promise<void> => {
  _setValue(
    getNamespacedKey(key),
    value === undefined ? undefined : JSON.stringify(value)
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

export { getValue, setValue, deleteValue, addValueChangeListener }
