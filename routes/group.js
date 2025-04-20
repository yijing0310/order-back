import express from "express";
import { addGroupSchema } from "../utils/schema/addGroupSchema.js";
import { editGroupSchema } from "../utils/schema/editGroupSchema.js";
import db from "./../utils/connect-mysql.js";
import { nanoid } from "nanoid";

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
        const tsql = `SELECT COUNT(*) AS totalRows FROM orderGroups WHERE owner_id=? AND is_active =1; `;
        const [[{ totalRows }]] = await db.query(tsql, [user_id]);
        output.totalRows = totalRows;
        if (totalRows <= 0) {
            output.error = "沒有資料";
        }
        const totalPages = Math.ceil(totalRows / perPage);
        if (page > totalPages) {
            output.redirect = `?page=${totalPages}`;
            return res.json(output);
        }
        // 更新過期資訊
        const updatesql = ` UPDATE orderGroups SET status = 'closed' WHERE deadline < NOW() AND status = 'open'`;
        const [updateResult] = await db.query(updatesql);

        const sql = `SELECT * FROM orderGroups WHERE owner_id=? AND is_active =1 ORDER BY created_at desc ; `;
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
        tel,
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
            tel: "",
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
            tel: "",
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
    INSERT INTO orderGroups (group_uuid,owner_id,title,restaurant,tel,menu_link,max_people,deadline,password,description,template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    try {
        const [result] = await db.query(addsql, [
            uuid,
            user_id,
            title,
            restaurant,
            tel,
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

// 加入開團
router.post("/join/api", async (req, res) => {
    const { group_uuid, password } = req.body;
    const output = {
        success: false,
        group_uuid: "",
        error: { group_uuid: "", password: "" },
    };
    if (!group_uuid?.trim()) {
        output.error.group_uuid = "請輸入揪團ID";
        return res.json(output);
    }
    try {
        const sql = `SELECT * FROM orderGroups WHERE group_uuid = ? AND is_active =1  LIMIT 1`;
        const [rows] = await db.query(sql, [group_uuid]);

        if (!rows.length) {
            output.error.group_uuid = "查無此揪團";
            return res.json(output);
        }

        const group = rows[0];
        if (group.password) {
            if (!password?.trim()) {
                output.error.password = "請輸入密碼";
                return res.json(output);
            }

            if (group.password !== password) {
                output.error.password = "密碼錯誤";
                return res.json(output);
            }
        }
    } catch (err) {
        output.error = "伺服器錯誤，請稍後再試";
        return res.json(output);
    }

    output.success = true;
    output.group_uuid = group_uuid;
    output.error = "";
    return res.json(output);
});

// 刪除開團
router.post("/delete/api", async (req, res) => {
    const { group_uuid } = req.body;
    const output = {
        success: false,
        group_uuid: "",
        error: {},
    };
    if (!group_uuid) {
        output.error.group_uuid = "請輸入揪團ID";
        return res.json(output);
    }
    try {
        const sql = `UPDATE orderGroups 
                    SET is_active = 0, status='closed' 
                    WHERE group_uuid = ? AND is_active = 1;
                    `;
        const [result] = await db.query(sql, [group_uuid]);
        output.success = !!result.affectedRows;
        output.group_uuid = group_uuid;
        output.error = "";
        if (!output.success) {
            output.error = "無符合條件的資料可刪除或已被刪除";
            return res.json(output);
        }
        return res.json(output);
    } catch (err) {
        output.error = "伺服器錯誤，請稍後再試";
        return res.json(output);
    }
});

// 編輯揪團
router.post("/edit/api", async (req, res) => {
    let { group_uuid, tel, menuLink, limit, endTime, password, note } =
        req.body || {};

    const output = {
        success: false,
        error: {
            tel: "",
            menuLink: "",
            limit: "",
            endTime: "",
            password: "",
            note: "",
        },
        result: "",
    };
    if (!group_uuid) {
        output.error = "無此揪團";
        return res.json(output);
    }
    const tsql = `SELECT count(*) totalRows FROM ordergroups WHERE group_uuid=? AND is_active =1 ; `;
    const [[{totalRows}]] = await db.query(tsql, [group_uuid]);

    if (totalRows === 0) {
        output.error = "查無此揪團";
        return res.json(output);
    }
    const zResult = editGroupSchema.safeParse(req.body);
    if (!zResult.success) {
        const newError = {
            tel: "",
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

    // 新增
    const updatesql = `
    UPDATE orderGroups 
    SET 
        tel = ?, 
        menu_link = ?, 
        max_people = ?, 
        deadline = ?, 
        password = ?, 
        description = ?
    WHERE 
        group_uuid = ?;

    `;
    try {
        const [result] = await db.query(updatesql, [
            tel,
            menuLink,
            limit,
            endTime,
            password,
            note,
            group_uuid,
        ]);
        output.success = !!result.affectedRows;
        output.error = {};
        output.result = "編輯成功";
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});
export default router;
