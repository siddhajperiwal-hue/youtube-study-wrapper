import { NextRequest, NextResponse } from "next/server";
import { extractPlaylistId, fetchPlaylistData } from "@/lib/youtube";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    // Uses YouTube Data API quota: signed-in users only
    if (!(await getEffectiveUserId())) return unauthorized();
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid playlist URL." },
        { status: 400 }
      );
    }

    const { playlistId, error } = extractPlaylistId(url);

    if (error || !playlistId) {
      return NextResponse.json(
        { error: error || "Invalid YouTube playlist URL." },
        { status: 400 }
      );
    }

    // Fetch playlist metadata from YouTube Data API
    const playlist = await fetchPlaylistData(playlistId);

    return NextResponse.json({
      valid: true,
      playlistId: playlist.youtubePlaylistId,
      title: playlist.title,
      channelTitle: playlist.channelTitle,
      videoCount: playlist.videoCount,
      thumbnailUrl: playlist.thumbnailUrl,
    });
  } catch (err: any) {
    console.error("Validation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to validate YouTube playlist." },
      { status: 500 }
    );
  }
}
