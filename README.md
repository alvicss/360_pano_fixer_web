# 360 全景圖手機修復版

這是獨立於 `files` 專案之外的新原型，目標是讓手機瀏覽器直接處理 360 圖片，不需要安裝 App，也不需要後端。

## 專案特性

- 純靜態網頁：`index.html` + `assets/`
- 手機瀏覽器可直接操作
- 支援圖片上傳、2:1 檢查、裁切、轉 JPEG
- 直接在前端插入 GPano XMP metadata
- 不會改動原始圖檔，只會下載新的 JPG

## 檔案結構

```text
mobile-web/
  index.html
  assets/
    app.js
    styles.css
```

## 使用方式

1. 用瀏覽器打開 `index.html`
2. 選擇一張或多張圖片
3. 調整需要的常用設定
4. 按「開始處理」
5. 處理完成後逐張下載，或按「下載全部成功檔案」

## GitHub Pages 上線

這個專案是純靜態網頁，適合直接部署到 GitHub Pages。

### 最簡單做法

1. 建立一個 GitHub repository
2. 把 `mobile-web` 內的檔案上傳到 repository 根目錄
3. 到 GitHub repository 的 `Settings > Pages`
4. `Build and deployment` 選 `Deploy from a branch`
5. Branch 選你的主分支，資料夾選 `/ (root)`
6. 儲存後等待 GitHub 產生網址

之後手機直接打開類似下面的網址即可：

```text
https://你的帳號.github.io/你的-repo/
```

### 為什麼有 `.nojekyll`

GitHub Pages 預設可能會經過 Jekyll 處理。這個專案雖然沒有特殊需求，但放一個 `.nojekyll` 可以避免靜態檔案被額外處理。

## 第一版已包含

- 非 2:1 圖片可選擇裁切、保留、跳過
- 可設定裁切保留位置 X/Y
- 可設定 JPEG 品質與透明背景補色
- 會寫入常用 GPano metadata

## 目前限制

- 多張批次下載是逐張觸發，尚未做 zip 打包
- 以現代手機瀏覽器為主，舊版瀏覽器可能有相容性問題
- 目前只做常用欄位，未搬移桌面版全部進階 metadata 設定
- 手機若處理很大的 360 圖，仍可能因記憶體不足而變慢或失敗
