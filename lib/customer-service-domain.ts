import { z } from "zod";
export const customerServiceSchema = z.object({
  name: z.string().trim().min(1, "请填写客服名称").max(80),
  notes: z.string().trim().max(2000).default(""),
  giftSuccessFee: z.number().finite().min(0).max(10000).default(0.5),
  serviceSuccessFee: z.number().finite().min(0).max(10000).default(1),
});
export type CustomerService = z.infer<typeof customerServiceSchema> & {
  _id: string;
  /** 成功对接单：状态为可发放或已付款。 */
  orderCount?: number;
  /** 当前筛选月份内的成功对接单。 */
  periodOrderCount?: number;
  periodWage?: number;
  totalWage?: number;
};
export const customerServiceKey = (name: string) =>
  name.trim().normalize("NFKC").toLocaleLowerCase();
