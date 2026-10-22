import { describe, it, expect } from "vitest";
import {
  extractPlaylistId,
  parseIsoDuration,
  isPromotionalUrl,
  extractResourcesFromDescription,
} from "../youtube";

describe("YouTube Utility Functions", () => {
  describe("extractPlaylistId", () => {
    it("extracts playlistId from standard playlist URL", () => {
      const url = "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Bv3IglT5mN41_f2f8Vq7i";
      const result = extractPlaylistId(url);
      expect(result.playlistId).toBe("PLbpi6ZahtOH6Bv3IglT5mN41_f2f8Vq7i");
      expect(result.error).toBeUndefined();
    });

    it("extracts playlistId from video watch URL with list param", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL0123456789ABCDEF&index=1";
      const result = extractPlaylistId(url);
      expect(result.playlistId).toBe("PL0123456789ABCDEF");
      expect(result.error).toBeUndefined();
    });

    it("extracts playlistId when URL lacks protocol prefix", () => {
      const url = "youtube.com/playlist?list=PLtest123";
      const result = extractPlaylistId(url);
      expect(result.playlistId).toBe("PLtest123");
    });

    it("rejects single video URL without playlist", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const result = extractPlaylistId(url);
      expect(result.playlistId).toBeNull();
      expect(result.error).toContain("multi-chapter courses");
    });

    it("rejects youtu.be short single video URL without playlist", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ";
      const result = extractPlaylistId(url);
      expect(result.playlistId).toBeNull();
      expect(result.error).toContain("multi-chapter courses");
    });

    it("rejects invalid or garbage URLs", () => {
      const result = extractPlaylistId("not a valid url");
      expect(result.playlistId).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("parseIsoDuration", () => {
    it("correctly parses hours, minutes, and seconds", () => {
      expect(parseIsoDuration("PT1H2M34S")).toBe(3754);
    });

    it("correctly parses minutes and seconds", () => {
      expect(parseIsoDuration("PT12M30S")).toBe(750);
    });

    it("correctly parses seconds only", () => {
      expect(parseIsoDuration("PT45S")).toBe(45);
    });

    it("correctly parses hours only", () => {
      expect(parseIsoDuration("PT2H")).toBe(7200);
    });

    it("returns 0 for empty or invalid strings", () => {
      expect(parseIsoDuration("")).toBe(0);
      expect(parseIsoDuration("invalid")).toBe(0);
    });
  });

  describe("isPromotionalUrl", () => {
    it("identifies social media links as promotional", () => {
      expect(isPromotionalUrl("https://instagram.com/myaccount")).toBe(true);
      expect(isPromotionalUrl("https://www.facebook.com/page")).toBe(true);
      expect(isPromotionalUrl("https://x.com/creator")).toBe(true);
      expect(isPromotionalUrl("https://twitter.com/creator")).toBe(true);
      expect(isPromotionalUrl("https://discord.gg/invite123")).toBe(true);
      expect(isPromotionalUrl("https://patreon.com/user")).toBe(true);
      expect(isPromotionalUrl("https://linktr.ee/myprofile")).toBe(true);
      expect(isPromotionalUrl("https://t.me/channel")).toBe(true);
    });

    it("identifies subdomains of promotional sites", () => {
      expect(isPromotionalUrl("https://shop.teespring.com/item")).toBe(true);
      expect(isPromotionalUrl("https://store.myshopify.com/item")).toBe(true);
      expect(isPromotionalUrl("https://amzn.to/affiliate")).toBe(true);
    });

    it("allows educational, technical, and documentation links", () => {
      expect(isPromotionalUrl("https://github.com/facebook/react")).toBe(false);
      expect(isPromotionalUrl("https://docs.python.org/3/tutorial/")).toBe(false);
      expect(isPromotionalUrl("https://developer.mozilla.org/en-US/")).toBe(false);
      expect(isPromotionalUrl("https://nextjs.org/docs")).toBe(false);
      expect(isPromotionalUrl("https://drive.google.com/file/d/123/view")).toBe(false);
      expect(isPromotionalUrl("https://arxiv.org/abs/2301.00001")).toBe(false);
    });
  });

  describe("extractResourcesFromDescription", () => {
    it("extracts and categorizes educational resources from description text", () => {
      const description = `
        Welcome to Lesson 1!
        Source code: https://github.com/example/course-repo.
        Course slides: https://docs.google.com/presentation/d/xyz/edit
        Cheatsheet: https://example.com/cheatsheet.pdf!
        Official docs: https://nextjs.org/docs
        Follow me on Instagram: https://instagram.com/dev
        Join our Discord: https://discord.gg/devs
        Support on Patreon: https://patreon.com/dev
      `;

      const resources = extractResourcesFromDescription(description);

      // Promotional links should be filtered out
      const urls = resources.map((r) => r.url);
      expect(urls).not.toContain("https://instagram.com/dev");
      expect(urls).not.toContain("https://discord.gg/devs");
      expect(urls).not.toContain("https://patreon.com/dev");

      // Educational links should be kept and trimmed of trailing punctuation
      expect(urls).toContain("https://github.com/example/course-repo");
      expect(urls).toContain("https://docs.google.com/presentation/d/xyz/edit");
      expect(urls).toContain("https://example.com/cheatsheet.pdf");
      expect(urls).toContain("https://nextjs.org/docs");

      // Check categories
      const githubRes = resources.find((r) => r.url.includes("github.com"));
      expect(githubRes?.category).toBe("github");

      const driveRes = resources.find((r) => r.url.includes("docs.google.com"));
      expect(driveRes?.category).toBe("drive");

      const pdfRes = resources.find((r) => r.url.includes(".pdf"));
      expect(pdfRes?.category).toBe("pdf");
    });

    it("deduplicates identical URLs in description", () => {
      const description = `
        Repo: https://github.com/example/repo
        Same repo again: https://github.com/example/repo
      `;
      const resources = extractResourcesFromDescription(description);
      expect(resources).toHaveLength(1);
    });

    it("returns empty array for empty description", () => {
      expect(extractResourcesFromDescription("")).toEqual([]);
    });
  });
});
