import express from "express";
import { registerSchema } from "../utils/schema/rschema.js";
import { editProfileSchema } from "../utils/schema/editProfileschema.js";
import { editPasswordschema } from "../utils/schema/editPasswordschema.js";
import db from "./../utils/connect-mysql.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendResetPasswordEmail } from "../utils/emailSender.js";
const router = express.Router();

// 註冊
router.post("/register/api", async (req, res) => {
    let { name, email, account, password, passwordCheck } = req.body || {};
    const output = {
        success: false,
        error: {
            name: "",
            email: "",
            account: "",
            password: "",
            passwordCheck: "",
        },
        data: {
            id: 0,
            name: "",
            email: "",
            account: "",
        },
    };
    const zResult = registerSchema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            name: "",
            email: "",
            account: "",
            password: "",
            passwordCheck: "",
        };
        const errMap = new Map();

        zResult.error?.issues.forEach((item) => {
            const pathKey = item.path[0];
            if (!errMap.has(pathKey)) {
                errMap.set(pathKey, item.message);
                newError[pathKey] = item.message;
            }
        });
        output.error = newError;
        return res.json(output);
    }

    const sql = `SELECT email FROM users WHERE email=?`;
    const [rows] = await db.query(sql, [email]);

    if (rows.length) {
        output.error.email = "此電子郵件已註冊過";
        return res.json(output);
    }
    const asql = `SELECT account FROM users WHERE account=?`;
    const [accounts] = await db.query(asql, [account]);

    if (accounts.length) {
        output.error.account = "此帳號已註冊過";
        return res.json(output);
    }
    // 新增
    const hash = await bcrypt.hash(password, 10);
    const addsql = `
    INSERT INTO users (name,email,account,password_hash) VALUES (?, ?, ?, ?);
    `;
    try {
        const [result] = await db.query(addsql, [name, email, account, hash]);
        output.result = result;
        output.success = !!result.affectedRows;
        output.data.id = result.insertId;
        output.data.name = name;
        output.data.email = email;
        output.data.account = account;
    } catch (ex) {
        output.error = ex;
    }
    return res.json(output);
});
// 獲取個人資料
router.get("/profile/api", async (req, res) => {
    const output = {
        success: false,
        error: "",
        result: {},
    };
    const user_id = req.my_jwt?.id;
    if (!user_id) {
        output.error = "用戶未登入";
        return res.json(output);
    }
    try {
        const tsql = `SELECT COUNT(*) AS totalRows FROM users WHERE id=? ; `;
        const [[{ totalRows }]] = await db.query(tsql, [user_id]);
        if (totalRows <= 0) {
            output.error = "沒有資料";
        }
        const sql = `SELECT name,email,account FROM users WHERE id=? ; `;
        const [[result]] = await db.query(sql, [user_id]);
        output.result = result;
        output.success = true;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});
// 修改個人資料
router.post("/editProfile/api", async (req, res) => {
    let { name, email } = req.body || {};

    const output = {
        success: false,
        error: {
            name: "",
            email: "",
        },
        message: "",
        data: {},
    };
    const user_id = req.my_jwt?.id;
    if (!user_id) {
        output.message = "用戶未登入";
        return res.json(output);
    }
    const zResult = editProfileSchema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            name: "",
            email: "",
        };
        const errMap = new Map();

        zResult.error?.issues.forEach((item) => {
            const pathKey = item.path[0];
            if (!errMap.has(pathKey)) {
                errMap.set(pathKey, item.message);
                newError[pathKey] = item.message;
            }
        });
        output.error = newError;
        return res.json(output);
    }
    const sql = `SELECT id FROM users WHERE email = ? AND id != ?`;
    const [rows] = await db.query(sql, [email, user_id]);

    if (rows.length) {
        output.error.email = "此電子郵件已註冊過";
        return res.json(output);
    }
    // 確認資料是否有更動
    const esql = `SELECT name, email FROM users WHERE id = ?`;
    const [originalRows] = await db.query(esql, [user_id]);
    if (!originalRows.length) {
        output.message = "找不到該使用者";
        return res.json(output);
    }
    const original = originalRows[0];
    if (original.name === name && original.email === email) {
        output.message = "你沒有修改任何資料";
        return res.json(output);
    }

    const updatesql = `
    UPDATE users SET name = ?, email = ? WHERE id = ?;
    `;
    try {
        const [result] = await db.query(updatesql, [name, email, user_id]);
        output.success = !!result.affectedRows;
        output.data = { name, email };
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});
// 修改密碼
router.post("/editPassword/api", async (req, res) => {
    let { oldpassword, password, passwordCheck } = req.body || {};

    const output = {
        success: false,
        error: {
            oldpassword: "",
            password: "",
            passwordCheck: "",
        },
        data: {},
        message: "",
        result: "",
    };

    const user_id = req.my_jwt?.id;
    if (!user_id) {
        output.message = "用戶未登入";
        return res.json(output);
    }
    const zResult = editPasswordschema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            oldpassword: "",
            password: "",
            passwordCheck: "",
        };
        const errMap = new Map();

        zResult.error?.issues.forEach((item) => {
            const pathKey = item.path[0];
            if (!errMap.has(pathKey)) {
                errMap.set(pathKey, item.message);
                newError[pathKey] = item.message;
            }
        });
        output.error = newError;
        return res.json(output);
    }

    const sql = `SELECT * FROM users WHERE id=?`;
    const [rows] = await db.query(sql, [user_id]);
    if (!rows.length) {
        output.message = "無此用戶";
        return res.json(output);
    }
    const row = rows[0];

    const result = await bcrypt.compare(oldpassword, row.password_hash);
    if (!result) {
        output.error.oldpassword = "舊密碼錯誤";
        return res.json(output);
    }
    if (password == oldpassword) {
        output.error.password = "與舊密碼相同";
        return res.json(output);
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const updatesql = `
        UPDATE users SET password_hash = ? WHERE id = ?;
        `;
        const [result] = await db.query(updatesql, [password_hash, user_id]);
        output.success = !!result.affectedRows;
        if (!output.success) {
            output.message = "密碼修改失敗";
        }
        output.result = "修改成功";
    } catch (ex) {
        output.error = ex;
    }
    return res.json(output);
});

// 重設密碼
router.post("/forgot-password/api", async (req, res) => {
    const { email } = req.body;
    const output = { success: false, error: "", message: "" };
    const sql = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.query(sql, [email]);
    if (!rows.length) {
        output.error = "⚠️ 錯誤的電子郵件";
        return res.json(output);
    }

    const token = jwt.sign(
        {
            id: rows[0].id,
            email: rows[0].email,
        },
        process.env.JWT_KEY,
        { expiresIn: "15m" } //15分鐘到期
    );
    
    const addsql =
        " INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, NOW() + INTERVAL 15 MINUTE)";
    await db.query(addsql, [rows[0].id, token]);

    // 發送 email
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
    await sendResetPasswordEmail({
        to: email,
        subject: "重設密碼連結",
        html: `<p>您好，</p>
            <p>請點擊以下連結重設您的密碼，連結 15 分鐘後失效：</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>如果您沒有申請重設密碼，請忽略此封信。</p>`,
    });

    output.success = true;
    output.message = "✅已發送密碼重設信，請至信箱確認";
    return res.json(output);
});

export default router;
