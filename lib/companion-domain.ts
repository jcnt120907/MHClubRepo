import { z } from "zod";
export const companionSchema = z.object({
  name: z.string().trim().min(1, "请填写陪陪名称").max(80, "名称最多80个字符"),
  notes: z.string().trim().max(2000, "备注最多2000个字符").default(""),
  paymentMethod: z.string().trim().max(80, "付款方式最多80个字符").default(""),
  paymentContent: z.string().trim().max(2000, "付款内容最多2000个字符").default(""),
  paymentImage: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "付款图片格式无效")
    .max(950000, "付款图片过大，请使用 700KB 以内的图片")
    .or(z.literal(""))
    .default(""),
});
export function nameKey(name: string) {
  return name.trim().normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
export type Companion = {
  _id: string;
  name: string;
  notes: string;
  paymentMethod?: string;
  paymentContent?: string;
  paymentImage?: string;
  createdAt: string;
  updatedAt: string;
};
