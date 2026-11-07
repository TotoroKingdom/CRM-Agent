import { closeDatabase, createDatabase } from "../src/lib/db/database";
import { seedDemoData } from "../src/lib/db/seed";

const database = createDatabase();
try {
  const result = seedDemoData(database);
  console.log(result.seeded ? "Demo data seeded." : "Database already contains data; seed skipped.");
  console.log(result.counts);
} finally {
  closeDatabase(database);
}
