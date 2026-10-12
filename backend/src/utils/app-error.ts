import { HTTP_STATUS, type HttpStatus } from "../config/http.config.ts";

export class AppError extends Error {
  readonly status: HttpStatus;

  constructor(status: HttpStatus, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    // Error.captureStackTrace(this, AppError); - check later if this is needed
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized") {
    super(HTTP_STATUS.UNAUTHORIZED, message);
    this.name = "UnauthorizedException";
  }
}

export class NotFoundException extends AppError {
  constructor(message = "Not found") {
    super(HTTP_STATUS.NOT_FOUND, message);
    this.name = "NotFoundException";
  }
}

export class InternalServerErrorException extends AppError {
  constructor(message = "Internal server error") {
    super(HTTP_STATUS.INTERNAL_SERVER_ERROR, message);
    this.name = "InternalServerErrorException";
  }
}
