// eslint-disable-next-line no-unused-expressions, n/prefer-global/process
process.env.PLASMO_TAG === "dev" &&
  (() => {
    if (
      typeof GM_getValue !== "function" &&
      typeof document.GM_getValue === "function"
    ) {
      GM_getValue = document.GM_getValue
      GM_setValue = document.GM_setValue
      GM_deleteValue = document.GM_deleteValue
      GM_listValues = document.GM_listValues
      GM_addValueChangeListener = document.GM_addValueChangeListener
      GM_removeValueChangeListener = document.GM_removeValueChangeListener
    }
  })()

const getValue = (key) => {
  const value = GM_getValue(key)
  return value && value !== "undefined" ? JSON.parse(value) : undefined
}

const setValue = (key, value) => {
  if (value !== undefined) GM_setValue(key, JSON.stringify(value))
}

const deleteValue = (key) => GM_deleteValue(key)

const listValues = () => GM_listValues()

const addValueChangeListener = (key, func) => {
  const listenerId = GM_addValueChangeListener(key, func)
  return () => {
    GM_removeValueChangeListener(listenerId)
  }
}

export { getValue, setValue, deleteValue, listValues, addValueChangeListener }
