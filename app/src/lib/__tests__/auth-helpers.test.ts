import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEffectiveUserId, unauthorized } from "../auth-helpers";

// Mock the Supabase server client
vi.mock("../supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "../supabase/server";

describe("auth-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user id when authenticated session exists", async () => {
    (createClient as any).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: "user-123-abc", email: "test@example.com" } },
          error: null,
        }),
      },
    });

    const userId = await getEffectiveUserId();
    expect(userId).toBe("user-123-abc");
  });

  it("returns null (no guest fallback) when there is no session", async () => {
    (createClient as any).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("No session"),
        }),
      },
    });

    expect(await getEffectiveUserId()).toBeNull();
  });

  it("returns null when the auth check throws", async () => {
    (createClient as any).mockRejectedValue(new Error("Cookies unavailable"));

    expect(await getEffectiveUserId()).toBeNull();
  });

  it("unauthorized() is a 401 JSON response", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Not signed in." });
  });
});
