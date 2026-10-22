import { z } from "zod";
import { isPromotionalUrl } from "./promotional-links";

// Re-exported so existing imports from "@/lib/youtube" keep working
export { PROMOTIONAL_DOMAINS, isPromotionalUrl } from "./promotional-links";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export interface ExtractedResource {
  url: string;
  label: string;
  domain: string;
  category: "github" | "drive" | "pdf" | "web" | "other";
}

export interface ParsedVideo {
  youtubeVideoId: string;
  position: number;
  title: string;
  durationSec: number;
  description: string;
  embeddable: boolean;
  status: "ok" | "private" | "deleted" | "not_embeddable";
  thumbnailUrl: string;
  resources: ExtractedResource[];
}

export interface ParsedPlaylist {
  youtubePlaylistId: string;
  title: string;
  channelTitle: string;
  videoCount: number;
  thumbnailUrl: string;
  videos: ParsedVideo[];
}

/**
 * Extracts a playlist ID from various YouTube URL formats.
 * Rejects single-video URLs.
 */
export function extractPlaylistId(url: string): { playlistId: string | null; error?: string } {
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);

    // If it's a playlist URL
    const listParam = parsed.searchParams.get("list");
    if (listParam) {
      return { playlistId: listParam };
    }

    // Check if it's a single video URL without a playlist
    const isSingleVideo =
      parsed.hostname.includes("youtube.com") && (parsed.pathname === "/watch" || parsed.pathname.startsWith("/embed/")) ||
      parsed.hostname.includes("youtu.be");

    if (isSingleVideo && !listParam) {
      return {
        playlistId: null,
        error: "Please paste a YouTube playlist URL. This app is designed for multi-chapter courses, not single videos.",
      };
    }

    return {
      playlistId: null,
      error: "Invalid URL format. Please paste a valid YouTube playlist link.",
    };
  } catch {
    return {
      playlistId: null,
      error: "Invalid URL format. Please paste a valid YouTube playlist link.",
    };
  }
}

/**
 * Converts ISO 8601 duration string (e.g. PT1H2M34S) to total seconds.
 */
export function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extracts links from video description (GitHub repos, Drive links, docs, etc.)
 */
export function extractResourcesFromDescription(description: string): ExtractedResource[] {
  if (!description) return [];

  const urlRegex = /(https?:\/\/[^\s<>"'()]+)/gi;
  const matches = description.match(urlRegex) || [];
  const resources: ExtractedResource[] = [];
  const seenUrls = new Set<string>();

  for (const rawUrl of matches) {
    const cleanUrl = rawUrl.replace(/[.,;:)\]!?*"'>]+$/, ""); // Clean trailing punctuation
    if (seenUrls.has(cleanUrl)) continue;
    seenUrls.add(cleanUrl);

    try {
      const u = new URL(cleanUrl);
      const domain = u.hostname.replace(/^www\./, "");
      if (isPromotionalUrl(cleanUrl, domain)) continue;

      let category: ExtractedResource["category"] = "web";
      let label = domain;

      if (domain.includes("github.com")) {
        category = "github";
        label = "GitHub Repository";
      } else if (domain.includes("drive.google.com") || domain.includes("docs.google.com")) {
        category = "drive";
        label = "Google Drive / Docs";
      } else if (cleanUrl.toLowerCase().endsWith(".pdf")) {
        category = "pdf";
        label = "PDF Document";
      } else {
        label = `${domain} Resource`;
      }

      resources.push({
        url: cleanUrl,
        label,
        domain,
        category,
      });
    } catch {
      // Ignore invalid URLs
    }
  }

  return resources;
}

/**
 * Fetches playlist metadata and all video details via YouTube Data API v3
 */
export async function fetchPlaylistData(playlistId: string): Promise<ParsedPlaylist> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY environment variable is not configured.");
  }

  // 1. Fetch Playlist details
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`;
  const playlistRes = await fetch(playlistUrl);
  const playlistData = await playlistRes.json();

  if (!playlistRes.ok || !playlistData.items || playlistData.items.length === 0) {
    throw new Error(playlistData.error?.message || "Playlist not found or is private.");
  }

  const playlistItem = playlistData.items[0];
  const playlistTitle = playlistItem.snippet.title;
  const channelTitle = playlistItem.snippet.channelTitle;
  const thumbnailUrl =
    playlistItem.snippet.thumbnails?.maxres?.url ||
    playlistItem.snippet.thumbnails?.standard?.url ||
    playlistItem.snippet.thumbnails?.high?.url ||
    playlistItem.snippet.thumbnails?.default?.url ||
    "";

  // 2. Fetch Playlist Items (all videos, paginated)
  let allPlaylistItems: any[] = [];
  let nextPageToken: string | undefined = undefined;

  while (true) {
    const pageUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&maxResults=50&playlistId=${playlistId}${
      nextPageToken ? `&pageToken=${nextPageToken}` : ""
    }&key=${YOUTUBE_API_KEY}`;

    const itemsRes: Response = await fetch(pageUrl);
    const itemsData: any = await itemsRes.json();

    if (!itemsRes.ok) {
      throw new Error(itemsData.error?.message || "Failed to fetch playlist videos.");
    }

    if (itemsData.items) {
      allPlaylistItems = allPlaylistItems.concat(itemsData.items);
    }
    nextPageToken = itemsData.nextPageToken;
    if (!nextPageToken) break;
  }

  // Filter out deleted/private items that don't have videoId
  const validItems = allPlaylistItems.filter(
    (item) => item.contentDetails?.videoId && item.snippet?.title !== "Private video" && item.snippet?.title !== "Deleted video"
  );

  // 3. Fetch Video Details (durations, embeddable status, descriptions) in batches of 50
  const videoDetailsMap = new Map<string, { durationSec: number; embeddable: boolean; status: "ok" | "private" | "deleted" | "not_embeddable" }>();

  const videoIds = validItems.map((item) => item.contentDetails.videoId);
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(",");
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${batch}&key=${YOUTUBE_API_KEY}`;
    const vRes = await fetch(vUrl);
    const vData = await vRes.json();

    if (vRes.ok && vData.items) {
      for (const v of vData.items) {
        const durationSec = parseIsoDuration(v.contentDetails?.duration || "");
        const embeddable = v.status?.embeddable !== false;
        let status: "ok" | "private" | "deleted" | "not_embeddable" = "ok";
        if (!embeddable) status = "not_embeddable";
        if (v.status?.privacyStatus === "private") status = "private";

        videoDetailsMap.set(v.id, { durationSec, embeddable, status });
      }
    }
  }

  // 4. Combine into clean ParsedVideo list
  const videos: ParsedVideo[] = validItems.map((item, index) => {
    const vId = item.contentDetails.videoId;
    const detail = videoDetailsMap.get(vId) || { durationSec: 0, embeddable: true, status: "ok" };
    const desc = item.snippet?.description || "";
    const vThumb =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      "";

    return {
      youtubeVideoId: vId,
      position: index + 1,
      title: item.snippet?.title || `Chapter ${index + 1}`,
      durationSec: detail.durationSec,
      description: desc,
      embeddable: detail.embeddable,
      status: detail.status,
      thumbnailUrl: vThumb,
      resources: extractResourcesFromDescription(desc),
    };
  });

  return {
    youtubePlaylistId: playlistId,
    title: playlistTitle,
    channelTitle,
    videoCount: videos.length,
    thumbnailUrl,
    videos,
  };
}
