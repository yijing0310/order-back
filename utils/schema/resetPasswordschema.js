import { z } from "zod";

export const resetPasswordschema  = z
    .object({
        password: z
            .string()
            .min(1, { message: "請輸入新密碼" })
            .min(8, {
                message:
                    "密碼至少8個字元且需包含英文字母及數字",
            })
            .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
                message:
                    "密碼至少8個字元且需包含英文字母及數字",
            }),
        passwordCheck: z.string().min(1, { message: "請再次輸入新密碼" }),
    })
    .refine((data) => data.password === data.passwordCheck, {
        message: "密碼不一致",
        path: ["passwordCheck"],
    });
