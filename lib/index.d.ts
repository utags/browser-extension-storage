export async function getValue(key: string): any

export async function setValue(key: string, value: any): any

export async function deleteValue(key: string): void

export async function listValues(): string[]

export function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): () => void
