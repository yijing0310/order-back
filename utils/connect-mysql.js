import mysql from "mysql2/promise"

const {DB_HOST, DB_USER,DB_PASS,DB_NAME,DB_PORT} = process.env; //解構賦值
console.log({ DB_HOST, DB_USER, DB_PASS, DB_NAME }) //查看環境變數
// 數據庫連接池
const db = mysql.createPool({
// 連線設定
host: DB_HOST,
user: DB_USER,
password: DB_PASS,
database: DB_NAME,
// port: DB_PORT, // 如果使用 3306 以外的通訊埠需要設定
waitForConnections: true, //如果滿了可以排隊等待,false 滿了請求被拒絕跳出警告
connectionLimit: 5, //限制連線數
queueLimit: 0, //控制請求排隊數量,超過就會被拒絕 ,0 是一直排下去
})

export default db