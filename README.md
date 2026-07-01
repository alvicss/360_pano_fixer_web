# 360 全景圖手機修復版

這是一個純前端的靜態網頁工具，讓手機或桌面瀏覽器直接處理 360 全景圖片，不需要安裝 App，也不需要後端服務。

使用者可以在瀏覽器內完成圖片選取、比例檢查、裁切為 2:1、轉出 JPEG，並自動補上常用的 GPano XMP metadata，最後直接下載處理後的新檔案。

## 功能重點

- 純靜態網站，可直接部署到 GitHub Pages
- 支援手機瀏覽器操作
- 支援拖曳或批次選取多張圖片
- 支援 JPG、JPEG、PNG、WEBP、BMP、TIFF、TIF
- 可檢查圖片是否接近 2:1 全景比例
- 非 2:1 圖片可選擇自動裁切、保留原尺寸輸出或直接跳過
- 可調整裁切保留位置 X / Y
- 可設定 JPEG 品質、檔名後綴與透明背景補色
- 會在前端寫入常用的 GPano metadata
- 提供處理結果列表、單張預覽與成功檔案批次下載

## 技術特性

- 無後端、無資料庫、無建置流程
- 使用原生 HTML、CSS、JavaScript
- 所有圖片處理都在本機瀏覽器內完成
- 不會修改原始檔，只會產生新的下載檔

## 專案結構

```text
mobile-web/
├─ index.html
├─ .nojekyll
├─ README.md
└─ assets/
   ├─ app.js
   └─ styles.css
```

## 使用方式

1. 直接用瀏覽器開啟 `index.html`
2. 點選「選擇圖片」或把圖片拖進頁面
3. 依需求調整常用設定
4. 按「開始處理」
5. 在結果區下載單張 JPG，或按「下載全部成功檔案」

## 可調整設定

- `非 2:1 圖片`
  - `自動裁切成 2:1`
  - `照原圖輸出`
  - `跳過這張圖`
- `比例容差`
- `裁切保留位置 X (%)`
- `裁切保留位置 Y (%)`
- `檔名後綴`
- `JPEG 品質`
- `透明背景補色`
- `ProjectionType`
- `UsePanoramaViewer`
- `SourcePhotosCount`

## 會寫入的 GPano 資訊

目前前端會補上常用的 GPano XMP 欄位，適合一般 360 全景圖瀏覽場景使用，包含：

- `ProjectionType`
- `UsePanoramaViewer`
- `CroppedAreaImageWidthPixels`
- `CroppedAreaImageHeightPixels`
- `FullPanoWidthPixels`
- `FullPanoHeightPixels`
- `CroppedAreaLeftPixels`
- `CroppedAreaTopPixels`
- `SourcePhotosCount`

## GitHub Pages 部署

這個專案是純靜態網站，最適合直接放在 GitHub Pages。

1. 建立 GitHub repository
2. 將 `mobile-web` 內的檔案放到 repository 根目錄
3. 到 GitHub 的 `Settings > Pages`
4. 在 `Build and deployment` 選擇 `Deploy from a branch`
5. 選擇主要分支與 `/ (root)` 目錄
6. 儲存後等待 GitHub 產生網站網址

網站網址通常會是：

```text
https://你的帳號.github.io/你的-repo/
```

`.nojekyll` 用來避免 GitHub Pages 對靜態檔案做額外的 Jekyll 處理。

## 隱私與安全

- 本工具不需要上傳圖片到伺服器
- 所有處理都在使用者自己的瀏覽器內完成
- 原始檔不會被覆蓋
- 建議在正式大量使用前，先拿幾張測試圖確認輸出結果符合需求

## 目前限制

- 批次下載目前是逐張觸發，尚未做 zip 打包
- 以現代手機瀏覽器為主，舊版瀏覽器可能有相容性問題
- 超大尺寸圖片在手機上仍可能因記憶體限制而變慢或失敗
- 目前只處理常用 GPano 欄位，未包含桌面工具的完整進階 metadata 設定
