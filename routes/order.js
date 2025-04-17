import express from "express";
import db from "./../utils/connect-mysql.js";
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

export default router;
