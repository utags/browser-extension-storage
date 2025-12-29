import {
  getValue as getRawValue,
  setValue as setRawValue,
  addValueChangeListener as rawAddValueChangeListener,
} from './userscript.js'
import { safeJsonParse, safeJsonParseWithFallback } from './json-utils'

export { deleteValue } from './userscript.js'
export { runStorageTests } from './test.js'

export async function getValue<T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  const val = await getRawValue(key)
  return safeJsonParse(val, defaultValue)
}

export async function setValue<T = string>(
  key: string,
  value: T
): Promise<void> {
  // Stay (Safari, Chrome): GM.setValue does not support saving undefined and null values.
  // Reading will error...
  await setRawValue(
    key,
    value === undefined || value === null ? undefined : JSON.stringify(value)
  )
}

export async function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number> {
  return rawAddValueChangeListener(key, (k, oldVal, newVal, remote) => {
    const parsedOld = safeJsonParseWithFallback(oldVal as string)
    const parsedNew = safeJsonParseWithFallback(newVal as string)

    func(k, parsedOld, parsedNew, remote)
  })
}
