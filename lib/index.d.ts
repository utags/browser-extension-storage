export async function getValue(key: string): Promise<any>

export async function setValue(key: string, value: any): Promise<void>

export async function deleteValue(key: string): Promise<void>

export async function listValues(): Promise<string[]>

export function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): () => void
