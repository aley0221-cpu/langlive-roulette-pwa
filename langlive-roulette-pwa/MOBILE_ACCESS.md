# 📱 手機訪問指南

## 🔗 如何找到你的 Vercel 網址

### 方法 1: Vercel Dashboard（最簡單）

1. **登入 Vercel**
   - 打開瀏覽器，前往：https://vercel.com
   - 使用你的帳號登入

2. **找到你的專案**
   - 登入後會看到 Dashboard
   - 找到專案名稱（例如：`langlive-roulette-pwa`）
   - 點擊專案

3. **查看部署網址**
   - 在專案頁面，你會看到：
     - **Production** 或 **Latest Deployment**
     - 網址格式：`https://your-project-name.vercel.app`
   - **這就是你要輸入的網址！**

### 方法 2: 部署完成後的訊息

如果你使用 Vercel CLI 部署，完成後會顯示：
```
✅ Production: https://your-project-name.vercel.app [copied to clipboard]
```

### 方法 3: 檢查部署歷史

1. 前往 Vercel Dashboard
2. 點擊你的專案
3. 點擊 "Deployments" 標籤
4. 找到最新的部署（狀態為 "Ready"）
5. 點擊部署，會看到網址

## 📱 手機訪問步驟

### Android 手機（Samsung A16 等）

1. **打開瀏覽器**
   - Chrome 或 Samsung Internet

2. **輸入網址**
   - 在地址欄輸入：`https://your-project-name.vercel.app`
   - **重要**：必須包含 `https://`（不是 `http://`）

3. **訪問**
   - 點擊「前往」或「Go」
   - 等待頁面載入

### iPhone

1. **打開 Safari**
2. **輸入網址**
   - 在地址欄輸入：`https://your-project-name.vercel.app`
3. **訪問**
   - 點擊「前往」

## 🔍 網址格式說明

### 正確格式 ✅
```
https://your-project-name.vercel.app
```

### 錯誤格式 ❌
```
http://your-project-name.vercel.app  （缺少 s，不安全）
your-project-name.vercel.app         （缺少 https://）
www.your-project-name.vercel.app    （不需要 www）
```

## 📋 常見網址範例

根據你的專案名稱，網址可能是：

- `https://langlive-roulette-pwa.vercel.app`
- `https://langlive-roulette.vercel.app`
- `https://roulette-pwa.vercel.app`

**實際網址取決於你在 Vercel 上設定的專案名稱**

## 🆘 如果找不到網址

### 檢查步驟：

1. **確認已部署**
   - 前往 Vercel Dashboard
   - 確認有部署記錄
   - 確認狀態為 "Ready"（綠色）

2. **檢查專案設定**
   - 點擊專案 → Settings → General
   - 查看 "Project Name"
   - 網址通常是：`https://[專案名稱].vercel.app`

3. **查看部署日誌**
   - 點擊最新的部署
   - 查看 "Domains" 或 "URL" 區塊

## ✅ 訪問成功後應該看到

- ✅ 標題：「浪LIVE 輪盤紀錄」
- ✅ 0 大按鈕（青色霓虹）
- ✅ 1-36 按鈕（6×6 排列）
- ✅ 操作按鈕（復原、清空）
- ✅ 最近紀錄（15 行）
- ✅ 統計資訊
- ✅ 0 統計面板

## 🔄 如果無法訪問

1. **確認網址正確**
   - 必須是 HTTPS
   - 必須包含完整域名

2. **清除瀏覽器快取**
   - Chrome：設定 → 隱私權 → 清除瀏覽資料
   - 選擇「快取的圖片和檔案」

3. **檢查網路連線**
   - 確認手機有網路連線
   - 嘗試重新整理頁面

4. **嘗試無痕模式**
   - 打開無痕視窗
   - 輸入網址測試

## 💡 提示

- **書籤功能**：訪問成功後，可以加入書籤方便下次使用
- **安裝為 PWA**：Chrome 可能會提示「安裝應用程式」，可以安裝到主畫面
- **分享功能**：可以分享網址給其他人使用
