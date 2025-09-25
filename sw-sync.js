// This is a mock server endpoint. In a real app, this would be a real API endpoint.
const MOCK_SERVER_URL = '/api/sync';

// Mock server logic
const handleMockRequest = async (operations) => {
    console.log('[SW] Syncing operations to mock server:', operations);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, the server would process these and maybe return its own updates.
    // Here, we'll just simulate a successful response.
    console.log('[SW] Mock server sync successful.');
    return { status: 'success', serverTimestamp: Date.now() };
};

const DB_NAME_SW = 'GrocerGenieDB';
const DB_VERSION_SW = 1;

const openDBSW = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME_SW, DB_VERSION_SW);
    request.onerror = () => reject("Error opening DB in SW");
    request.onsuccess = (event) => resolve(event.target.result);
    // No onupgradeneeded, assuming the main app created it.
  });
};

const syncData = async () => {
    console.log('[SW] Starting data sync...');
    try {
        const db = await openDBSW();
        const transaction = db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const operations = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (operations.length === 0) {
            console.log('[SW] No items in sync queue. Sync complete.');
            return;
        }

        // Send to mock server
        const serverResponse = await handleMockRequest(operations);

        if (serverResponse.status === 'success') {
            // Clear the queue
            const writeTx = db.transaction(['syncQueue'], 'readwrite');
            await new Promise((resolve, reject) => {
                const req = writeTx.objectStore('syncQueue').clear();
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });
            console.log('[SW] Sync queue cleared.');
        }

        // Notify clients that sync is complete
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
        console.log('[SW] Sync complete. Notified clients.');

    } catch (error) {
        console.error('[SW] Sync failed:', error);
        // Don't clear queue if sync fails, so it can be retried.
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'SYNC_FAILED' }));
    }
};

self.addEventListener('sync', (event) => {
    if (event.tag === 'data-sync') {
        console.log('[SW] Sync event received for tag:', event.tag);
        event.waitUntil(syncData());
    }
});