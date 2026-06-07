import { openDB } from "idb";

export async function getDB() {
  return openDB("climitra-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pendingUploads")) {
        db.createObjectStore("pendingUploads", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
}

export async function saveOffline(file) {
  const db = await getDB();
  await db.add("pendingUploads", {
    file,
    createdAt: Date.now(),
  });
}

export async function getPendingUploads() {
  const db = await getDB();
  return db.getAll("pendingUploads");
}

export async function deletePendingUpload(id) {
  const db = await getDB();
  await db.delete("pendingUploads", id);
}