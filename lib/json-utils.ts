export function safeJsonParse<T>(
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  jsonString: string | undefined | null,
  defaultValue?: T
): T | undefined {
  if (jsonString === undefined || jsonString === null) {
    return defaultValue
  }

  try {
    return JSON.parse(jsonString) as T
  } catch {
    return defaultValue
  }
}

export function safeJsonParseWithFallback(
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  jsonString: string | undefined | null
): any {
  if (jsonString === undefined) {
    return undefined
  }

  if (jsonString === null) {
    return null
  }

  try {
    return JSON.parse(jsonString)
  } catch {
    return jsonString
  }
}
