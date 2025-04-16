import express from "express";
import { addGroupSchema } from "../utils/schema/addGroupSchema.js";
import db from "./../utils/connect-mysql.js";
const router = express.Router();

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
    console.log(user_id);

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

    // 新增
    const addsql = `
    INSERT INTO orderGroups (owner_id,title,restaurant,menu_link,max_people,deadline,password,description,template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    try {
        const [result] = await db.query(addsql, [
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
    } catch (ex) {
        output.ex = ex;
    }
    return res.json(output);
});

export default router;
