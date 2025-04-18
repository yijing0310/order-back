import { z } from "zod";

export const addGroupSchema = z.object({
    title: z.string().min(1, { message: "名稱為必填" }),
    restaurant: z.string().min(1, { message: "餐廳名稱為必填" }),
    tel: z.string().optional(),
    menuLink: z
    .string()
    .url("請輸入正確的網址格式")
    .optional()
    .or(z.literal("")), 
    endTime: z
        .string()
        .min(1, { message: "結束時間為必填" })
        .refine(
            (val) => {
                const selected = new Date(val);
                const now = new Date();
                return selected.getTime() > now.getTime();
            },
            {
                message: "結束時間不能小於現在",
            }
        ),
    limit: z.number().min(1, { message: "數量最少為1" }),
    password: z
        .string()
        .optional()
        .or(z.literal("")) // 允許空字串
        .refine((val) => !val || (val.length >= 3 && val.length <= 10), {
            message: "密碼需為 3~10 字之間",
        }),
    template: z.enum(["basic", "drink", "custom"]),
    note: z.string().optional(),
});
