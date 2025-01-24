import Dexie, { EntityTable } from "dexie";

// ===========================================================================
// Types
// ===========================================================================
interface Sheet {
  id: number;
  content: string;
  created_at: string;
  last_opened_at: string;
}


interface DexieDatabase extends Dexie {
  sheets: EntityTable<Sheet, "id">;
}

// ===========================================================================
// Dexie
// ===========================================================================
const db = new Dexie("quarta_db") as DexieDatabase;

db.version(1).stores({
  sheets: "++id, content, created_at, last_opened_at",
});


export { db };
export type { Sheet };

