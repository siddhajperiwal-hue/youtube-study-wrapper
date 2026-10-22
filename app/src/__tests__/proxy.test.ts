import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getClaims } })),
}));

import { proxy } from "../proxy";

const signedIn = () => getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
const signedOut = () => getClaims.mockResolvedValue({ data: null, error: null });
const visit = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));

describe("proxy (session refresh + sign-in gate)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends signed-out page visits to /login, remembering where they were going", async () => {
    signedOut();
    const res = await visit("/course/abc?tab=review");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fcourse%2Fabc%3Ftab%3Dreview");

    const home = await visit("/");
    expect(home.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("answers signed-out API calls with 401 instead of a redirect", async () => {
    signedOut();
    const res = await visit("/api/courses");
    expect(res.status).toBe(401);
  });

  it("lets signed-out visitors reach the sign-in pages and the auth callback", async () => {
    signedOut();
    for (const path of ["/login", "/signup", "/forgot-password", "/auth/callback?code=x"]) {
      const res = await visit(path);
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("requires a session for /reset-password (it comes from the email link's recovery session)", async () => {
    signedOut();
    const res = await visit("/reset-password");
    expect(res.headers.get("location")).toContain("/login?next=%2Freset-password");
  });

  it("lets signed-in users through and sends them away from the login page", async () => {
    signedIn();
    expect((await visit("/course/abc")).headers.get("location")).toBeNull();
    expect((await visit("/api/courses")).status).toBe(200);
    expect((await visit("/login")).headers.get("location")).toBe("http://localhost:3000/");
  });
});
