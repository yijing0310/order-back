import express from "express";
import { registerSchema } from "../utils/schema/rschema.js";
import { editProfileSchema } from "../utils/schema/editProfileschema.js";
import db from "./../utils/connect-mysql.js";
import bcrypt from "bcrypt";
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
        output.ex = ex;
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
        data: {},
    };
    const user_id = req.my_jwt?.id;
    if (!user_id) {
        output.error = "用戶未登入";
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
        output.error = "找不到該使用者";
        return res.json(output);
    }
    const original = originalRows[0];
    if (original.name === name && original.email === email) {
        output.error = "你沒有修改任何資料";
        return res.json(output);
    }

    const updatesql = `
    UPDATE users SET name = ?, email = ? WHERE id = ?;
    `;
    try {
        const [result] = await db.query(updatesql, [name, email,user_id]);
        output.success = !!result.affectedRows;
        output.data = { name, email };
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});
// 

export default router;
