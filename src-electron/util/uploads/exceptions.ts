import { AxiosError } from "axios";
import { UploadResult } from "./data";

//#region Exceptions thrown during validation of upload (prior to sending to Ingest API)

// Exceptions thrown locally
export enum UploaderExceptionCode {
    INVALID_INGEST_URL = 0,
    NO_AUTH_TOKEN = 1,
    NO_BOSS_ENTITY = 2,
    BOSS_NOT_DEAD = 3,
    COMPRESSION_FAILED = 4,
    FAILED_CREATE_UPLOAD_DIR = 5,
    FIGHT_NOT_STARTED = 6,
    MISSING_GEAR_SCORE = 7,
    NO_LOCAL_PLAYER = 8,
    UNEXPECTED_ERROR = 9,
    REJECTED_BY_SERVER = 10,
}

export abstract class UploaderException extends Error {
  code: number;
  cause?: Error;
  notify: boolean;
  constructor(message: string, code?: UploaderExceptionCode, cause?: Error, notify = true) {
    super(message);
    this.name = "UploaderException";
    this.code = code ?? UploaderExceptionCode.UNEXPECTED_ERROR;
    this.cause = cause;
    this.notify = notify;
  }
}

export class UnexpectedErrorException extends UploaderException {
  constructor(
    cause?: Error,
    message = "An unexpected error occurred while uploading data to the server."
  ) {
    super(message, UploaderExceptionCode.UNEXPECTED_ERROR, cause);
  }
}

export class InvalidIngestUrlException extends UploaderException {
  constructor(cause?: Error, message = "The ingest URL is invalid.") {
    super(message, UploaderExceptionCode.INVALID_INGEST_URL, cause);
  }
}

export class NoAuthTokenException extends UploaderException {
  constructor(cause?: Error, message = "No auth token was provided.") {
    super(message, UploaderExceptionCode.NO_AUTH_TOKEN, cause);
  }
}

export class NoBossEntityException extends UploaderException {
  constructor(cause?: Error, message = "No boss entity was found.") {
    super(message, UploaderExceptionCode.NO_BOSS_ENTITY, cause, false);
  }
}

export class BossNotDeadException extends UploaderException {
  constructor(cause?: Error, message = "The boss is not dead.") {
    super(message, UploaderExceptionCode.BOSS_NOT_DEAD, cause, false);
  }
}

export class CompressionFailedException extends UploaderException {
  constructor(cause?: Error, message = "Failed to compress the upload data.") {
    super(message, UploaderExceptionCode.COMPRESSION_FAILED, cause, false);
  }
}

export class FailedCreateUploadDirException extends UploaderException {
  constructor(cause?: Error, message = "Failed to create the upload directory.") {
    super(message, UploaderExceptionCode.FAILED_CREATE_UPLOAD_DIR, cause, false);
  }
}

export class FightNotStartedException extends UploaderException {
  constructor(cause?: Error, message = "The fight has not started.") {
    super(message, UploaderExceptionCode.FIGHT_NOT_STARTED, cause, false);
  }
}

export class MissingGearScoreException extends UploaderException {
  constructor(cause?: Error, message = "One or more players don't have a gear score.") {
    super(message, UploaderExceptionCode.MISSING_GEAR_SCORE, cause);
  }
}

export class NoLocalPlayerException extends UploaderException {
  constructor(cause?: Error, message = "No local player was found.") {
    super(message, UploaderExceptionCode.NO_LOCAL_PLAYER, cause);
  }
}

export class RejectedByServerException extends UploaderException {
  constructor(cause: IngestException) {
    super(cause.message, UploaderExceptionCode.REJECTED_BY_SERVER, cause, cause.notify);
  }
}

//#endregion

//#region Exceptions returned by Ingest API during upload

export enum IngestExceptionCode {
  // Exceptions returned by the server
  INTERNAL_SERVER_ERROR = 0,
  BAD_REQUEST = 1,
  UNSUPPORTED_UPLOAD = 2,
  INVALID_PAYLOAD = 3,
  TOO_OLD = 4,
  UPLOAD_QUOTA_EXCEEDED = 5,
  UPLOADING_DISABLED = 6,
  SYSTEM_ENCOUNTER_LIMIT_EXCEEDED = 7,
  INVALID_TOKEN = 8,
  TOO_MANY_CONCURRENT_UPLOADS = 9,
  UNEXPECTED_ERROR = 10,
}

export interface IngestExceptionData {
  status: number
  message: string
  id: string
  code: IngestExceptionCode
}

export abstract class IngestException extends Error {
  data?: IngestExceptionData;
  notify: boolean;

  constructor(error: AxiosError<IngestExceptionData>, notify = false) {
    const data = error.response?.data;
    const message = data?.message ?? "An unknown error occurred while uploading data to the server.";

    super(message);
    this.notify = notify;
    this.name = "IngestException";
    this.data = data;
  }

  static fromAxios(error: AxiosError<IngestExceptionData>): IngestException {
    const code = error.response?.data?.code ?? IngestExceptionCode.UNEXPECTED_ERROR;
    switch (code) {
      case IngestExceptionCode.INTERNAL_SERVER_ERROR:
        return new InternalServerErrorException(error);
      case IngestExceptionCode.BAD_REQUEST:
        return new BadRequestException(error);
      case IngestExceptionCode.UNSUPPORTED_UPLOAD:
        return new UnsupportedUploadException(error);
      case IngestExceptionCode.INVALID_PAYLOAD:
        return new InvalidPayloadException(error);
      case IngestExceptionCode.TOO_OLD:
        return new TooOldException(error);
      case IngestExceptionCode.UPLOAD_QUOTA_EXCEEDED:
        return new UploadQuotaExceededException(error);
      case IngestExceptionCode.UPLOADING_DISABLED:
        return new UploadingDisabledException(error);
      case IngestExceptionCode.SYSTEM_ENCOUNTER_LIMIT_EXCEEDED:
        return new SystemEncounterLimitExceededException(error);
      case IngestExceptionCode.INVALID_TOKEN:
        return new InvalidTokenException(error);
      case IngestExceptionCode.TOO_MANY_CONCURRENT_UPLOADS:
        return new TooManyConcurrentUploadsException(error);
      default:
        return new UnexpectedIngestErrorException(error);
    }
  }

  getUploaderResult(): UploadResult {
    if (this instanceof TooOldException) return new UploadResult(this.encounterId)
    return new UploadResult(new RejectedByServerException(this));
  }

}

export class InternalServerErrorException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error);
    this.name = "InternalServerErrorException";
  }
}

export class BadRequestException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error);
    this.name = "BadRequestException";
  }
}

export class UnsupportedUploadException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "UnsupportedUploadException";
    this.message = "This upload is not supported by the server.";
  }
}

export class InvalidPayloadException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error);
    this.name = "InvalidPayloadException";
    this.message = "The payload is invalid.";
  }
}

export class TooOldException extends IngestException {
  encounterId: string;
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error);
    this.name = "TooOldException";
    this.encounterId = error.response!.data.id // FIXME: should never be null
  }
}

export class UploadQuotaExceededException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "UploadQuotaExceededException";
    this.message = "You have exceeded your upload quota.";
  }
}

export class UploadingDisabledException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "UploadingDisabledException";
    this.message = "Uploading is currently disabled. Please try again later.";
  }
}

export class SystemEncounterLimitExceededException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "SystemEncounterLimitExceededException";
    this.message = "The server cannot accept any more encounters. Please try again later.";
  }
}

export class InvalidTokenException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "InvalidTokenException";
    this.message = "Invalid auth token. Please try logging out and back in.";
  }
}

export class TooManyConcurrentUploadsException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error);
    this.name = "TooManyConcurrentUploadsException";
  }
}

export class UnexpectedIngestErrorException extends IngestException {
  constructor(error: AxiosError<IngestExceptionData>) {
    super(error, true);
    this.name = "UnexpectedIngestErrorException";
    this.message = "An unexpected error occurred while uploading data to the server.";
  }
}

//#endregion
