import { z } from "zod";

export const editProfileSchema = z.object({
    name: z.string().min(1, { message: "姓名為必填" }),
    email: z
        .string()
        .min(1, { message: "電子信箱為必填" })
        .email({ message: "請填寫正確的電子信箱格式" }),
});
