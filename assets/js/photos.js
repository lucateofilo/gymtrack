const PHOTOS_DB = "gymtrack_photos";
const PHOTOS_STORE = "body";

function openPhotosDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTOS_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTOS_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const Photos = {
  async save(id, blob) {
    const db = await openPhotosDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      tx.objectStore(PHOTOS_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async get(id) {
    const db = await openPhotosDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readonly");
      const req = tx.objectStore(PHOTOS_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id) {
    const db = await openPhotosDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      tx.objectStore(PHOTOS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
