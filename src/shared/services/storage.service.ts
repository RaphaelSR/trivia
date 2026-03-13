export type StorageDriver = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const noopStorage: StorageDriver = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

function resolveStorage(driver?: StorageDriver): StorageDriver {
  if (driver) return driver
  if (typeof window === 'undefined') return noopStorage
  return window.localStorage
}

export class StorageService {
  private readonly storage: StorageDriver

  constructor(driver?: StorageDriver) {
    this.storage = resolveStorage(driver)
  }

  get(key: string): string | null {
    try {
      return this.storage.getItem(key)
    } catch {
      return null
    }
  }

  set(key: string, value: string): boolean {
    try {
      this.storage.setItem(key, value)
      return true
    } catch {
      return false
    }
  }

  remove(key: string): boolean {
    try {
      this.storage.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  getJson<T>(key: string, fallback: T): T {
    const value = this.get(key)
    if (!value) {
      return fallback
    }

    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }

  setJson<T>(key: string, value: T): boolean {
    try {
      return this.set(key, JSON.stringify(value))
    } catch {
      return false
    }
  }
}

export const storageService = new StorageService()
