export enum UploaderExceptionCode {
  UNEXPECTED_ERROR = 0,
  HTTP_ERROR = 1,
  INVALID_INGEST_URL = 2,
  NO_AUTH_TOEKN = 3,
  REJECTED_BY_SERVER = 4,
  UPLOAD_QUOTA_EXCEEDED = 5,
  NO_BOSS_ENTITY = 6,
  BOSS_NOT_DEAD = 7,
  UNSUPPORTED_UPLOAD = 8,
  COMPRESSION_FAILED = 9,
  FAILED_CREATE_UPLOAD_DIR = 10,
  FIGHT_NOT_STARTED = 11,
  MISSING_GEAR_SCORE = 12,
  NO_LOCAL_PLAYER = 13,
}

export enum IngestRejectionCode {
  UNSUPPORTED_UPLOAD = 2,
  INVALID_PAYLOAD = 3,
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

export class HttpErrorException extends UploaderException {
  constructor(
    cause?: Error,
    message = "An HTTP error occurred while uploading data to the server."
  ) {
    super(message, UploaderExceptionCode.HTTP_ERROR, cause);
  }
}

export class InvalidIngestUrlException extends UploaderException {
  constructor(cause?: Error, message = "The ingest URL is invalid.") {
    super(message, UploaderExceptionCode.INVALID_INGEST_URL, cause);
  }
}

export class NoAuthTokenException extends UploaderException {
  constructor(cause?: Error, message = "No auth token was provided.") {
    super(message, UploaderExceptionCode.NO_AUTH_TOEKN, cause);
  }
}

export class RejectedByServerException extends UploaderException {
  constructor(notify: boolean, cause?: Error, message = "The server rejected the upload.") {
    super(message, UploaderExceptionCode.REJECTED_BY_SERVER, cause, notify);
  }
}

export class UploadQuotaExceededException extends UploaderException {
  constructor(cause?: Error, message = "Upload quota has been exceeded.") {
    super(message, UploaderExceptionCode.UPLOAD_QUOTA_EXCEEDED, cause);
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
