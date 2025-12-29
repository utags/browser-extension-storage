import { Storage } from '@plasmohq/storage'

const isChrome = typeof chrome !== 'undefined' && typeof browser === 'undefined'

const storage = new Storage({ area: 'local' })

const getValue = async <T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> => {
  const value = await storage.get<T>(key)
  return value === undefined ? defaultValue : value
}

const setValue = async (key: string, value: any): Promise<void> => {
  // Stay (Safari, Chrome): GM.setValue does not support saving undefined and null values.
  // Reading will error...
  await (value === undefined || value === null
    ? deleteValue(key)
    : storage.set(key, value))
}

const deleteValue = async (key: string): Promise<void> => storage.remove(key)

const listValues = async (): Promise<string[]> => {
  const allData = await storage.getAll()
  return Object.keys(allData)
}

const addValueChangeListener = async (
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number> => {
  const callbackMap = {
    [key]({ oldValue, newValue }) {
      if (isChrome) {
        func(key, oldValue, newValue, true)
        // Fix Firefox extension compatibility. Chrome doesn't need to compare this.
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        func(key, oldValue, newValue, true)
      }
    },
  }
  storage.watch(callbackMap)
  return 0
}

export { getValue, setValue, deleteValue, addValueChangeListener }
