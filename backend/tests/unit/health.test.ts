import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { app } from "../../src/app.ts";

describe("GET /health", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, "0.0.0.0", () => resolve());
      server.on("error", reject);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected a TCP port for the health test server");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns HTTP 200 with status ok", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
