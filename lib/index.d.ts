export async function getValue<T = string>(
  key: string,
  defaultValue?: T
): Promise<T | undefined>

export async function setValue(key: string, value: any): Promise<void>

export async function deleteValue(key: string): Promise<void>

export function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): Promise<number>
