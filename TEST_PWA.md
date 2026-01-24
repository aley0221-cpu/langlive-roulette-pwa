# 🧪 PWA 安裝功能測試指南

## ✅ Vercel 配置檢查

### 1. vercel.json 配置
你的 `vercel.json` 配置看起來正確：
- ✅ 正確的構建命令：`npm run build`
- ✅ 正確的輸出目錄：`dist`
- ✅ 正確的框架設定：`vite`
- ✅ SPA 路由重寫規則已設定

### 2. 部署狀態檢查

**檢查步驟：**
1. 前往 https://vercel.com/dashboard
2. 找到你的專案 `langlive-roulette-pwa`
3. 檢查最新部署狀態：
   - ✅ **綠色 "Ready"** = 部署成功
   - ❌ **紅色 "Failed"** = 需要檢查錯誤日誌
   - ⏳ **黃色 "Building"** = 正在構建中

### 3. 部署網址
部署成功後，你的應用程式網址應該是：
- `https://langlive-roulette-pwa.vercel.app`
- 或 `https://langlive-roulette-pwa-[隨機字串].vercel.app`

## 🔍 PWA 安裝功能測試

### 測試 1: Chrome DevTools 檢查（桌面）

1. **開啟應用程式**
   - 在 Chrome 中開啟你的 Vercel 部署網址
   - 確保使用 HTTPS（Vercel 自動提供）

2. **開啟開發者工具**
   - 按 `F12` 或右鍵 → "檢查"
   - 切換到 **"Application"** 分頁

3. **檢查 Manifest**
   - 左側選單 → **"Manifest"**
   - 應該看到：
     - ✅ 名稱：浪LIVE 輪盤紀錄
     - ✅ 圖示：192x192 和 512x512
     - ✅ 顯示模式：standalone
     - ❌ 如果有錯誤，會顯示紅色警告

4. **檢查 Service Worker**
   - 左側選單 → **"Service Workers"**
   - 應該看到：
     - ✅ Status: activated and is running
     - ✅ Source: 來自 VitePWA 插件

5. **檢查安裝提示**
   - 地址列右側應該出現 **"安裝"** 圖示（⊕）
   - 如果沒有，檢查：
     - 是否滿足所有安裝條件
     - 是否已經安裝過（已安裝的應用不會再顯示）

### 測試 2: 實際安裝測試（桌面 Chrome）

1. **觸發安裝**
   - 點擊地址列右側的 **"安裝"** 圖示
   - 或點擊選單（三個點）→ **"安裝應用程式"**

2. **確認安裝對話框**
   - 應該看到應用程式名稱和圖示
   - 點擊 **"安裝"**

3. **驗證安裝**
   - 應用程式應該會開啟獨立視窗
   - 檢查開始選單（Windows）或應用程式資料夾（macOS）
   - 應該看到 "浪LIVE輪盤" 應用程式

### 測試 3: Android 手機測試

1. **開啟應用程式**
   - 在 Chrome 瀏覽器中開啟 Vercel 部署網址

2. **查看安裝提示**
   - 瀏覽器應該自動顯示 **"安裝應用程式"** 橫幅
   - 或點擊選單（三個點）→ **"安裝應用程式"**

3. **安裝**
   - 點擊 **"安裝"**
   - 應用程式圖示會出現在主畫面

4. **測試離線功能**
   - 安裝後，關閉 Wi-Fi 和行動數據
   - 開啟應用程式
   - 應該可以正常使用（Service Worker 已快取資源）

### 測試 4: iOS Safari 測試

1. **開啟應用程式**
   - 在 Safari 中開啟 Vercel 部署網址

2. **新增至主畫面**
   - 點擊底部的 **"分享"** 按鈕（方框與向上箭頭）
   - 選擇 **"加入主畫面"**
   - 確認名稱和圖示
   - 點擊 **"加入"**

3. **驗證**
   - 圖示應該出現在主畫面
   - 點擊圖示，應該以獨立視窗模式開啟

## 🐛 常見問題排查

### 問題 1: 沒有看到安裝按鈕

**可能原因：**
- ❌ 不在 HTTPS 環境（但 Vercel 自動提供 HTTPS）
- ❌ Service Worker 未註冊
- ❌ Manifest 格式錯誤
- ❌ 缺少必要的圖示

**解決方法：**
1. 檢查 Chrome DevTools → Application → Manifest
2. 查看是否有錯誤訊息
3. 確認 Service Worker 已註冊
4. 清除瀏覽器快取後重試

### 問題 2: 安裝後無法開啟

**可能原因：**
- ❌ `start_url` 設定錯誤
- ❌ 應用程式無法正常載入

**解決方法：**
1. 檢查 `vite.config.ts` 中的 `start_url: '/'`
2. 確認應用程式在瀏覽器中可以正常開啟
3. 檢查 Vercel 部署日誌是否有錯誤

### 問題 3: 圖示顯示異常

**可能原因：**
- ❌ 圖示路徑錯誤
- ❌ 圖示格式不支援

**解決方法：**
1. 目前使用 data URI SVG，應該可以正常顯示
2. 如果仍有問題，可以考慮使用 PNG 圖示

## 📋 測試檢查清單

### 部署前檢查
- [ ] `vercel.json` 配置正確
- [ ] `vite.config.ts` 中 VitePWA 配置正確
- [ ] `manifest.json` 存在且格式正確（或由 VitePWA 自動生成）
- [ ] `index.html` 中有 manifest 引用（VitePWA 會自動注入）

### 部署後檢查
- [ ] Vercel 部署狀態為 "Ready"
- [ ] 應用程式可以正常開啟
- [ ] Chrome DevTools → Application → Manifest 無錯誤
- [ ] Service Worker 已註冊並運行
- [ ] 地址列顯示安裝圖示（桌面）
- [ ] 可以成功安裝（桌面）
- [ ] 安裝後可以正常開啟
- [ ] 離線功能正常（Android）

## 🚀 快速測試命令

### 本地測試（localhost）
```bash
npm run dev
# 在 localhost:5173 開啟
# localhost 也支援 PWA 安裝
```

### 構建測試
```bash
npm run build
npm run preview
# 在 localhost:4173 開啟
# 模擬生產環境
```

## 📞 需要協助？

如果遇到問題，請提供：
1. Vercel 部署網址
2. Chrome DevTools → Application → Manifest 的截圖
3. 瀏覽器控制台的錯誤訊息
4. 具體的錯誤描述

這樣可以更準確地診斷問題。
