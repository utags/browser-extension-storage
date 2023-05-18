const listeners = {}

const getValue = async (key) => {
  const value = await GM.getValue(key)
  return value && value !== "undefined" ? JSON.parse(value) : undefined
}

const setValue = async (key, value) => {
  if (value !== undefined) {
    const newValue = JSON.stringify(value)
    if (listeners[key]) {
      const oldValue = await GM.getValue(key)
      await GM.setValue(key, newValue)
      if (newValue !== oldValue) {
        for (const func of listeners[key]) {
          func(key, oldValue, newValue)
        }
      }
    } else {
      await GM.setValue(key, newValue)
    }
  }
}

const deleteValue = async (key) => GM.deleteValue(key)

const listValues = async () => GM.listValues()

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

const addValueChangeListener = (key, func) => {
  if (typeof GM_addValueChangeListener !== "function") {
    console.warn("Do not support GM_addValueChangeListener!")
    return _addValueChangeListener(key, func)
  }

  const listenerId = GM_addValueChangeListener(key, func)
  return () => {
    GM_removeValueChangeListener(listenerId)
  }
}

export { getValue, setValue, deleteValue, listValues, addValueChangeListener }
