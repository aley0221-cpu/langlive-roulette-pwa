# 🚀 部署指南 - 浪LIVE 輪盤紀錄 PWA

## ✅ 專案已準備完成

專案已配置為 Vite + React + TypeScript，並包含：
- ✅ PWA 支援（manifest + service worker）
- ✅ 一頁模式 UI（適配 6.7 吋螢幕）
- ✅ localStorage 儲存功能
- ✅ 長按連打功能（1-36 按鈕）
- ✅ 震動反饋

## 📦 構建測試

專案已通過構建測試：
```bash
npm run build
```
✅ 構建成功，輸出在 `dist/` 目錄

## 🌐 部署到 Vercel（兩種方式）

### 方式 1: Vercel 網頁界面（推薦 ⭐）

**最簡單的方式，無需安裝 CLI**

1. **前往 Vercel**
   - 打開 https://vercel.com
   - 使用 GitHub/GitLab/Bitbucket 帳號登入（免費）

2. **創建新專案**
   - 點擊 "Add New..." → "Project"
   - 選擇你的 Git 倉庫（或直接上傳專案）

3. **配置設定**
   - **Framework Preset**: `Vite`（或自動偵測）
   - **Root Directory**: `./`（預設）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`（預設）

4. **環境變數**
   - 不需要任何環境變數

5. **部署**
   - 點擊 "Deploy"
   - 等待 1-2 分鐘完成

6. **取得網址**
   - 部署完成後會顯示：`https://your-project.vercel.app`
   - 這個網址就是你的公開測試網址

### 方式 2: Vercel CLI（進階）

1. **登入 Vercel**
   ```bash
   vercel login
   ```

2. **部署到生產環境**
   ```bash
   vercel --prod
   ```

3. **取得網址**
   - CLI 會顯示部署網址

## 📱 測試檢查清單

部署完成後，請用手機（Samsung A16 或類似 6.7 吋裝置）檢查：

### ✅ UI 檢查
- [ ] 0 按鈕在標題正下方
- [ ] 1–36 按鈕 6×6 排列
- [ ] 不用滑動就能看到全部內容（一頁顯示）
- [ ] 按鈕好點、不擁擠
- [ ] 最近紀錄固定 15 行（不足補 `--`）

### ✅ 功能檢查
- [ ] 點擊數字可新增紀錄
- [ ] 長按 1-36 按鈕可連打（每 80ms）
- [ ] 震動反饋正常（支援的裝置）
- [ ] 復原功能正常
- [ ] 清空功能正常
- [ ] localStorage 儲存正常（重新整理後資料還在）
- [ ] 0 統計正確更新

### ✅ PWA 檢查
- [ ] 可以安裝為 PWA（Chrome 會顯示「安裝」提示）
- [ ] 離線可用（安裝後斷網測試）
- [ ] 主題顏色正確（青色霓虹）

## 🔗 部署完成後

請提供：
- 🔗 **測試網址**（https://xxxx.vercel.app）
- 📱 **建議用「手機直向」檢查**
- ✅ **已包含 PWA manifest**（Vite PWA 插件自動生成）

## 🛠️ 技術規格

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **PWA**: vite-plugin-pwa
- **部署平台**: Vercel
- **輸出目錄**: `dist/`
- **構建指令**: `npm run build`

## 📝 注意事項

1. **HTTPS**: Vercel 自動提供 HTTPS
2. **無需後台**: 純前端應用，使用 localStorage
3. **無需登入**: 公開訪問，無需帳號
4. **首頁即為 UI**: 部署後直接顯示輪盤紀錄界面
