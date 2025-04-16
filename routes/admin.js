import express from "express";
import { registerSchema } from "../utils/schema/rschema.js";
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

export default router;
