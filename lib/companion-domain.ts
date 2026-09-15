import { z } from "zod";
export const companionSchema = z.object({
  name: z.string().trim().min(1, "请填写陪陪名称").max(80, "名称最多80个字符"),
  notes: z.string().trim().max(2000, "备注最多2000个字符").default(""),
});
export function nameKey(name: string) {
  return name.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}
export type Companion = {
  _id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
