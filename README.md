# 港島搬屋格 — Moorsom Road → City Garden

靜態比較站：渣甸山一帶 **Moorsom Road** → 北角 **City Garden（城市花園）** 住宅搬屋公司公開聯絡與價目。

- 主介面：繁體中文（香港）
- 貨幣：HKD · 時區：Asia/Hong_Kong
- 技術：純 HTML / CSS / vanilla JS，無 build step
- 內容唯一來源：根目錄 [`data.json`](data.json)（客戶端 `fetch`）

## 本機預覽

必須用 HTTP 伺服器（`file://` 通常無法 `fetch` JSON）：

```bash
python3 -m http.server 43127
```

開啟 [http://127.0.0.1:43127](http://127.0.0.1:43127)。

## 更新資料

只改 **`data.json`**，然後重新整理頁面。

權威 schema（Movers Research，`schemaVersion: 1`）：

| 欄位 | 用途 |
|------|------|
| `meta` | `routeLabel`、`routeNote`、`currency`、`lastChecked`、`timezone`、`disclaimer` |
| `schemaVersion` | 目前為 `1` |
| `movers[]` | `id`、`name`／`nameEn`、電話／WhatsApp／網站、`feeStatus`（`published` \| `需報價`）、`fees[]`（含 `sourceUrl`）、`surveyFees`、`coverage`、`sources`、`lastChecked`、`feeNote` |
| `hkMoveContextFactors[]` | 本路線注意事項 + 來源 |
| `gaps` | `publicRates`／`quoteOnly`／`missingOrWeak` |

**價錢規則：**

- 只保留有公開來源的數字；每筆 `fees[]`／`surveyFees[]` 都要有 `sourceUrl`。
- 無公開價目 → `feeStatus: "需報價"`，`fees: []`。
- **切勿虛構 HKD 數字。**
- 不要放客戶私人資料。

## 啟用 GitHub Pages

1. Repo 設為 **public**（免費 Pages 需要公開庫）。
2. 網站檔在 **`main` 根目錄**：`index.html`、`styles.css`、`app.js`、`data.json`（另有 `.nojekyll`）。
3. **Settings → Pages → Build and deployment → Source** 可二選一：
   - **Deploy from a branch** → branch `main` / folder `/ (root)`；或
   - **GitHub Actions** → 使用本庫 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)（`upload-pages-artifact` + `deploy-pages`）。
4. 若改為 **GitHub Actions**：切換 Source 後必須讓 workflow **成功跑完一次**（push 到 `main`，或 Actions → **Deploy GitHub Pages** → Run workflow）。
5. 預期網址：https://garykhfung.github.io/move_house/

無需 `npm run build`。

## 檔案

```
/
├── index.html
├── styles.css
├── app.js
├── data.json
├── favicon.svg
├── .nojekyll
├── .github/workflows/pages.yml
└── README.md
```

介面跟 Gary house-style（pg_dashboard tokens）：淺色 only、價目篩選 pill、8px 卡片。

## 免責

公開參考價或調查快照，來源見各公司卡片連結；請以書面報價為準。消委會數字為歷史調查，不作現行可訂價。
