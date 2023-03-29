export async function getValue(key: string): any

export async function setValue(key: string, value: any): any

export function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): string
