export function memoryKv() {
  const entries = new Map()
  return {
    async get(key) {
      return entries.has(key) ? entries.get(key) : null
    },
    async put(key, value) {
      entries.set(key, value)
    },
    async delete(key) {
      entries.delete(key)
    }
  }
}
