import { register } from "../util/uploads/oAuthUtils";
import { BrowserWindow, WebRequestFilter } from "electron";
import path from "path";
import { Settings } from "../util/app-settings";

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
    appSettings.uploads.discordOAuthUrl.value ??
    appSettings.uploads.discordOAuthUrl.defaultValue;

  if (!callbackUrl) {
    console.error(
      "Discord OAuth URL is not set in settings. Please set it and try again."
    );
    return null;
  }

  discordLoginWindow.show();
  discordLoginWindow.loadURL(callbackUrl).then(() => {
    const { webRequest } = discordLoginWindow.webContents.session;
    const filter: WebRequestFilter = {
      urls: ["http://localhost:7070/login*", "http://127.0.0.1:7070/login*"],
    };

    webRequest.onBeforeRequest(filter, async ({ url }) => {
      const code = url.split("?code=")[1];
      if (code) {
        register(code, appSettings).then((data) => {
          appSettings.uploads.jwt = data.token;
          appSettings.uploads.user = data.user;
          discordLoginWindow.close();
        }).catch((err) => {
          discordLoginWindow.emit("error", { error: err.message, message: "Failed to register with API" })
          discordLoginWindow.close();
        })
      } else {
        discordLoginWindow.emit("error", { error: "Failed to get code from URL", message: "Failed to get code from URL" })
        discordLoginWindow.close();
      }
    });
  });

  return discordLoginWindow;
}


