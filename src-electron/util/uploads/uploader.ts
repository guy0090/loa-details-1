import { mainFolder } from "../directories";
import fs from "fs";
import path from "path";
import * as Data from "meter-core/logger/data";
import { Settings } from "../app-settings";
import zlib from "zlib";
import { randomUUID } from "crypto";
import { Upload } from "./data";

export enum StatusCode {
  SUCCESS = 0,
  IGNORED = 1,
  ERROR = 2,
};

export interface UploadResult {
  code: StatusCode;
  id?: string;
};

export const tryCreateDir = () => {
  if (!fs.existsSync(path.join(mainFolder, "uploads"))) {
    fs.mkdirSync(path.join(mainFolder, "uploads"));
  }
}

export const upload = async (
  sessionLog: Data.GameState,
  _appSettings: Settings
): Promise<UploadResult> => {
  tryCreateDir();
  if (sessionLog.entities.size === 0 || !sessionLog.currentBoss) return { code: StatusCode.IGNORED };

  const uploadData = new Upload(sessionLog);
  const compressed = await gzipCompress(JSON.stringify(uploadData));

  fs.writeFileSync(
    path.join(mainFolder, "uploads", `${randomUUID()}.json.gz`),
    compressed,
    "utf8"
  );

  return { code: StatusCode.ERROR, id: "test" };
};


/**
 * Compress a string with gzip compression.
 * @param {string} string The string to compress
 * @returns {Promise<Buffer>} The compressed string
 */
const gzipCompress = (string: string, encoding = "utf8"): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(string, encoding as BufferEncoding);
    zlib.gzip(buffer, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};



