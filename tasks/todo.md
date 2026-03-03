# Public Site Mobile Fixes (2026-03-02)

## Gallery Popup Behavior (2026-03-02)
- [x] Replace gallery link navigation with in-page lightbox popup
- [x] Implement transparent-black backdrop with outside-click close behavior
- [x] Implement left/right cycling controls for popup images
- [x] Verify frontend build and summarize results
- [x] Update `SYSTEM_DOCUMENTATION.xml` with popup gallery behavior
- Files updated:
  - `frontend/src/pages/public/PublicHome.js`
  - `frontend/public/public-overrides.css`
- Behavior now:
  - Gallery opens in-page popup (no route change / no leaving the page)
  - Backdrop is semi-transparent black with website still visible behind
  - Clicking outside the image closes the popup
  - Clicking left/right side of the popup image cycles previous/next photo (no visible arrow buttons)
  - Mobile Home `Contact Us` button now uses square corners to match desktop; gallery image corners remain unchanged
  - Smallest phones (`max-width: 380px`) now use a smaller Home `Contact Us` CTA box/text to prevent hierarchy collisions with nearby hero text
  - Keyboard navigation works (`Escape`, left arrow, right arrow)
- Validation:
  - `npm run build` succeeds in `frontend/` (warnings only)

## Plan
- [x] Confirm root selectors for mobile header title, Home CTA button text, and gallery title sizing
- [x] Implement focused CSS fixes in `frontend/public/public-overrides.css`
- [x] Verify no regressions in mobile nav/header behavior and desktop sizing with a frontend build
- [x] Update `SYSTEM_DOCUMENTATION.xml` to reflect the new public-site mobile sizing/centering behavior
- [x] Add review/results summary with changed files and validation output
- [x] Normalize mobile header spacing consistency across large/small phone widths to match mid-size rhythm

## Review / Results
- Updated file:
  - `frontend/public/public-overrides.css`
- Mobile fixes delivered:
  - Increased mobile site-name header scale and allowed full-fit wrapping behavior (instead of forced truncation)
  - Explicitly centered Home banner `Contact Us` button text inside its pill/bubble on phone widths
  - Increased Home gallery heading text scale on phone widths
  - Kept mobile nav drawer offset aligned with the taller header so menu content starts below header chrome
  - Standardized phone header spacing behavior by fixing header height and removing extra tiny-phone title scaling overrides
  - Prevented small-phone logo/title top clipping by increasing mobile title line-height and adding slight top padding
- Verification:
  - `npm run build` in `frontend/` completed successfully (warnings only; no build errors)
