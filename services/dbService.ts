import { GroceryItem, PantryItem, Recipe, Category, Theme, Shop } from '../types';

const DB_NAME = 'GrocerGenieDB';
const DB_VERSION = 4;

export interface SyncOperation {
  id?: number;
  type: 'put' | 'delete' | 'clear';
  store: string;
  payload: any;
}

export interface NearbyShopsCache {
    id: 'lastResult';
    shops: Shop[];
    timestamp: string;
}

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Error opening DB");
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains('groceries')) {
        dbInstance.createObjectStore('groceries', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('pantry')) {
        dbInstance.createObjectStore('pantry', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('recipes')) {
        dbInstance.createObjectStore('recipes', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('settings')) {
        dbInstance.createObjectStore('settings', { keyPath: 'key' });
      }
      if (dbInstance.objectStoreNames.contains('mealPlan')) {
        dbInstance.deleteObjectStore('mealPlan');
      }
      if (!dbInstance.objectStoreNames.contains('syncQueue')) {
        dbInstance.createObjectStore('syncQueue', { autoIncrement: true, keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('favoriteShops')) {
        dbInstance.createObjectStore('favoriteShops', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('nearbyShopsCache')) {
        dbInstance.createObjectStore('nearbyShopsCache', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('storageSpaces')) {
        dbInstance.createObjectStore('storageSpaces', { keyPath: 'id' });
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode) => {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
};

const dbService = {
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    await openDB();
    return new Promise((resolve, reject) => {
      const store = getStore(storeName, 'readonly');
      const request = store.get(id);
      request.onerror = () => reject(new Error(`Error fetching ${id} from ${storeName}: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result);
    });
  },
  async getAll<T>(storeName: string): Promise<T[]> {
    await openDB();
    return new Promise((resolve, reject) => {
      const store = getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(new Error(`Error fetching from ${storeName}: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result);
    });
  },
  async put<T>(storeName: string, item: T): Promise<void> {
    await openDB();
    return new Promise((resolve, reject) => {
      const store = getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onerror = () => reject(new Error(`Error putting to ${storeName}: ${request.error?.message}`));
      request.onsuccess = () => {
        resolve();
      };
    });
  },
  async delete(storeName: string, id: string): Promise<void> {
    await openDB();
    return new Promise((resolve, reject) => {
      const store = getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onerror = () => reject(new Error(`Error deleting from ${storeName}: ${request.error?.message}`));
      request.onsuccess = () => {
        resolve();
      };
    });
  },
  async clear(storeName: string): Promise<void> {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onerror = () => reject(new Error(`Error clearing ${storeName}: ${request.error?.message}`));
        request.onsuccess = () => {
            resolve();
        };
    });
  },
  
  // Sync queue specific methods
  async addToSyncQueue(operation: Omit<SyncOperation, 'id'>): Promise<void> {
    await dbService.put<SyncOperation>('syncQueue', operation);
  }
};

export default dbService;