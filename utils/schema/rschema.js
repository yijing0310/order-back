import { z } from "zod";

export const registerSchema  = z
    .object({
        name: z.string().min(1, { message: "姓名為必填" }),
        email: z
            .string()
            .min(1, { message: "電子信箱為必填" })
            .email({ message: "請填寫正確的電子信箱格式" }),
        account: z
            .string()
            .min(1, { message: "帳號為必填" })
            .min(5, { message: "帳號至少5個字元" }),
        password: z
            .string()
            .min(1, { message: "密碼為必填" })
            .min(8, {
                message:
                    "密碼至少8個字元且需包含英文字母及數字",
            })
            .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
                message:
                    "密碼至少8個字元且需包含英文字母及數字",
            }),
        passwordCheck: z.string(),
    })
    .refine((data) => data.password === data.passwordCheck, {
        message: "密碼不一致",
        path: ["passwordCheck"],
    });
