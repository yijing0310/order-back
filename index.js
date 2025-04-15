import express from "express"
import db from "./utils/connect-mysql.js"
import cors from "cors"
import adminRouter from "./routes/admin.js"
const app = express()
app.use(express.static("public"))
const corsOptions = {
    credentials:true,
    origin: (origin, callback) => {
    //console.log({origin});
    callback(null,true) //true就是給用
    }
    }
    app.use(cors(corsOptions))
// ========== 路由模組 ===========
app.use("/admin",adminRouter)


// ========== 自訂義中間件 ==========
app.use((req,res,next) => {
    next()
})

app.get("/",async(req,res) =>{
    const sql = `SELECT * FROM member`
    const result = await db.query(sql)
    res.json(result)
})






// ================== 端口設定 ====================
const port = process.env.WEB_PORT || 3002
app.listen(port,function(){
    console.log(`伺服器已啟動...端口${port}監聽中`);
    
})