import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase admin client and auth helpers
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-helpers")>()),
  getEffectiveUserId: vi.fn().mockResolvedValue("test-user-id-123"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId } from "@/lib/auth-helpers";
import { POST } from "../progress/route";

describe("POST /api/progress API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when nobody is signed in", async () => {
    (getEffectiveUserId as any).mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost:3000/api/progress", { method: "POST", body: "{}" });
    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 400 when payload is invalid (missing courseId)", async () => {
    const req = new NextRequest("http://localhost:3000/api/progress", {
      method: "POST",
      body: JSON.stringify({
        videoId: "123e4567-e89b-12d3-a456-426614174000",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid progress payload");
  });

  it("returns 400 when watchedSecondsDelta is negative", async () => {
    const req = new NextRequest("http://localhost:3000/api/progress", {
      method: "POST",
      body: JSON.stringify({
        courseId: "123e4567-e89b-12d3-a456-426614174000",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
        watchedSecondsDelta: -50,
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("successfully updates progress with valid payload", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { status: "not_started", watched_seconds: 100, last_position_sec: 90 },
          }),
        }),
        single: vi.fn().mockResolvedValue({
          data: { quizzes_enabled: true },
        }),
      }),
    });

    (createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "chapter_progress") {
          return {
            select: mockSelect,
            upsert: mockUpsert,
          };
        }
        if (table === "courses") {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return { select: vi.fn(), upsert: vi.fn(), update: vi.fn() };
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/progress", {
      method: "POST",
      body: JSON.stringify({
        courseId: "123e4567-e89b-12d3-a456-426614174000",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
        positionSec: 105,
        watchedSecondsDelta: 15,
        durationSec: 1000,
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ last_accessed_at: expect.any(String) })
    );
  });
});
