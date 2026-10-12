export class EmailTakenError extends Error {
  constructor() {
    super("Email taken");
    this.name = "EmailTakenError";
  }
}
