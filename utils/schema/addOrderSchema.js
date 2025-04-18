import { z } from "zod";

export const addOrderSchema = z.object({
    group_uuid: z.string().min(1, { message: "缺少開團ID" }),
    name: z.string().min(1, { message: "訂購人為必填" }),
    item_name: z.string().min(1, { message: "品項為必填" }),
    quantity: z.number().min(1, { message: "數量最少為1" }),
    price: z.number().min(0, { message: "價錢不得小於0" }),
    note: z
    .string()
    .min(1, { message: "『甜度』與『冰塊』為必填" })
    .refine(
        (val) => val.includes("甜度:") && val.includes("冰塊:"),
        {
            message: "『甜度』與『冰塊』為必填",
        }
    ),
});
