import { describe, it, expect } from "vitest";
import {
  CreateCourseSchema,
  ProgressUpdateSchema,
  HeartbeatSchema,
  NoteUpdateSchema,
} from "../validations";

describe("Input Validation Schemas (Zod)", () => {
  describe("CreateCourseSchema", () => {
    it("accepts valid playlist URLs and default values", () => {
      const result = CreateCourseSchema.safeParse({
        url: "https://www.youtube.com/playlist?list=PL12345",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quizzes_enabled).toBe(true);
        expect(result.data.flashcards_enabled).toBe(true);
      }
    });

    it("rejects non-URL strings", () => {
      const result = CreateCourseSchema.safeParse({
        url: "not a url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty URL", () => {
      const result = CreateCourseSchema.safeParse({
        url: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ProgressUpdateSchema", () => {
    it("accepts valid UUIDs and time numbers", () => {
      const result = ProgressUpdateSchema.safeParse({
        courseId: "123e4567-e89b-12d3-a456-426614174000",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
        positionSec: 120,
        watchedSecondsDelta: 30,
        durationSec: 600,
      });
      expect(result.success).toBe(true);
    });

    it("rejects malformed UUIDs", () => {
      const result = ProgressUpdateSchema.safeParse({
        courseId: "not-a-uuid",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative position or watched seconds", () => {
      const result = ProgressUpdateSchema.safeParse({
        courseId: "123e4567-e89b-12d3-a456-426614174000",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
        positionSec: -10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects unrealistically massive watchedSecondsDelta (spoof prevention)", () => {
      const result = ProgressUpdateSchema.safeParse({
        courseId: "123e4567-e89b-12d3-a456-426614174000",
        videoId: "123e4567-e89b-12d3-a456-426614174001",
        watchedSecondsDelta: 999999,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("HeartbeatSchema", () => {
    it("accepts valid activeSeconds and timezone", () => {
      const result = HeartbeatSchema.safeParse({
        activeSeconds: 60,
        timezone: "America/New_York",
      });
      expect(result.success).toBe(true);
    });

    it("rejects activeSeconds higher than 300", () => {
      const result = HeartbeatSchema.safeParse({
        activeSeconds: 500,
      });
      expect(result.success).toBe(false);
    });

    it("rejects activeSeconds lower than 1", () => {
      const result = HeartbeatSchema.safeParse({
        activeSeconds: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NoteUpdateSchema", () => {
    it("accepts valid note content and version", () => {
      const result = NoteUpdateSchema.safeParse({
        content: { type: "doc", content: [] },
        version: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects version numbers less than 1", () => {
      const result = NoteUpdateSchema.safeParse({
        content: {},
        version: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});
