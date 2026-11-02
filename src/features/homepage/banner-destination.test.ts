import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bannerDestinationHref, isSafeBannerDestination } from "@/features/homepage/banner-destination";
import { bannerInputSchema } from "@/validations/homepage";

const accepted = [
  "#service-categories",
  "#featured-services",
  "#contact",
  "#Service-Categories",
  "https://example.com",
  "https://example.com/en/services/example",
  "http://example.com/path",
  "HTTPS://Example.com/Path",
  "/en/services/example",
  "/en/services/example?q=1",
  "/ar/services/example#details",
];

const rejected = [
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  "data:text/html,hello",
  "vbscript:msgbox(1)",
  "file:///tmp/secret",
  "blob:https://example.com/id",
  "//example.com",
  "///example.com",
  "mailto:person@example.com",
  "#",
  "#1featured",
  "#service categories",
  "#javascript:alert(1)",
  "#service-categories/",
  "http:/example.com",
  "https:example.com",
  "https://",
  "/javascript:alert(1)",
  "javascript://example.com",
  "\\example.com",
  "http://example.com\\@evil.test",
];

describe("banner destinations", () => {
  for (const value of accepted) {
    it(`accepts ${value}`, () => {
      assert.equal(isSafeBannerDestination(value), true);
      assert.equal(bannerDestinationHref(value), value);
    });
  }

  for (const value of rejected) {
    it(`rejects ${value}`, () => {
      assert.equal(isSafeBannerDestination(value), false);
      assert.equal(bannerDestinationHref(value), null);
    });
  }

  it("keeps a fragment unchanged in the banner schema", () => {
    const parsed = bannerInputSchema.safeParse(bannerPayload("#service-categories"));

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.linkUrl, "#service-categories");
    }
  });

  it("keeps an internal path unchanged in the banner schema", () => {
    const parsed = bannerInputSchema.safeParse(bannerPayload("/en/services/example"));

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.linkUrl, "/en/services/example");
    }
  });

  it("rejects an unsafe destination in the banner schema", () => {
    const parsed = bannerInputSchema.safeParse(bannerPayload("javascript:alert(1)"));

    assert.equal(parsed.success, false);
  });

  it("allows a banner with no destination", () => {
    const parsed = bannerInputSchema.safeParse(bannerPayload(""));

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.linkUrl, null);
    }
  });
});

function bannerPayload(linkUrl: string) {
  return {
    placement: "HOME_HERO",
    desktop: "data:image/png;base64,aaaa",
    mobile: null,
    linkUrl,
    isActive: true,
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
    en: { title: "Hero", subtitle: null, buttonLabel: null },
    ar: { title: "البانر", subtitle: null, buttonLabel: null },
  };
}
