// Links in video descriptions that are promotion (social media, donations, merch, link-in-bio,
// shorteners) rather than course material. Shared by the API routes and the course page.

export const PROMOTIONAL_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "threads.net",
  "snapchat.com",
  "pinterest.com",
  "reddit.com",
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "discord.gg",
  "discord.com",
  "telegram.me",
  "telegram.org",
  "t.me",
  "whatsapp.com",
  "patreon.com",
  "buymeacoffee.com",
  "ko-fi.com",
  "paypal.com",
  "paypal.me",
  "venmo.com",
  "cash.app",
  "teespring.com",
  "spring.me",
  "redbubble.com",
  "spreadshirt.com",
  "myshopify.com",
  "amazon.com",
  "amzn.to",
  "amazon.in",
  "topmate.io",
  "cal.com",
  "calendly.com",
  "linktr.ee",
  "bio.link",
  "linkin.bio",
  "beacons.ai",
  "hoo.be",
  "bento.me",
  "anchor.fm",
  "spotify.com",
  "podcasts.apple.com",
  "soundcloud.com",
  "teachable.com",
  "gumroad.com",
  "bit.ly",
  "tinyurl.com",
  "cutt.ly",
  "rb.gy",
  "t.co",
];

export function isPromotionalUrl(url: string, domain?: string): boolean {
  const d = (domain || "").toLowerCase().replace(/^www\./, "");
  for (const promo of PROMOTIONAL_DOMAINS) {
    if (d === promo || d.endsWith("." + promo)) return true;
  }
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    for (const promo of PROMOTIONAL_DOMAINS) {
      if (host === promo || host.endsWith("." + promo)) return true;
    }
  } catch {}
  return false;
}
