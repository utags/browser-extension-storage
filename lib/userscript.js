const getValue = async (key) => {
  const value = await GM.getValue(key)
  return value && value !== "undefined" ? JSON.parse(value) : undefined
}

const setValue = async (key, value) => {
  if (value !== undefined) GM.setValue(key, JSON.stringify(value))
}

const deleteValue = async (key) => GM.deleteValue(key)

const listValues = async () => GM.listValues()

const addValueChangeListener = (key, func) => {
  if (typeof GM_addValueChangeListener !== "function") {
    console.warn("Do not support GM_addValueChangeListener!")
    return () => undefined
  }

  const listenerId = GM_addValueChangeListener(key, func)
  return () => {
    GM_removeValueChangeListener(listenerId)
  }
}

export { getValue, setValue, deleteValue, listValues, addValueChangeListener }
