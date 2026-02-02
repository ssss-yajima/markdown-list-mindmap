import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import { fileStorage, storage } from '../storage'
import type { StoredData } from '../../types/mindMap'
import type { FileIndex } from '../../types/file'

// localStorageのモック
function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
    reset: () => {
      store = {}
    },
  }
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>

beforeEach(() => {
  localStorageMock = createLocalStorageMock()
  vi.stubGlobal('localStorage', localStorageMock)
})

function makeStoredData(): StoredData {
  return {
    markdown: '- Test Item',
    metadata: {
      version: 1,
      nodeMetadata: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      lastModified: Date.now(),
    },
  }
}

function makeFileIndex(overrides: Partial<FileIndex> = {}): FileIndex {
  return {
    version: 1,
    files: [{ id: 'test1', name: 'Test', createdAt: 1000, updatedAt: 1000 }],
    activeFileId: 'test1',
    ...overrides,
  }
}

function withConsoleErrorSpy<T>(fn: (spy: MockInstance) => T): T {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    return fn(spy)
  } finally {
    spy.mockRestore()
  }
}

describe('fileStorage', () => {
  describe('loadIndex', () => {
    it('データがない場合はnullを返す', () => {
      const result = fileStorage.loadIndex()
      expect(result).toBeNull()
    })

    it('保存されたインデックスを読み込む', () => {
      const index = makeFileIndex()
      localStorageMock.store['mindmap-file-index'] = JSON.stringify(index)

      const result = fileStorage.loadIndex()
      expect(result).toEqual(index)
    })

    it('不正なJSONの場合はnullを返す', () => {
      localStorageMock.store['mindmap-file-index'] = 'invalid json'

      withConsoleErrorSpy((spy) => {
        const result = fileStorage.loadIndex()
        expect(result).toBeNull()
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('saveIndex', () => {
    it('インデックスを保存する', () => {
      const index = makeFileIndex()

      fileStorage.saveIndex(index)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mindmap-file-index',
        JSON.stringify(index),
      )
    })

    it('保存エラー時にコンソールエラーを出力', () => {
      const index = makeFileIndex({ files: [], activeFileId: null })
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })

      withConsoleErrorSpy((spy) => {
        fileStorage.saveIndex(index)
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('loadFileData', () => {
    it('データがない場合はnullを返す', () => {
      const result = fileStorage.loadFileData('nonexistent')
      expect(result).toBeNull()
    })

    it('保存されたファイルデータを読み込む', () => {
      const data = makeStoredData()
      localStorageMock.store['mindmap-file-test1'] = JSON.stringify(data)

      const result = fileStorage.loadFileData('test1')
      expect(result).toEqual(data)
    })

    it('不正なJSONの場合はnullを返す', () => {
      localStorageMock.store['mindmap-file-test1'] = 'invalid json'

      withConsoleErrorSpy((spy) => {
        const result = fileStorage.loadFileData('test1')
        expect(result).toBeNull()
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('saveFileData', () => {
    it('ファイルデータを保存する', () => {
      const data = makeStoredData()

      fileStorage.saveFileData('test1', data)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mindmap-file-test1',
        JSON.stringify(data),
      )
    })

    it('保存エラー時にコンソールエラーを出力', () => {
      const data = makeStoredData()
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })

      withConsoleErrorSpy((spy) => {
        fileStorage.saveFileData('test1', data)
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('deleteFileData', () => {
    it('ファイルデータを削除する', () => {
      fileStorage.deleteFileData('test1')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'mindmap-file-test1',
      )
    })

    it('削除エラー時にコンソールエラーを出力', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Error')
      })

      withConsoleErrorSpy((spy) => {
        fileStorage.deleteFileData('test1')
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('createFile', () => {
    it('ファイル情報を作成する', () => {
      const before = Date.now()
      const file = fileStorage.createFile('New File')
      const after = Date.now()

      expect(file.name).toBe('New File')
      expect(file.id).toMatch(/^[a-z0-9]+$/)
      expect(file.createdAt).toBeGreaterThanOrEqual(before)
      expect(file.createdAt).toBeLessThanOrEqual(after)
      expect(file.updatedAt).toBe(file.createdAt)
    })
  })

  describe('hasLegacyData', () => {
    it('旧データがない場合はfalseを返す', () => {
      expect(fileStorage.hasLegacyData()).toBe(false)
    })

    it('旧データがある場合はtrueを返す', () => {
      localStorageMock.store['markdown-mindmap-data'] = JSON.stringify(
        makeStoredData(),
      )

      expect(fileStorage.hasLegacyData()).toBe(true)
    })
  })

  describe('loadLegacyData', () => {
    it('データがない場合はnullを返す', () => {
      const result = fileStorage.loadLegacyData()
      expect(result).toBeNull()
    })

    it('旧データを読み込む', () => {
      const data = makeStoredData()
      localStorageMock.store['markdown-mindmap-data'] = JSON.stringify(data)

      const result = fileStorage.loadLegacyData()
      expect(result).toEqual(data)
    })

    it('不正なJSONの場合はnullを返す', () => {
      localStorageMock.store['markdown-mindmap-data'] = 'invalid json'

      withConsoleErrorSpy((spy) => {
        const result = fileStorage.loadLegacyData()
        expect(result).toBeNull()
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('clearLegacyData', () => {
    it('旧データを削除する', () => {
      localStorageMock.store['markdown-mindmap-data'] = 'test'

      fileStorage.clearLegacyData()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'markdown-mindmap-data',
      )
    })
  })

  describe('migrateFromLegacy', () => {
    it('旧データがない場合はnullを返す', () => {
      const result = fileStorage.migrateFromLegacy()
      expect(result).toBeNull()
    })

    it('旧データを新形式にマイグレーションする', () => {
      const legacyData = makeStoredData()
      localStorageMock.store['markdown-mindmap-data'] =
        JSON.stringify(legacyData)

      const result = fileStorage.migrateFromLegacy()

      expect(result).not.toBeNull()
      expect(result!.version).toBe(1)
      expect(result!.files).toHaveLength(1)
      expect(result!.files[0].name).toBe('マイマインドマップ')
      expect(result!.activeFileId).toBe(result!.files[0].id)

      // 新形式でインデックスとファイルデータが保存されていることを確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mindmap-file-index',
        expect.any(String),
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `mindmap-file-${result!.files[0].id}`,
        expect.any(String),
      )

      // 旧データが削除されていることを確認
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'markdown-mindmap-data',
      )
    })
  })

  describe('initialize', () => {
    it('既存インデックスがある場合はそれを返す', () => {
      const existingIndex = makeFileIndex({
        files: [
          {
            id: 'existing',
            name: 'Existing',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        activeFileId: 'existing',
      })
      localStorageMock.store['mindmap-file-index'] =
        JSON.stringify(existingIndex)

      const result = fileStorage.initialize()

      expect(result).toEqual(existingIndex)
    })

    it('旧データがある場合はマイグレーションを実行', () => {
      const legacyData = makeStoredData()
      localStorageMock.store['markdown-mindmap-data'] =
        JSON.stringify(legacyData)

      const result = fileStorage.initialize()

      expect(result.version).toBe(1)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('マイマインドマップ')
    })

    it('データがない場合は新規作成', () => {
      const result = fileStorage.initialize()

      expect(result.version).toBe(1)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('新しいマインドマップ')
      expect(result.activeFileId).toBe(result.files[0].id)
    })
  })
})

describe('storage (legacy API)', () => {
  describe('load', () => {
    it('データがない場合はnullを返す', () => {
      const result = storage.load()
      expect(result).toBeNull()
    })

    it('保存されたデータを読み込む', () => {
      const data = makeStoredData()
      localStorageMock.store['markdown-mindmap-data'] = JSON.stringify(data)

      const result = storage.load()
      expect(result).toEqual(data)
    })

    it('不正なJSONの場合はnullを返す', () => {
      localStorageMock.store['markdown-mindmap-data'] = 'invalid json'

      withConsoleErrorSpy((spy) => {
        const result = storage.load()
        expect(result).toBeNull()
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('save', () => {
    it('データを保存する', () => {
      const data = makeStoredData()

      storage.save(data)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'markdown-mindmap-data',
        JSON.stringify(data),
      )
    })

    it('保存エラー時にコンソールエラーを出力', () => {
      const data = makeStoredData()
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })

      withConsoleErrorSpy((spy) => {
        storage.save(data)
        expect(spy).toHaveBeenCalled()
      })
    })
  })

  describe('clear', () => {
    it('データを削除する', () => {
      storage.clear()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'markdown-mindmap-data',
      )
    })
  })
})
