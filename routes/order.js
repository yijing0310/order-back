import express from "express";
import db from "./../utils/connect-mysql.js";
import { addOrderSchema } from "../utils/schema/addOrderSchema.js";
const router = express.Router();

// 獲取該團訂購項目
router.get("/api", async (req, res) => {
    const output = {
        success: false,
        redirect: undefined,
        data: [],
        error: "",
        perPage: 12,
        totalRows: 0,
        totalPages: 0,
        page: 0,
        keyword: "",
    };
    const { group_uuid } = req.query;
    if (!group_uuid) {
        output.error = "缺少開團ID";
        return res.json(output);
    }
    const perPage = output.perPage;
    let page = +req.query.page || 1;
    if (page < 1) {
        output.redirect = `?page=1`;
        return res.json(output);
    }

    try {
        const tsql = `SELECT COUNT(*) AS totalRows FROM orders WHERE group_uuid=?; `;
        const [[{ totalRows }]] = await db.query(tsql, [group_uuid]);
        output.totalRows = totalRows;
        if (totalRows <= 0) {
            output.error = "沒有資料";
        }
        const totalPages = Math.ceil(totalRows / perPage);
        if (page > totalPages) {
            output.redirect = `?page=${totalPages}`;
            return res.json(output);
        }

        const sql = `SELECT * FROM orders WHERE group_uuid=?; `;
        const [result] = await db.query(sql, [group_uuid]);
        output.success = true;
        output.data = result;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

// 獲取開團模板
router.get("/templates/api", async (req, res) => {
    const output = {
        success: false,
        data: [],
        error: "",
    };
    const { group_uuid } = req.query;
    if (!group_uuid) {
        output.error = "缺少開團ID";
        return res.json(output);
    }

    try {
        const sql = `SELECT menu_templates.fields FROM  orderGroups LEFT JOIN menu_templates ON orderGroups.template = menu_templates.name WHERE group_uuid =?; `;
        const [[result]] = await db.query(sql, [group_uuid]);
        output.success = true;
        output.data = result;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

// 新增訂單
router.post("/add/api", async (req, res) => {
    let { group_uuid, name, item_name, quantity, price, note } = req.body || {};

    const output = {
        success: false,
        error: {
            group_uuid: "",
            name: "",
            item_name: "",
            quantity: "",
            price: "",
            note: "",
        },
        data: {
            name: 0,
            item_name: "",
        },
    };

    const zResult = addOrderSchema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            group_uuid: "",
            name: "",
            item_name: "",
            quantity: "",
            price: "",
            note: "",
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

    try {
        const sql = `SELECT * FROM orders WHERE group_uuid=?; `;
        const [ensureUuid] = await db.query(sql, [group_uuid]);
        if (!ensureUuid.length) {
            output.error = "查無此開團ID";
            return res.json(output);
        }

        // 新增
        const addsql = `
        INSERT INTO orders (group_uuid, name, item_name, quantity, price, note) VALUES (?, ?, ?, ?, ?, ?);
        `;
        const [result] = await db.query(addsql, [
            group_uuid,
            name,
            item_name,
            quantity,
            price,
            note,
        ]);
        output.result = result;
        output.success = !!result.affectedRows;
        output.error = {};
        output.data.name = name;
        output.data.item_name = item_name;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

export default router;
