import { z } from "zod";
export const customerServiceSchema = z.object({
  name: z.string().trim().min(1, "请填写客服名称").max(80),
  notes: z.string().trim().max(2000).default(""),
});
export type CustomerService = z.infer<typeof customerServiceSchema> & {
  _id: string;
  orderCount?: number;
};
export const customerServiceKey = (name: string) =>
  name.trim().normalize("NFKC").toLocaleLowerCase();
