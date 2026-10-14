import { AppError } from "../../shared/errors/app-error.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";

export class InvalidOrConsumedVerificationTokenError extends AppError {
  constructor(message = "Invalid or expired verification link.") {
    super(HTTP_STATUS.BAD_REQUEST, message);
    this.name = "InvalidOrConsumedVerificationTokenError";
  }
}
