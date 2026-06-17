import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("NHAMNHAM game API", () => {
  test("session, person e score", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nhamnham-"));
    process.env.GAME_DB_PATH = join(dir, "test.sqlite");
    process.env.GAME_PORT = "0";

    const { createGameApp } = await import("../src/nhamnham/app");
    const app = createGameApp();

    const sessionRes = await app.handle(
      new Request("http://localhost/api/v1/game/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Daniel", age: 8 }),
      }),
    );
    const sessionJson = await sessionRes.json();
    expect(sessionJson.success).toBe(true);
    expect(sessionJson.data.userId).toBeTruthy();
    expect(sessionJson.data.isGuest).toBe(false);

    const token = sessionJson.data.sessionToken as string;

    const personRes = await app.handle(
      new Request("http://localhost/api/v1/game/persons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          personKey: "anna",
          nome: "Anna",
          genero: "menina",
        }),
      }),
    );
    const personJson = await personRes.json();
    expect(personJson.success).toBe(true);
    expect(personJson.data.personKey).toBe("anna");

    const scoreRes = await app.handle(
      new Request("http://localhost/api/v1/game/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          personId: personJson.data.id,
          points: 120,
          won: true,
        }),
      }),
    );
    const scoreJson = await scoreRes.json();
    expect(scoreJson.success).toBe(true);
    expect(scoreJson.data.saved).toBe(true);
    expect(scoreJson.data.bestScore).toBe(120);

    const guestRes = await app.handle(
      new Request("http://localhost/api/v1/game/session/guest", { method: "POST" }),
    );
    const guestJson = await guestRes.json();
    expect(guestJson.data.isGuest).toBe(true);
    expect(guestJson.data.displayName).toMatch(/^guest-/);

    const loginRes = await app.handle(
      new Request("http://localhost/api/v1/game/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Daniel" }),
      }),
    );
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBe(true);
    expect(loginJson.data.displayName).toBe("Daniel");

    const charsRes = await app.handle(new Request("http://localhost/api/v1/game/characters"));
    const charsJson = await charsRes.json();
    expect(charsJson.success).toBe(true);
    expect(charsJson.data.length).toBeGreaterThan(0);

    const { closeGameDb } = await import("../src/nhamnham/db/client");
    closeGameDb();
  });
});
