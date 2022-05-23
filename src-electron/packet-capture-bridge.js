import { app, dialog } from "electron";
import { createServer } from "http";
import { EventEmitter } from "events";
import { spawn } from "child_process";
import log from "electron-log";
import path from "path";

export const httpServerEventEmitter = new EventEmitter();

const options = {
  port: 13345,
};

let httpServer;
let packetCapturerProcess;

export function setupBridge(appSettings) {
  httpServer = createServer((req, res) => {
    if (req.method === "POST") {
      // Handle data
      let body = [];

      req.on("data", (chunk) => {
        body.push(chunk);
      });

      req.on("end", function () {
        // Message structure => Channel and message split with "|===|"
        // channel|===|args
        const parsedBody = Buffer.concat(body).toString();
        const message = parsedBody.split("|===|");
        httpServerEventEmitter.emit(message[0], message[1]);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("Ok!");
      });
    }
  }).listen(options.port, "localhost", () => {
    httpServerEventEmitter.emit("listen");
    spawnPacketCapturer(appSettings);
  });
}

function spawnPacketCapturer(appSettings) {
  const args = [];

  if (appSettings?.general?.useWinpcap) args.push("--UseNpcap");

  if (appSettings?.general?.server === "russia")
    args.push("--Region", "Russia");
  else if (appSettings?.general?.server === "korea")
    args.push("--Region", "Korea");

  try {
    if (process.env.DEBUGGING) {
      packetCapturerProcess = spawn(
        path.resolve(__dirname, "../../binary/LostArkLogger.exe"),
        args
      );
    } else {
      packetCapturerProcess = spawn("LostArkLogger.exe", args);
    }

    log.info("Started LostArkLogger.exe");
  } catch (e) {
    log.error("Error while trying to open packet capturer: " + e);

    dialog.showErrorBox(
      "Error while trying to open packet capturer",
      "Error: " + e.message
    );

    log.info("Exiting app...");
    app.exit();
  }

  packetCapturerProcess.on("exit", function (code, signal) {
    log.error(
      `The connection to the Lost Ark Packet Capture was lost for some reason:\n
      Code: ${code} and Signal: ${signal}`
    );

    dialog.showErrorBox(
      "Error",
      `The connection to the Lost Ark Packet Capture was lost for some reason:\n
      Code: ${code} and Signal: ${signal}\n
      Exiting app...`
    );

    log.info("Exiting app...");
    app.exit();
  });
}