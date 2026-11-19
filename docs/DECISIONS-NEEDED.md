# Decisions needed

These items stay as they are until you choose. The recommended change is listed with each one. Nothing in this file has been applied to the storefront except the screen-reader and structured-data rating, which no longer claims a score when a service has no approved reviews. The gold stars still show.

## Testimonials look like real customers

`src/components/storefront/testimonial-carousel.tsx` shows six named people: Sara Al-Harbi, Omar Khalid, Lina Haddad, Noura Al-Mutairi, Youssef Nasser, and Maya Saleh. Some quotes talk about placing an order. Checkout does not exist, so those quotes describe a step the site cannot do, and the names read as real customers.

Recommended fix: replace the names and places with clearly sample labels, and rewrite the quotes so they describe browsing the catalog. Do not mention orders until checkout exists.

## Services with no approved reviews show four filled stars

`src/app/[locale]/services/[slug]/page.tsx` still fills four stars when `reviewCount` is 0. Screen readers no longer hear a rating in that case, and the page no longer sends a rating in structured data.

Recommended fix: show empty stars, or hide the stars, until at least one review is approved. Keep the average only when approved reviews exist.

## Promo banners can show a button label with no link

A promotional banner can have a button label while `linkUrl` is empty. The button is then not rendered, so the label is stored but visitors never see an action.

Recommended fix: in the dashboard, require a link before a button label can be saved, and ignore a label that has no safe link.
