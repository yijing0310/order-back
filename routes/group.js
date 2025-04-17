import express from "express";
import { addGroupSchema } from "../utils/schema/addGroupSchema.js";
import db from "./../utils/connect-mysql.js";
import { nanoid } from 'nanoid';

const router = express.Router();
// 我的開團 TODO: 分頁
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
    const user_id = req.my_jwt?.id;
    if (!user_id) {
        output.error = "用戶未登入";
        return res.json(output);
    }
    const perPage = output.perPage;
    let page = +req.query.page || 1;
    if (page < 1) {
        output.redirect = `?page=1`;
        return res.json(output);
    }

    try {
        const tsql = `SELECT COUNT(*) AS totalRows FROM orderGroups WHERE owner_id=?; `;
        const [[{ totalRows }]] = await db.query(tsql, [user_id]);
        output.totalRows = totalRows;
        if (totalRows <= 0) {
            output.error = "沒有資料";
        }
        const totalPages = Math.ceil(totalRows / perPage);
        if (page > totalPages) {
            output.redirect = `?page=${totalPages}`;
            return output;
        }
        // 更新過期資訊
        const updatesql = ` UPDATE orderGroups SET status = 'closed' WHERE deadline < NOW() AND status = 'open'`;
        const [updateResult] = await db.query(updatesql);

        const sql = `SELECT * FROM orderGroups WHERE owner_id=?; `;
        const [result] = await db.query(sql, [user_id]);
        output.success = true;
        output.data = result;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});
// 開團
router.post("/add/api", async (req, res) => {
    let {
        title,
        restaurant,
        menuLink,
        limit,
        endTime,
        password,
        template,
        note,
    } = req.body || {};
    const user_id = req.my_jwt?.id;

    const output = {
        success: false,
        error: {
            title: "",
            restaurant: "",
            menuLink: "",
            limit: "",
            endTime: "",
            password: "",
            template: "",
            note: "",
        },
        data: {
            user_id: 0,
            title: "",
        },
    };
    if (!user_id) {
        output.error = "用戶未登入";
        return res.json(output);
    }
    const zResult = addGroupSchema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            title: "",
            restaurant: "",
            menuLink: "",
            limit: "",
            endTime: "",
            password: "",
            template: "",
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
    const uuid = nanoid(10);
    // 新增
    const addsql = `
    INSERT INTO orderGroups (group_uuid,owner_id,title,restaurant,menu_link,max_people,deadline,password,description,template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    try {
        const [result] = await db.query(addsql, [
            uuid, 
            user_id,
            title,
            restaurant,
            menuLink,
            limit,
            endTime,
            password,
            note,
            template,
        ]);
        output.result = result;
        output.success = !!result.affectedRows;
        output.error = {};
        output.data.user_id = user_id;
        output.data.title = title;
        output.data.group_uuid = uuid;
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

export default router;
