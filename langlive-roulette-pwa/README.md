# 浪LIVE 輪盤紀錄 PWA

## 部署到 Vercel

### 方法 1: 使用 Vercel CLI

```bash
npm i -g vercel
vercel
```

### 方法 2: 使用 Vercel 網頁界面

1. 前往 [vercel.com](https://vercel.com)
2. 點擊 "New Project"
3. 連接 GitHub 倉庫（或直接上傳）
4. 設定：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 點擊 "Deploy"

## 本地開發

```bash
npm install
npm run dev
```

## 構建

```bash
npm run build
```

構建輸出在 `dist/` 目錄。
