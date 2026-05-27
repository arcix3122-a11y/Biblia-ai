import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CREATE_TABLES_SQL, MIGRATION_V2_SQL, MIGRATION_V3_SQL, SCHEMA_VERSION } from "./schema";
import { runPolishSeedIfNeeded, runSeedIfNeeded } from "./seed";

const DB_NAME = "biblia.db";
const SEED_FLAG_KEY = "@biblia-ai/db-seeded";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Clears a failed init so callers can retry `getDatabase()`. */
export function resetDatabaseInit(): void {
  if (dbInstance) {
    return;
  }
  initPromise = null;
}

async function applyMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  let row: { version: number } | null = null;
  try {
    row = await db.getFirstAsync<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
    );
  } catch {
    // If the schema_migrations table does not exist, row remains null.
  }

  if (!row) {
    await db.execAsync(CREATE_TABLES_SQL);
    await db.execAsync(MIGRATION_V2_SQL);
    await db.runAsync(
      "INSERT INTO schema_migrations (version) VALUES (?)",
      SCHEMA_VERSION
    );
    return;
  }

  if (row.version < SCHEMA_VERSION) {
    if (row.version < 2) {
      await db.execAsync(MIGRATION_V2_SQL);
    }
    if (row.version < 3) {
      await db.execAsync(MIGRATION_V3_SQL);
      await runPolishSeedIfNeeded(db);
    }
    await db.runAsync(
      "INSERT INTO schema_migrations (version) VALUES (?)",
      SCHEMA_VERSION
    );
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        try {
          await db.execAsync("PRAGMA journal_mode = WAL;");
        } catch {
          // WAL may be unsupported on some platforms; continue without it.
        }
        await db.execAsync("PRAGMA foreign_keys = ON;");
        await applyMigrations(db);

        const seeded = await AsyncStorage.getItem(SEED_FLAG_KEY);
        if (seeded !== "true") {
          await runSeedIfNeeded(db);
          await AsyncStorage.setItem(SEED_FLAG_KEY, "true");
        }

        dbInstance = db;
        return db;
      } catch (error) {
        initPromise = null;
        throw error;
      }
    })();
  }

  return initPromise;
}

export async function resetDatabaseForDev(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
  await AsyncStorage.removeItem(SEED_FLAG_KEY);
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
