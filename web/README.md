# Final Teams – 自動偵測登入示範

此專案是 RHEMA 為 Microsoft Teams 建置的最新登入範例，同時支援：

- Teams 桌面版（彈窗授權）
- Teams Web（Chrome / Safari） – 以新分頁授權
- 直連瀏覽器（Chrome / Safari / Edge） – 以新分頁授權

核心流程採用 `@microsoft/teams-js` + `@azure/msal-browser`/`@azure/msal-react`，確保登入時能自動帶入目前 Teams 帳號，並於非 Teams 場景提供一般 Microsoft 365 帳密登入。

## 快速開始

```bash
cd web
cp .env.example .env        # 填入 Azure Entra ID 設定
npm install
npm run dev
```

開啟 `http://localhost:5173/#/` 即可看到登入按鈕。登入成功後會顯示 Microsoft Graph `/me` 回傳的使用者資訊。

> `/#/auth` 為授權專用路由：  
> - Teams 桌面版透過 `microsoftTeams.authentication.authenticate()` 以彈窗開啟。  
> - 其他情境則改以 `window.open` 新分頁開啟授權頁。

## 主要檔案

- `src/pages/HomePage.tsx`：環境偵測、登入按鈕與使用者資訊顯示。
- `src/pages/AuthPage.tsx`：授權流程頁面（負責觸發 `loginRedirect`，並將結果回傳原頁面或 Teams）。
- `src/hooks/useTeamsEnvironment.ts`：判斷目前執行環境（桌面版／Teams Web／瀏覽器導流）。
- `src/msalConfig.ts`：MSAL 設定，可透過 `.env` 參數覆寫。
- `src/lib/msalInstance.ts`：集中初始化 `PublicClientApplication`。

## 需要的環境變數

`.env`

```
VITE_AAD_CLIENT_ID=<Azure Entra ID Application (client) ID>
VITE_AAD_TENANT_ID=<Tenant ID>
VITE_AAD_REDIRECT_URI=https://<你的部署網域>
VITE_AAD_DEFAULT_SCOPES=User.Read,openid,profile,email
VITE_AAD_STORE_AUTH_STATE_IN_COOKIE=true    # Safari 推薦為 true
```

開發時可保留 `http://localhost:5173` 作為 SPA Redirect URI。部署後請記得於 Entra ID Authentication 加上對應的 HTTPS 網域。

## 授權流程總覽

1. `HomePage` 根據 Teams SDK + UserAgent 判斷執行環境。
2. 點擊登入：
   - **桌面版**：呼叫 `teams.authentication.authenticate` → `AuthPage` → `notifySuccess`。
   - **其餘情境**：以 `window.open` 開啟新分頁 → `AuthPage` 完成授權後以 `postMessage` 回報。
3. `HomePage` 接收回傳的 `homeAccountId`，透過 `acquireTokenSilent` 取得 Graph Token 並呼叫 `/me`。

## 待串接的 Teams / Azure 設定

詳見根目錄的 `Teams自動登入技術手冊.md` 與 `開發資訊總集.md`。完成部署後，請將 Vercel 網域帶入：

- Entra ID → Authentication → SPA Redirect URI
- Entra ID → Expose an API → Application ID URI
- Teams `manifest.json` → `contentUrl` / `websiteUrl` / `webApplicationInfo`

完成後即可在 Teams 中匯入新版應用程式，並維持在一般瀏覽器上也可直接運作。
