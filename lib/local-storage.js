const listeners = {}

const prefix = "extension."

const getNamespacedKey = (key) => prefix + key

const getUnnamespacedKey = (key) => key.slice(prefix.length)

const _getValue = (key) => localStorage.getItem(key)

const _setValue = (key, value) => {
  const oldValue = localStorage.getItem(key)
  if (oldValue === value) return
  localStorage.setItem(key, value)
  if (listeners[key]) {
    for (const func of listeners[key]) {
      func(key, oldValue, value)
    }
  }
}

const _addValueChangeListener = (key, func) => {
  listeners[key] = listeners[key] || []
  listeners[key].push(func)
  return () => {
    if (listeners[key] && listeners[key].length > 0) {
      for (let i = listeners[key].length - 1; i >= 0; i--) {
        if (listeners[key][i] === func) {
          listeners[key].splice(i, 1)
        }
      }
    }
  }
}

const getValue = (key) => {
  const value = _getValue(getNamespacedKey(key))
  return value && value !== "undefined" ? JSON.parse(value) : undefined
}

const setValue = (key, value) => {
  if (value !== undefined)
    _setValue(getNamespacedKey(key), JSON.stringify(value))
}

const deleteValue = (key) => localStorage.removeItem(getNamespacedKey(key))

const listValues = () => {
  const length = localStorage.length
  const keys = []
  for (let i = 0; i < length; i++) {
    keys.push(getUnnamespacedKey(localStorage.key(i)))
  }

  return keys
}

const addValueChangeListener = (key, func) =>
  _addValueChangeListener(getNamespacedKey(key), func)

export { getValue, setValue, deleteValue, listValues, addValueChangeListener }
