import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryRateLimitStore } from "@/server/security/memory-rate-limit";
import { assertSameOrigin } from "@/server/security/same-origin";
import { readJsonLimited } from "@/server/security/read-body";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "@/server/admin/password";
import { sanitizeRichText } from "@/features/services/rich-text";
import { assertCatalogContent } from "@/server/admin/catalog-transfer";
import type { CatalogFile } from "@/validations/catalog-transfer";

describe("rate limiter", () => {
  it("stops after the window limit", async () => {
    const store = createMemoryRateLimitStore();
    const first = await store.consume("login", 2, 60_000);
    const second = await store.consume("login", 2, 60_000);
    const third = await store.consume("login", 2, 60_000);

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(third.count, 3);
  });
});

describe("same origin", () => {
  it("allows a matching origin and rejects a foreign one", () => {
    const allowed = new Request("https://store.example/api/auth/email", { method: "POST", headers: { origin: "https://store.example" } });
    const blocked = new Request("https://store.example/api/auth/email", { method: "POST", headers: { origin: "https://evil.example" } });
    const read = new Request("https://store.example/api/search", { method: "GET", headers: { origin: "https://evil.example" } });

    assert.equal(assertSameOrigin(allowed), null);
    assert.equal(assertSameOrigin(blocked)?.status, 403);
    assert.equal(assertSameOrigin(read), null);
  });
});

describe("request body limit", () => {
  it("rejects a body larger than the cap", async () => {
    const request = new Request("https://store.example/api/auth/email", {
      method: "POST",
      headers: { "content-length": "20" },
      body: "{\"email\":\"a@b.co\"}",
    });

    await assert.rejects(() => readJsonLimited(request, 8));
  });
});

describe("password hashes", () => {
  it("stores the scrypt cost and accepts the older format", async () => {
    const password = "correct horse battery";
    const stored = await hashPassword(password);

    assert.match(stored, /^scrypt\$131072\$8\$1\$/);
    assert.equal(passwordNeedsRehash(stored), false);
    assert.equal(passwordNeedsRehash("scrypt:abc:def"), true);
    assert.equal(await verifyPassword(password, stored), true);
    assert.equal(await verifyPassword("wrong-password", stored), false);
  });
});

describe("rich text", () => {
  it("refuses unsupported content and keeps a paragraph", () => {
    assert.throws(
      () => sanitizeRichText({ type: "doc", content: [{ type: "script", content: [{ type: "text", text: "alert(1)" }] }] }),
      /unsupported content/,
    );
    const clean = sanitizeRichText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] });
    assert.equal(JSON.stringify(clean).includes("Hello"), true);
  });
});

describe("catalog import validation", () => {
  it("rejects an unsafe banner link, a bad slug, and a published service without both languages", () => {
    const base = {
      format: "mafateeh-store-catalog",
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: [],
      services: [],
      banners: [],
      sections: [],
      layoutItems: [],
    } as CatalogFile;

    assert.throws(() =>
      assertCatalogContent({
        ...base,
        banners: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            placement: "HOME_HERO",
            desktopImageUrl: "data:image/png;base64,aa",
            mobileImageUrl: null,
            linkUrl: "javascript:alert(1)",
            isActive: false,
            sortOrder: 0,
            startsAt: null,
            endsAt: null,
            createdAt: base.exportedAt,
            translations: [],
          },
        ],
      }),
    );
    assert.throws(() =>
      assertCatalogContent({
        ...base,
        categories: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            parentId: null,
            slug: "Bad Slug",
            iconName: null,
            iconImageUrl: null,
            bannerImageUrl: "data:image/png;base64,aa",
            isActive: false,
            sortOrder: 0,
            createdAt: base.exportedAt,
            translations: [],
          },
        ],
      }),
    );
    assert.throws(() =>
      assertCatalogContent({
        ...base,
        services: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            categoryId: "22222222-2222-4222-8222-222222222222",
            slug: "valid-service",
            sku: null,
            coverImageUrl: null,
            basePrice: "1.000",
            compareAtPrice: null,
            currency: "JOD",
            loyaltyPoints: 0,
            isActive: true,
            isFeatured: false,
            sortOrder: 0,
            publishedAt: base.exportedAt,
            createdAt: base.exportedAt,
            translations: [{ id: "33333333-3333-4333-8333-333333333333", locale: "EN", name: "One", shortDescription: "One", detailedDescription: {}, seoTitle: null, seoDescription: null }],
            images: [],
            variants: [],
          },
        ],
      }),
    );
  });
});
