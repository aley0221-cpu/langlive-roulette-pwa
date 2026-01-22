# 🔧 網址無法訪問故障排除指南

## ✅ 本地構建測試
本地構建已成功，代碼沒有問題。

## 🔍 檢查步驟

### 步驟 1: 確認 Vercel 部署狀態

1. **前往 Vercel Dashboard**
   - 打開：https://vercel.com/dashboard
   - 登入你的帳號（aley0221@gmail.com）

2. **找到專案**
   - 在 Dashboard 中找到 `langlive-roulette-pwa` 專案
   - 點擊進入專案

3. **檢查部署狀態**
   - 點擊 "Deployments" 標籤
   - 查看最新的部署：
     - ✅ **綠色 "Ready"** = 部署成功
     - ❌ **紅色 "Failed"** = 部署失敗
     - ⏳ **黃色 "Building"** = 正在構建

### 步驟 2: 檢查部署日誌

如果部署失敗：
1. 點擊失敗的部署
2. 查看 "Build Logs"
3. 找出錯誤訊息

常見錯誤：
- `vite: command not found` → 需要確保 `package-lock.json` 已上傳
- `Module not found` → 缺少檔案
- `Build failed` → 構建錯誤

### 步驟 3: 確認網址

正確的網址格式應該是：
- `https://langlive-roulette-pwa.vercel.app`
- 或 `https://langlive-roulette-pwa-[隨機字串].vercel.app`

**重要**：
- ✅ 必須使用 `https://`（不是 `http://`）
- ✅ 必須包含完整域名
- ❌ 不要使用 `www.`

### 步驟 4: 重新部署

如果部署失敗或需要更新：

**方法 A: 使用 Vercel Dashboard**
1. 前往專案頁面
2. 點擊 "Deployments"
3. 找到最新部署
4. 點擊 "..." → "Redeploy"

**方法 B: 推送新的 Commit 到 GitHub**
1. 確保所有檔案已提交到 GitHub
2. Vercel 會自動觸發新的部署

**方法 C: 使用 Vercel CLI**
```bash
vercel --prod
```

## 🐛 常見問題解決

### 問題 1: 404 錯誤
**原因**：路由配置問題

**解決**：
- 確認 `vercel.json` 存在且正確
- 確認 `rewrites` 規則正確

### 問題 2: 白屏
**原因**：JavaScript 錯誤或資源載入失敗

**解決**：
1. 檢查瀏覽器控制台（F12）
2. 查看 Network 標籤，確認所有資源都載入成功
3. 清除瀏覽器快取後重試

### 問題 3: 手機無法訪問
**原因**：
- 網址錯誤
- 網路問題
- HTTPS 證書問題

**解決**：
1. 確認使用正確的 HTTPS 網址
2. 嘗試用電腦瀏覽器先測試
3. 檢查手機網路連線
4. 嘗試清除手機瀏覽器快取

### 問題 4: 部署一直失敗
**原因**：構建配置錯誤

**解決**：
1. 檢查 Vercel 專案設定：
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
2. 確認 `package-lock.json` 已上傳到 GitHub
3. 清除 Vercel 構建快取後重新部署

## 📱 手機測試步驟

1. **確認網址正確**
   - 在電腦瀏覽器先測試：`https://langlive-roulette-pwa.vercel.app`
   - 如果電腦可以訪問，再用手機測試

2. **手機瀏覽器測試**
   - 打開 Chrome 或 Samsung Internet
   - 輸入完整網址（包含 `https://`）
   - 等待頁面載入

3. **檢查錯誤**
   - 如果顯示錯誤訊息，記下錯誤內容
   - 嘗試重新整理頁面
   - 清除瀏覽器快取後重試

## 🔄 快速修復方案

如果以上都不行，嘗試：

1. **刪除並重新創建專案**
   - 在 Vercel Dashboard 刪除舊專案
   - 重新從 GitHub 導入

2. **檢查 GitHub 倉庫**
   - 確認所有檔案都已上傳
   - 確認 `package.json`、`vite.config.ts`、`vercel.json` 都存在

3. **手動觸發部署**
   - 在 Vercel Dashboard 手動觸發新的部署

## 📞 需要更多幫助？

請提供：
1. Vercel Dashboard 的部署狀態截圖
2. 瀏覽器顯示的錯誤訊息
3. 手機瀏覽器顯示的錯誤訊息（如果有）
4. 完整的網址（你實際使用的網址）

這樣可以更準確地診斷問題。
