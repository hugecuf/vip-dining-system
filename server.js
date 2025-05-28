const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
const db = new sqlite3.Database('vip_dining.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS vip_dining (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            dining_date DATE NOT NULL,
            dining_time TIME NOT NULL,
            party_size INTEGER NOT NULL,
            table_type TEXT NOT NULL,
            occasion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ 資料表建立完成');
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/vip-dining', (req, res) => {
    const { customerName, phone, diningDate, diningTime, partySize, tableType, occasion } = req.body;
    
    if (!customerName || !phone || !diningDate || !diningTime || !partySize || !tableType) {
        return res.status(400).json({ error: '請填寫所有必填欄位' });
    }

    const sql = `
        INSERT INTO vip_dining (customer_name, phone, dining_date, dining_time, party_size, table_type, occasion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [customerName, phone, diningDate, diningTime, partySize, tableType, occasion || ''], function(err) {
        if (err) {
            console.error('新增資料錯誤:', err);
            return res.status(500).json({ error: '新增資料失敗' });
        }
        
        res.json({ 
            message: '新增成功', 
            id: this.lastID 
        });
    });
});
app.get('/api/vip-dining', (req, res) => {
    const sql = 'SELECT * FROM vip_dining ORDER BY created_at DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('查詢資料錯誤:', err);
            return res.status(500).json({ error: '查詢資料失敗' });
        }
        
        res.json(rows);
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: '系統運行正常',
        time: new Date().toLocaleString('zh-TW')
    });
});

app.listen(PORT, () => {
    console.log(`🚀 伺服器啟動成功！`);
    console.log(`📱 網址: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/vip-dining`);
});

process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});