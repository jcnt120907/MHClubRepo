import rows from "../data/september.json";
import { prepare, createOrder } from "./db";
import { importLegacyCompanions } from "./companions";
export async function seedSeptember() {
  const db = await prepare();
  let added = 0;
  const history = db.collection<{ _id: string; importedAt: string }>(
    "sampleImports",
  );
  for (const row of rows) {
    if (await history.findOne({ _id: row.sourceKey })) continue;
    if (
      !(await db.collection("orders").findOne({ sourceKey: row.sourceKey }))
    ) {
      const { expected, sourceKey, sourceColor, sourceService, ...input } = row;
      try {
        await createOrder(input, { sourceKey, sourceColor, sourceService });
        added++;
      } catch (e) {
        if (!(e && typeof e === "object" && "code" in e && e.code === 11000))
          throw e;
      }
    }
    await history.updateOne(
      { _id: row.sourceKey },
      { $setOnInsert: { importedAt: new Date().toISOString() } },
      { upsert: true },
    );
  }
  await importLegacyCompanions();
  return added;
}
