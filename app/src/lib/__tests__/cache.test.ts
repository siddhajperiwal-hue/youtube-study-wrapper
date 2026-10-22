import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithCache, getCached, invalidateCache } from "../cache";

function deferredResponse() {
  let resolve!: (body: unknown) => void;
  const promise = new Promise<Response>((r) => {
    resolve = (body) => r(new Response(JSON.stringify(body), { status: 200 }));
  });
  return { promise, resolve };
}

describe("cache", () => {
  beforeEach(() => {
    invalidateCache();
    vi.restoreAllMocks();
  });

  it("caches responses and dedupes in-flight requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ v: 1 })));
    const [a, b] = await Promise.all([fetchWithCache("/x"), fetchWithCache("/x")]);
    expect(a).toEqual({ v: 1 });
    expect(b).toEqual({ v: 1 });
    await fetchWithCache("/x");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a response whose URL was invalidated while it was in flight", async () => {
    const stale = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => stale.promise);

    const inFlight = fetchWithCache("/api/notes/c/v"); // e.g. prefetch started before a save landed
    invalidateCache("/api/notes/c/v"); // the save invalidates
    stale.resolve({ content: "old" });
    expect(await inFlight).toEqual({ content: "old" }); // the original caller still gets its answer
    expect(getCached("/api/notes/c/v")).toBeUndefined(); // ...but it is not cached

    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ content: "new" })));
    expect(await fetchWithCache("/api/notes/c/v")).toEqual({ content: "new" });
    expect(getCached("/api/notes/c/v")).toEqual({ content: "new" });
  });
});
