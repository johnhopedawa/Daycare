# Public Site Mobile Fixes (2026-03-02)

## Frontend Cache Bust Fix (2026-03-03)
- [x] Add explicit no-cache handling for `public-overrides.css` in frontend nginx config
- [x] Add deterministic cache-busting query version to the public overrides stylesheet link
- [x] Verify frontend build and document outcome
- [x] Update `SYSTEM_DOCUMENTATION.xml` with frontend cache-bust behavior
- Files updated:
  - `frontend/nginx.conf`
  - `frontend/src/pages/public/PublicLayout.js`
- Outcome:
  - `/public-overrides.css` is now served with no-cache/no-store headers
  - Public layout now requests `/public-overrides.css?v=20260303-1` (or `REACT_APP_PUBLIC_OVERRIDES_VERSION` when set)
- Validation:
  - `npm run build` succeeds in `frontend/` (warnings only)

## K8s Audit And Drift Fixes (2026-03-03)
- [x] Sanitize Kubernetes Docker registry secret manifest to remove sensitive/static credential values
- [x] Update k8s deploy/apply scripts to avoid blindly applying placeholder docker credentials
- [x] Refresh k8s docs (`README.md`, `STRUCTURE.md`) for current replica/resource defaults and credential flow
- [x] Verify shell script syntax and summarize outcomes
- [x] Update `SYSTEM_DOCUMENTATION.xml` for k8s behavior/documentation changes
- Files updated:
  - `k8s/secrets/dockerhub-credentials.yaml`
  - `k8s/apply-all.sh`
  - `k8s/deploy.sh`
  - `k8s/README.md`
  - `k8s/STRUCTURE.md`
- Outcome:
  - Docker pull secret manifest is now sanitized template content (no static credential values)
  - Deploy/apply scripts now always apply `daycare-secrets.yaml` and only apply docker pull secret when template placeholders are replaced
  - K8s docs now reflect current resource requests/limits, replica counts, and manual deployment order (including Firefly)
- Validation note:
  - Attempted shell syntax checks with `bash -n`, but this Windows environment has no `/bin/bash`, so syntax check could not be executed here

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
