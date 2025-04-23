import express from "express";
import db from "./../utils/connect-mysql.js";
import { addOrderSchema } from "../utils/schema/addOrderSchema.js";
const router = express.Router();

// 進入團授權
export function requireGroupAccess() {
    return (req, res, next) => {
        const output = {
            error: "",
        };
        const jwt = req.my_jwt;
        const group_uuid = req.query.group_uuid;

        // 檢查 JWT 是否有效
        if (!jwt || !jwt.role || !jwt.group_uuid) {
            output.error = "未授權，無法獲取信息";
            return res.json(output); 
        }

        if (jwt.role === "guest" || jwt.group_uuid === group_uuid) {
            return next();
        }

        output.error = "無授權訪問此揪團";
        return res.json(output); 
    };
}

// 取得開團項目
router.get("/list/api", requireGroupAccess(), async (req, res) => {
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
        const tsql = `SELECT count(*) totalRows FROM ordergroups WHERE group_uuid=? AND is_active =1 ; `;
        const [[{ totalRows }]] = await db.query(tsql, [group_uuid]);

        if (totalRows === 0) {
            output.error = "查無此揪團";
            return res.json(output);
        }
        // 更新過期資訊
        const updatesql = ` UPDATE orderGroups SET status = 'closed' WHERE deadline < NOW() AND status = 'open'`;
        await db.query(updatesql);
        const sql = `SELECT * FROM ordergroups WHERE group_uuid=? AND is_active =1 ; `;
        const [result] = await db.query(sql, [group_uuid]);
        output.success = true;
        output.data = result[0];
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

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
        const sql = `SELECT menu_templates.fields,orderGroups.template FROM  orderGroups LEFT JOIN menu_templates ON orderGroups.template = menu_templates.name WHERE group_uuid =?; `;
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
        const sql = `SELECT * FROM orderGroups WHERE group_uuid=?; `;
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

// 付款狀態修改
router.post("/updatePaid/api", async (req, res) => {
    let { order_id, status } = req.body || {};
    const output = {
        success: false,
        status: status,
        error: "",
    };
    if (!order_id || typeof order_id !== "number") {
        output.error = "無效的訂單編號";
        return res.json(output);
    }
    if (status !== "Non-payment" && status !== "Paid") {
        output.error = "無效的狀態";
        return res.json(output);
    }

    try {
        const newStatus = status == "Non-payment" ? "Paid" : "Non-payment";
        const sql = `SELECT * FROM orders WHERE id=?`;
        const [rows] = await db.query(sql, order_id);
        if (!rows.length) {
            output.error = "無此訂單編號";
            return res.json(output);
        }
        // 修改
        const updatesql = `
        UPDATE orders SET status = ? WHERE id = ?;
        `;
        const [result] = await db.query(updatesql, [newStatus, order_id]);
        output.success = !!result.affectedRows;
        output.status = newStatus;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

// 刪除此筆訂單
router.delete("/delete/api", async (req, res) => {
    let { order_id } = req.body || {};
    const output = {
        success: false,
        result: "",
        error: "",
    };
    if (!order_id || typeof order_id !== "number") {
        output.error = "無效的訂單編號";
        return res.json(output);
    }

    try {
        const sql = `SELECT * FROM orders WHERE id=?`;
        const [rows] = await db.query(sql, order_id);
        if (!rows.length) {
            output.error = "無此訂單編號";
            return res.json(output);
        }
        // 修改
        const deletesql = `
        DELETE FROM  orders  WHERE id = ?;
        `;
        const [result] = await db.query(deletesql, [order_id]);
        output.success = !!result.affectedRows;
        output.result = "成功刪除";
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

export default router;
