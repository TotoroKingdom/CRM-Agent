import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { schemaSql } from "./schema";

const defaultDatabasePath = resolve(process.cwd(), "data", "crm.sqlite");

export function createDatabase(databasePath = defaultDatabasePath): DatabaseSync {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec(schemaSql);
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
}

export function closeDatabase(database: DatabaseSync): void {
  database.close();
}
