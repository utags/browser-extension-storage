export const wait = async (ms = 50) =>
  // eslint-disable-next-line no-promise-executor-return
  new Promise<void>((resolve) => setTimeout(resolve, ms))
