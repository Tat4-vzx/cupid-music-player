const DB_NAME = 'LiviaPhotosDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

// Inicializa o banco de dados IndexedDB
export function initDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Erro no banco de dados:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Retorna todas as fotos salvas localmente
export async function getPhotos() {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Ordena por data (mais novas primeiro)
      const photos = request.result || [];
      photos.sort((a, b) => b.date - a.date);
      resolve(photos);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Salva uma nova foto no banco de dados local
export async function addPhoto(photo) {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(photo);

    request.onsuccess = () => {
      resolve(photo);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Exclui uma foto por ID
export async function deletePhoto(id) {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
