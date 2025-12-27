import { Storage } from "@plasmohq/storage"

const isChrome = typeof chrome !== "undefined"

const storage = new Storage({ area: "local" })

const getValue = async (key) => storage.get(key)

const setValue = async (key, value) => {
  if (value !== undefined) await storage.set(key, value)
}

const deleteValue = async (key) => storage.remove(key)

const listValues = async () => {
  const allData = await storage.getAll()
  return Object.keys(allData)
}

const addValueChangeListener = (key, func) => {
  const callbackMap = {
    [key]({ oldValue, newValue }) {
      if (isChrome) {
        func(key, oldValue, newValue)
        // Fix Firefox extension compatibility. Chrome doesn't need to compare this.
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        func(key, oldValue, newValue)
      }
    },
  }
  storage.watch(callbackMap)

  return () => {
    storage.unwatch(callbackMap)
  }
}

export { getValue, setValue, deleteValue, listValues, addValueChangeListener }
