import { app, BrowserWindow } from "electron";
import log from "electron-log";
import type { GameState } from "meter-core/logger/data";
import path from "path";
import { getSettings, Settings } from "../util/app-settings";
import * as Uploader from "../util/uploads/uploader";
import { initWindow } from "../util/window-init";
import { Parser } from "meter-core/logger/parser";
import { UploadStatus } from "../util/uploads/data";

export function createDamageMeterWindow(
  liveParser: Parser,
  appSettings: Settings
) {
  let damageMeterWindow: BrowserWindow | null = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"),
    show: false,
    width: 512,
    height: 200,
    minWidth: 360,
    minHeight: 124,
    frame: false,
    transparent: appSettings?.damageMeter?.design?.transparency ?? true,
    opacity: appSettings?.damageMeter?.design?.opacity || 0.9,
    resizable: true,
    autoHideMenuBar: true,
    fullscreenable: false,
    alwaysOnTop: true,
    useContentSize: true,
    webPreferences: {
      devTools: process.env.DEBUGGING,
      contextIsolation: true,
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  damageMeterWindow.loadURL(process.env.APP_URL + "#/damage-meter").then(() => {
    if (!damageMeterWindow) return;
    if (process.env.DEBUGGING) {
      damageMeterWindow.webContents.openDevTools();
    } else {
      damageMeterWindow.webContents.on("devtools-opened", () => {
        damageMeterWindow?.webContents.closeDevTools();
      });
    }
    damageMeterWindow.show();

    initWindow(damageMeterWindow, "damage_meter");
  });

  damageMeterWindow.setAlwaysOnTop(true, "normal");

  // Event listeners
  liveParser.on("reset-state", () => {
    damageMeterWindow?.webContents.send("pcap-on-reset-state", "1");
  });
  liveParser.on("state-change", (newState: GameState) => {
    try {
      if (typeof damageMeterWindow !== "undefined" && damageMeterWindow) {
        damageMeterWindow.webContents.send("pcap-on-state-change", newState);
      }
    } catch (e) {
      log.error(e);
    }
  });
  liveParser.on("message", (msg: string) => {
    try {
      damageMeterWindow?.webContents.send("pcap-on-message", msg);
    } catch (e) {
      log.error(e);
    }
  });

  liveParser.on("raid-boss-killed", async (data) => {
    const { wipe, state } = data;
    if (wipe) return;

    const settings = getSettings();
    if (!settings.uploads.uploadLogs) {
      log.debug("Uploads disabled")
      return
    }

    try {
      const response = await Uploader.upload(state, settings)
      if (response.code === UploadStatus.ERROR) {
        log.error("Upload error", response.error?.message)
        log.error("Upload error cause", response.error?.cause?.message)
        damageMeterWindow?.webContents.send("uploader-message", {
          failed: true,
          message: response.error?.message ?? "Unknown error",
        });
      } else if (response.code === UploadStatus.SUCCESS) {
        damageMeterWindow?.webContents.send("uploader-message", {
          failed: false,
          message: "Encounter uploaded",
        });

        log.debug("Upload success", response.id)
        /**
         * if (openInBrowser) {
         *   const url = `${appSettings.uploads.site.value}/logs/${response.id}`;
         *   shell.openExternal(url);
         * }
         */
      } else {
        log.debug("Ignored upload status => Message::", response.error?.message)
      }
      // Ignored skipped
    } catch (e) {
      log.error("Unhandled uploader error", e)
    }
  })

  damageMeterWindow.on("focus", () => {
    damageMeterWindow?.setIgnoreMouseEvents(false);
  });

  damageMeterWindow.on("closed", () => {
    damageMeterWindow = null;
    app.quit();
  });

  damageMeterWindow.on("restore", () => {
    damageMeterWindow?.webContents.send("on-restore-from-taskbar", true);
  });

  return damageMeterWindow;
}
