# 🎢 六福村動態定價研究 v2.2

東海大學 數位創新碩士學位學程｜碩士論文研究用網站

---

## 📁 檔案結構

```
leofoo-dynamic-pricing-survey/
├── index.html          # 落地頁（研究說明 + 同意書）
├── t1.html             # T1 票價列表頁
├── t1-survey.html      # T1 問卷（9 題）
├── filler.html         # 填充任務（30 秒心理重置）
├── t2.html             # T2 漲價 + 策略頁（5 組畫面）
├── t2-survey.html      # T2 問卷（14 題）
├── t3.html             # T3 結帳頁（立即購票 vs 下次再說）
├── t3-survey.html      # T3 問卷（7 題）
├── final.html          # 末頁（人口統計 + 後置操弄檢核）
├── complete.html       # 完成頁
├── css/
│   └── style.css       # 統一樣式
└── js/
    ├── supabase-config.js   # Supabase 連線設定
    ├── session.js           # Session 管理
    ├── tracking.js          # 事件追蹤
    └── survey.js            # 問卷渲染與提交
```

---

## 🚀 部署到 GitHub Pages（10 分鐘）

### Step 1：建立新的 GitHub Repository

1. 登入 https://github.com/TomChiu1224
2. 點右上角「+」→「New repository」
3. Repository name 填：**`leofoo-dynamic-pricing-survey`**
4. 選 **Public**
5. **不要勾** Add a README file（我們手動上傳）
6. 點 **Create repository**

### Step 2：上傳檔案

**方法 A：透過網頁上傳（推薦，最簡單）**

1. 在 repo 頁面點「uploading an existing file」
2. 把整個 `leofoo-dynamic-pricing-survey` 資料夾的所有檔案**拖曳上傳**
3. 確認結構正確（index.html 在根目錄，css/ 和 js/ 是子資料夾）
4. 滾到底，Commit message 填：「Initial commit」
5. 點綠色 **Commit changes**

**方法 B：用 Git 指令（如果你熟悉）**

```bash
cd leofoo-dynamic-pricing-survey
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TomChiu1224/leofoo-dynamic-pricing-survey.git
git push -u origin main
```

### Step 3：啟用 GitHub Pages

1. 在 repo 頁面點 **Settings**（齒輪）
2. 左側選單找 **Pages**
3. **Source** 選擇 **Deploy from a branch**
4. **Branch** 選 **main**，**folder** 選 **/(root)**
5. 點 **Save**
6. **等 1-2 分鐘**，頁面會顯示：
   ```
   ✅ Your site is live at https://tomchiu1224.github.io/leofoo-dynamic-pricing-survey/
   ```

### Step 4：測試網站

1. 打開上面那個網址
2. 應該會看到落地頁
3. 點「開始填答」走完整個流程
4. 完成後到 Supabase Table Editor 確認資料

---

## ✅ 部署完成檢核清單

打開以下網址依序測試（替換 `tomchiu1224` 為你的 GitHub 帳號）：

| 頁面 | 預期看到 |
|------|---------|
| https://tomchiu1224.github.io/leofoo-dynamic-pricing-survey/ | 研究說明頁 |
| 點「開始填答」 | 跳到 t1.html 票價列表 |
| 等 8 秒後按鈕亮起 | 跳到 t1-survey.html 第一階段問卷（9 題） |
| 完成 T1 問卷 | 跳到 filler.html 填充任務 |
| 完成填充 | 跳到 t2.html（5 組之一隨機顯示） |
| 等 10 秒按鈕亮起 | 跳到 t2-survey.html 第二階段問卷（14 題） |
| 完成 T2 問卷 | 跳到 t3.html 結帳頁 |
| 點任一按鈕 | 跳到 t3-survey.html 第三階段問卷（7 題） |
| 完成 T3 問卷 | 跳到 final.html 末頁 |
| 完成末頁 | 跳到 complete.html 完成頁 |

---

## 📊 Supabase 資料驗證

到 https://supabase.com/dashboard/project/qcjlygebapjudvzgkdlq/editor 確認：

| 表 | 你應該看到 |
|----|---------|
| sessions | 1 筆紀錄，assigned_group 有值，completed=true |
| demographics | 1 筆紀錄，6 個欄位都有值 |
| events | 多筆 page_view / click_buy 等事件 |
| surveys | 27 筆紀錄（T1 + filler + T2 + T3 + 末頁的操弄檢核） |
| orders | 1 筆紀錄，status 是 completed 或 abandoned |

---

## 🔧 Pilot Test 流程（部署後執行）

### 預試目的
- 確認所有頁面流程順暢
- 檢查手機端顯示正常
- 驗證資料寫入正確
- 估算實際填答時間

### 預試人數
**建議 15-20 人**（5 組各 3-4 人，可不平均，主要測試系統穩定性）

### 預試步驟

1. **找 15-20 位朋友 / 家人**
2. **發送網址**：`https://tomchiu1224.github.io/leofoo-dynamic-pricing-survey/`
3. 請他們：
   - 使用 **手機** 完成填答（70% 受試者會用手機）
   - 記錄填答時間
   - 回報任何「卡住」或「不順」的地方
4. **觀察 Supabase 即時數據**：
   - 開啟 Supabase Dashboard → Table Editor → sessions 表
   - 看新紀錄即時進來
   - 確認 assigned_group 平均分布（不會某組過多）

### 預試後檢核

到 Supabase SQL Editor 跑這段：

```sql
-- 看每組完成數
SELECT * FROM v_group_progress;

-- 看完整資料分布
SELECT
  step,
  qid,
  COUNT(*) as count,
  AVG(answer_numeric) as avg_score
FROM surveys
WHERE step IN ('T1', 'T2', 'T3')
GROUP BY step, qid
ORDER BY step, qid;
```

### 預試常見問題與解法

| 問題 | 可能原因 | 解法 |
|------|---------|------|
| 頁面跑不出來 | 網路 / Supabase 連線 | 檢查 supabase-config.js 設定 |
| 重複填答 | sessionStorage 沒清 | 受試者開無痕視窗 |
| 手機顯示異常 | CSS 響應式問題 | 截圖給我修 |
| 某組從沒出現 | 隨機分組異常 | 連跑 30 次測試分組分布 |

---

## 🎯 正式收問卷

### 發放管道

| 管道 | 預估觸及 | 預估完成率 |
|------|---------|---------|
| PTT 八卦 / 心理 / 樂園版 | 500-1000 | 5-10% |
| Dcard 心理 / 心情 / 閒聊版 | 300-500 | 10-15% |
| FB 大學社團 | 200-400 | 15-20% |
| LINE 群組（系上、家人） | 50-100 | 40-50% |
| Email（教授協助轉發） | 100-200 | 20-30% |

**綜合預估**：發出去 600-1000 次曝光 → 收到 350-400 份有效樣本

### 發文範本（複製貼上）

```
【匿名問卷｜消費者對遊樂園票價的看法（6-7 分鐘）】

大家好！我是東海大學數位創新碩士班的學生，
正在進行碩士論文研究，
想了解大家對於遊樂園動態定價的看法。

📋 內容：模擬六福村售票網站 + 3 階段問卷
⏱️ 時間：6-7 分鐘
🔒 完全匿名，僅供學術研究使用

問卷連結：https://tomchiu1224.github.io/leofoo-dynamic-pricing-survey/

希望能得到大家的協助，謝謝！🙏

(請用手機填答效果最佳)
```

### 即時監控進度

在 Supabase SQL Editor 跑：

```sql
SELECT
  assigned_group,
  COUNT(*) FILTER (WHERE completed = TRUE) as completed,
  COUNT(*) FILTER (WHERE completed = FALSE) as in_progress,
  COUNT(*) as total
FROM sessions
GROUP BY assigned_group
ORDER BY assigned_group;
```

**目標：每組至少 70 個 completed，總計 350+**

---

## 🔒 安全性說明

### 為什麼這個網站是安全的？

| 攻擊類型 | 是否可能 | 防護機制 |
|---------|---------|---------|
| 看別人填的問卷 | ❌ 不可能 | RLS 政策禁止 SELECT |
| 刪除你的資料 | ❌ 不可能 | RLS 政策禁止 DELETE |
| 修改別人的答案 | ❌ 不可能 | UPDATE 只允許 sessions.completed |
| 灌水 / 重複填答 | ⚠️ 部分防護 | sessionStorage 限制（無痕視窗可繞過） |
| 機器人攻擊 | ⚠️ 無 | 視情況可加 Cloudflare Turnstile |

### 如果遇到大量機器人灌水

**告訴我**，我會幫你加上：
- Cloudflare Turnstile（免費 CAPTCHA）
- 填答時間檢核（< 3 分鐘視為機器人）
- IP 限制（每 IP 24 小時內限填一次）

---

## 📞 緊急聯絡

如有任何問題：
1. **網站打不開** → 檢查 GitHub Pages 是否啟用
2. **資料沒寫入 Supabase** → 檢查 supabase-config.js 的 key 是否正確
3. **手機顯示破版** → 截圖傳給我修
4. **填答中斷無法繼續** → 開無痕視窗重新填答

---

## ✅ 模組 B 完成檢核

- [x] 10 個 HTML 頁面
- [x] 統一 CSS 樣式
- [x] 5 個 JS 模組
- [x] Supabase 後端對接
- [x] 隨機分組 + 題項順序隨機
- [x] 學術免責聲明
- [x] 手機響應式
- [x] 進度條
- [x] 防跳關機制
- [x] 部署指引

🎉 **接下來只剩部署 + Pilot Test + 正式收問卷！**
