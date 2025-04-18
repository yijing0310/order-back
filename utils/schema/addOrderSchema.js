import { z } from "zod";

export const addOrderSchema = z
    .object({
        group_uuid: z.string().min(1, { message: "缺少開團ID" }),
        name: z.string().min(1, { message: "訂購人為必填" }),
        item_name: z.string().min(1, { message: "品項為必填" }),
        quantity: z.number().min(1, { message: "數量最少為1" }),
        price: z.number().min(1, { message: "價錢不得小於0" }),
        note: z.string().optional(),
        template: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.template === "drink") {
            if (
                !data.note ||
                !data.note.includes("甜度:") ||
                !data.note.includes("冰塊:") ||
                !data.note.includes("尺寸:")
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["note"],
                    message: "『甜度』、『冰塊』與『尺寸』為必填",
                });
            }
        }
    });
