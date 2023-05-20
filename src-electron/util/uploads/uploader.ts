import log from "electron-log";
import { mainFolder } from "../directories";
import fs from "fs";
import path from "path";
import * as Data from "meter-core/logger/data";
import { Settings } from "../app-settings";
import zlib from "zlib";
import { randomUUID } from "crypto";
import { Upload, UploadResult } from "./data";
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import {
  CompressionFailedException,
  FailedCreateUploadDirException,
  FightNotStartedException,
  IngestException,
  InvalidIngestUrlException,
  NoAuthTokenException,
  NoBossEntityException,
  UnexpectedErrorException,
  UploaderException,
} from "./exceptions";

/**
 * Creates the uploads directory if it doesn't exist.
 */
export const tryCreateUploadDir = () => {
  try {
    if (!fs.existsSync(path.join(mainFolder, "uploads"))) {
      fs.mkdirSync(path.join(mainFolder, "uploads"));
    }
  } catch (e) {
    throw new FailedCreateUploadDirException(e as Error);
  }
};


/**
 * Compress a string with gzip compression.
 * @param data The string to compress
 * @returns The compressed string
 */
const gzipCompress = (data: string, encoding = "utf8"): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(data, encoding as BufferEncoding);
    zlib.gzip(buffer, (err, result) => {
      if (err) {
        reject(new CompressionFailedException(err));
      } else {
        resolve(result);
      }
    });
  });
};


/**
 * Preprocesses the session log into a format that can be uploaded.
 *
 * Most processing of entities is done in the {@link Upload} class.
 *
 * @param sessionLog The session log to preprocess
 * @returns The preprocessed upload data
 */
export const preprocess = (sessionLog: Data.GameState): Upload => {
  if (sessionLog.fightStartedOn === 0) {
    throw new FightNotStartedException();
  }

  if (sessionLog.entities.size === 0 || !sessionLog.currentBoss) {
    throw new NoBossEntityException();
  }

  return new Upload(sessionLog);
};


export const createRequestOptions = (
  url: string,
  data: Buffer,
  inflatedSize: number,
  token: string
): AxiosRequestConfig => {
  return {
    url: url + "/logs",
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": data.length,
      "Content-Encoding": "gzip",
      "X-Inflated-Length": inflatedSize,
      "Authorization": `Bearer ${token}`
    },
    data,
  }
}


/**
 * Uploads a game state to the server.
 *
 * Logs are preprocessed before being uploaded and rejected depending on the
 * result of the preprocessing. Optionally, copies of the upload are also saved
 * locally.
 *
 * @param sessionLog The game state to upload
 * @param appSettings The app settings
 *
 * @returns The status of the upload
 */
export const upload = async (
  sessionLog: Data.GameState,
  appSettings: Settings
): Promise<UploadResult> => {
  try {
    const token = appSettings.uploads.jwt;
    if (!token || token.length === 0) {
      return new UploadResult(new NoAuthTokenException());
    }
    const ingestUrl = appSettings.uploads.ingest.value;
    if (!ingestUrl || ingestUrl.length === 0) {
      return new UploadResult(new InvalidIngestUrlException());
    }

    tryCreateUploadDir();
    const uploadData = preprocess(sessionLog);
    const stringified = JSON.stringify(uploadData);
    const compressed = await gzipCompress(stringified);
    if (appSettings.uploads.saveCopy) {
      const outFile = path.join(mainFolder, "uploads", `${sessionLog.currentBoss?.name}-${randomUUID()}.json.gz`);
      fs.writeFile(outFile, compressed, (err) => {
        if (err) log.error("Failed to save copy of upload:", err?.message);
      });
    }

    log.debug("Uploading encounter for", uploadData.currentBoss, "to", ingestUrl)
    const request = createRequestOptions(ingestUrl, compressed, stringified.length, token);
    const { data } = await axios(request);
    return new UploadResult(data.id);
  } catch (e) {
    if (e instanceof UploaderException) {
      return new UploadResult(e);
    } else if (e instanceof AxiosError) {
      const error = IngestException.fromAxios(e);
      return error.getUploaderResult();
    }

    log.error("Unexpected uploading error", e)
    return new UploadResult(new UnexpectedErrorException(e as Error));
  }
};
