import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdir, rm, access, writeFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(".runtime");
await mkdir(path.join(root, "data"), { recursive: true });
const stopFile = path.join(root, "stop-db");
await rm(stopFile, { force: true });
const db = await MongoMemoryServer.create({
  binary: { version: "8.2.3", downloadDir: path.join(root, "bin") },
  instance: {
    port: 27017,
    ip: "127.0.0.1",
    dbPath: path.join(root, "data"),
    storageEngine: "wiredTiger",
  },
});
console.log("MongoDB ready: " + db.getUri() + " | persistent data: " + root);
await writeFile(path.join(root, "db.pid"), String(process.pid));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await db.stop({ doCleanup: false });
  await rm(stopFile, { force: true });
  process.exit(0);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
setInterval(async () => {
  try {
    await access(stopFile);
  } catch {
    return;
  }
  await stop();
}, 1000);
