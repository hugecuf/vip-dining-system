// VIP用餐資料管理系統 - 完整版伺服器程式
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 3000;

// 中間件設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 建立或連接資料庫
const db = new sqlite3.Database('vip_dining.db', (err) => {
    if (err) {
        console.error('資料庫連接錯誤:', err);
    } else {
        console.log('✅ 資料庫連接成功');
    }
});

// 初始化資料庫表格
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
    `, (err) => {
        if (err) {
            console.error('❌ 建立資料表錯誤:', err);
        } else {
            console.log('✅ 資料表建立完成');
        }
    });
});

// 路由 1: 首頁
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    console.log('尋找檔案:', filePath);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ 檔案發送錯誤:', err);
            res.status(500).send(`
                <h1>檔案載入錯誤</h1>
                <p>找不到 index.html 檔案</p>
                <p>檔案路徑: ${filePath}</p>
                <p>錯誤: ${err.message}</p>
            `);
        }
    });
});

// 路由 2: 測試頁面
app.get('/test', (req, res) => {
    res.send(`
        <h1>🍽️ VIP用餐資料管理系統測試頁面</h1>
        <p>伺服器正常運行！</p>
        <p>時間: ${new Date().toLocaleString('zh-TW')}</p>
        <p><a href="/">返回首頁</a></p>
        <p><a href="/api/health">API 健康檢查</a></p>
    `);
});

// 路由 3: 新增VIP用餐資料 (POST)
app.post('/api/vip-dining', (req, res) => {
    console.log('📝 收到新增請求:', req.body);
    
    const { customerName, phone, diningDate, diningTime, partySize, tableType, occasion } = req.body;
    
    // 檢查必填欄位
    if (!customerName || !phone || !diningDate || !diningTime || !partySize || !tableType) {
        console.log('❌ 缺少必填欄位');
        return res.status(400).json({ 
            error: '請填寫所有必填欄位',
            missing: { customerName, phone, diningDate, diningTime, partySize, tableType }
        });
    }

    // 插入資料到資料庫
    const sql = `
        INSERT INTO vip_dining (customer_name, phone, dining_date, dining_time, party_size, table_type, occasion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [customerName, phone, diningDate, diningTime, parseInt(partySize), tableType, occasion || ''];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ 新增資料錯誤:', err);
            return res.status(500).json({ 
                error: '新增資料失敗',
                details: err.message 
            });
        }
        
        console.log('✅ 新增資料成功, ID:', this.lastID);
        res.status(201).json({ 
            message: '新增成功', 
            id: this.lastID,
            data: {
                id: this.lastID,
                customer_name: customerName,
                phone: phone,
                dining_date: diningDate,
                dining_time: diningTime,
                party_size: parseInt(partySize),
                table_type: tableType,
                occasion: occasion || ''
            }
        });
    });
});

// 路由 4: 取得所有VIP用餐資料 (GET)
app.get('/api/vip-dining', (req, res) => {
    console.log('📊 查詢所有資料');
    
    const sql = 'SELECT * FROM vip_dining ORDER BY created_at DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ 查詢資料錯誤:', err);
            return res.status(500).json({ 
                error: '查詢資料失敗',
                details: err.message 
            });
        }
        
        console.log(`✅ 查詢成功，共 ${rows.length} 筆資料`);
        res.json(rows);
    });
});

// 路由 5: 根據ID取得特定資料 (GET)
app.get('/api/vip-dining/:id', (req, res) => {
    const id = req.params.id;
    console.log('🔍 查詢特定資料, ID:', id);
    
    const sql = 'SELECT * FROM vip_dining WHERE id = ?';
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ 查詢資料錯誤:', err);
            return res.status(500).json({ 
                error: '查詢資料失敗',
                details: err.message 
            });
        }
        
        if (!row) {
            return res.status(404).json({ 
                error: '找不到指定的用餐資料',
                id: id 
            });
        }
        
        console.log('✅ 查詢成功, ID:', id);
        res.json(row);
    });
});

// 路由 6: 系統健康檢查
app.get('/api/health', (req, res) => {
    // 測試資料庫連接
    db.get('SELECT COUNT(*) as count FROM vip_dining', (err, row) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: '資料庫連接失敗',
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            status: 'healthy',
            message: 'VIP用餐資料管理系統運行正常',
            database: 'connected',
            totalRecords: row.count,
            timestamp: new Date().toLocaleString('zh-TW'),
            version: '1.0.0'
        });
    });
});

// 路由 7: API 文件
app.get('/api', (req, res) => {
    res.json({
        name: 'VIP用餐資料管理系統 API',
        version: '1.0.0',
        endpoints: {
            'GET /': '首頁',
            'GET /test': '測試頁面',
            'GET /api/health': '系統健康檢查',
            'GET /api/vip-dining': '取得所有用餐資料',
            'POST /api/vip-dining': '新增用餐資料',
            'GET /api/vip-dining/:id': '取得特定用餐資料'
        },
        timestamp: new Date().toLocaleString('zh-TW')
    });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('❌ 伺服器錯誤:', err.stack);
    res.status(500).json({ 
        error: '伺服器內部錯誤',
        message: err.message 
    });
});

// 404 處理
app.use((req, res) => {
    console.log('❌ 404 - 找不到路由:', req.path);
    res.status(404).json({ 
        error: '找不到請求的資源',
        path: req.path,
        timestamp: new Date().toLocaleString('zh-TW')
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log('\n🚀 =====================================');
    console.log(`   VIP用餐資料管理系統已啟動`);
    console.log(`   伺服器運行在: http://localhost:${PORT}`);
    console.log(`   API 端點: http://localhost:${PORT}/api/vip-dining`);
    console.log(`   測試頁面: http://localhost:${PORT}/test`);
    console.log(`   健康檢查: http://localhost:${PORT}/api/health`);
    console.log('🚀 =====================================\n');
});

// 優雅關閉處理
process.on('SIGINT', () => {
    console.log('\n🛑 正在關閉伺服器...');
    db.close((err) => {
        if (err) {
            console.error('❌ 關閉資料庫錯誤:', err);
        } else {
            console.log('✅ 資料庫連接已關閉');
        }
        console.log('👋 伺服器已關閉');
        process.exit(0);
    });
});

// 處理未捕獲的異常
process.on('uncaughtException', (err) => {
    console.error('❌ 未捕獲的異常:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
    process.exit(1);
});