import { seedDemoData } from "./seed";
import { closeDatabase, createDatabase } from "./database";
import { CrmRepository } from "./repository";

const globalForCrm = globalThis as unknown as {
  crmDatabase?: ReturnType<typeof createDatabase>;
  crmRepository?: CrmRepository;
};

export function getRepository(): CrmRepository {
  if (!globalForCrm.crmDatabase || !globalForCrm.crmRepository) {
    const database = createDatabase();
    seedDemoData(database);
    globalForCrm.crmDatabase = database;
    globalForCrm.crmRepository = new CrmRepository(database);
  }
  return globalForCrm.crmRepository;
}

export function closeServerDatabase(): void {
  if (globalForCrm.crmDatabase) {
    closeDatabase(globalForCrm.crmDatabase);
    globalForCrm.crmDatabase = undefined;
    globalForCrm.crmRepository = undefined;
  }
}
