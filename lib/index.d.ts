export function getValue(key: string): any

export function setValue(key: string, value: any): void

export function addValueChangeListener(
  key: string,
  func: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): string
