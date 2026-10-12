export const logger = {
  info(message: string, extra?: unknown) {
    if (extra !== undefined) {
      console.log(message, extra);
      return;
    }
    console.log(message);
  },
  error(message: string, extra?: unknown) {
    if (extra !== undefined) {
      console.error(message, extra);
      return;
    }
    console.error(message);
  },
};
