import db from "./connect-mysql.js";
import cron from 'node-cron';
cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toISOString()}] ⏰ Checking for expired orderGroups...`);
  
    try {
      const [result] = await db.execute(`
        UPDATE orderGroups
        SET status = 'closed'
        WHERE deadline < NOW()
          AND status = 'open'
      `);
  
      console.log(`[${new Date().toISOString()}] ✅ Updated ${result.affectedRows} rows to 'closed'`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error updating orderGroups:`, error);
    }
  });
