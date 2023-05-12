import log from "electron-log";
import * as Uploader from "../util/uploads/oAuthUtils";
import { BrowserWindow, WebRequestFilter } from "electron";
import path from "path";
import { Settings } from "../util/app-settings";

export const createDiscordAuthUrl = (clientId: string, redirect: string) => {
  const encoded = encodeURIComponent(redirect)
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encoded}&response_type=code&scope=identify`
}

export function createDiscordLoginWindow(appSettings: Settings) {
  const discordLoginWindow: BrowserWindow | null = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    show: false,
    width: 940,
    height: 840,
    frame: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  discordLoginWindow.removeMenu();
  discordLoginWindow.center();

  const callbackUrl =
    appSettings.uploads.discordRedirectUrl.value ??
    appSettings.uploads.discordRedirectUrl.defaultValue;

  if (!callbackUrl) {
    log.error(
      "Discord OAuth URL is not set in settings. Please set it and try again."
    );
    return null;
  }

  const clientId =
    appSettings.uploads.discordClientId.value ??
    appSettings.uploads.discordClientId.defaultValue;

  if (!clientId) {
    log.error(
      "Discord OAuth Client ID is not set in settings. Please set it and try again.");
    return null;
  }

  discordLoginWindow.show();

  const authUrl = createDiscordAuthUrl(clientId, callbackUrl)
  discordLoginWindow.loadURL(authUrl).then(() => {
    const { webRequest } = discordLoginWindow.webContents.session;
    const filter: WebRequestFilter = {
      urls: [
        "http://localhost/login*",
        "http://127.0.0.1/login*",
        `${callbackUrl}*`
      ],
    };

    webRequest.onBeforeRequest(filter, async ({ url }) => {
      const code = url.split("?code=")[1];
      if (code && code !== "") {
        Uploader.register(code, appSettings).then((data) => {
          appSettings.uploads.jwt = data.token;
          appSettings.uploads.user = data.user;
          discordLoginWindow.close();
        }).catch((err) => {
          log.error({ error: err.message, message: "Failed to register with API" })
          discordLoginWindow.destroy();
        })
      } else {
        log.error("Failed to get code from URL")
        discordLoginWindow.destroy();
      }
    });
  });

  return discordLoginWindow;
}


