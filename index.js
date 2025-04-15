import express from "express";
import db from "./utils/connect-mysql.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import bcrypt from "bcrypt";
import adminRouter from "./routes/admin.js";
const app = express();
app.use(express.static("public"));
// **** top-level middlewares 頂層中介軟體 ****
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        console.log({ origin });
        callback(null, true);
    },
};
app.use(cors(corsOptions));

// ========== 自訂義中間件 ==========
app.use((req, res, next) => {
    const auth = req.get("Authorization");
    if (auth && auth.indexOf("Bearer ") === 0) {
        const token = auth.slice(7); // 去掉 'Bearer '
        try {
            req.my_jwt = jwt.verify(token, process.env.JWT_KEY);
        } catch (ex) {}
    }
    next();
});
// ========== 路由模組 ===========
app.use("/admin", adminRouter);

app.get("/", async (req, res) => {
    const sql = `SELECT * FROM users`;
    const [result] = await db.query(sql);
    res.json(result);
});
// JWT
app.post("/login-jwt", async (req, res) => {
    let { account, password } = req.body || {};
    const output = {
        success: false,
        error: "",
        code: 0,
        data: {
            id: 0,
            account: "",
            name: "",
            token: "",
        },
    };
    console.log(account, password);
    account = account?.trim();
    password = password?.trim();

    if (!account || !password) {
        output.error = "欄位資料不足";
        output.code = 400;
        return res.json(output);
    }
    const sql = `SELECT * FROM users WHERE account=?`;
    const [rows] = await db.query(sql, [account]);
    if (!rows.length) {
        output.error = "帳號或密碼錯誤";
        output.code = 410;
        return res.json(output);
    }
    const row = rows[0];
    const result = await bcrypt.compare(password, row.password_hash);
    if (!result) {
        output.error = "帳號或密碼錯誤";
        output.code = 420;
        return res.json(output);
    }
    output.success = true;
    const token = jwt.sign(
        {
            id: row.member_id,
            account: row.account,
        },
        process.env.JWT_KEY,
        { expiresIn: "12h" }
    );
    output.data = {
        id: row.id,
        email: row.email,
        account: row.account,
        name: row.name,
        token,
    };
    return res.json(output);
});

// ================== 端口設定 ====================
const port = process.env.WEB_PORT || 3002;
app.listen(port, function () {
    console.log(`伺服器已啟動...端口${port}監聽中`);
});
