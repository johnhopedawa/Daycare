# Lessons Learned

## 2026-03-02
- When the user asks for exact wording changes in governance docs, paste their text verbatim and do not paraphrase.
- Do not start background dev servers/build commands unless explicitly requested or clearly necessary for the specific deliverable.
- Validate header/logo/CTA alignment at both phone and narrow-desktop widths (especially around 1024px), not only at wide desktop.
- For legacy layouts using `display: table/table-cell`, avoid margin-based spacing assumptions; prefer explicit flex layout overrides for reliable mobile header alignment.
- After collision fixes, explicitly validate perceived typography scale and centering on-device; “no overlap” is not sufficient for header quality.
- When user says “entire phone version,” apply hierarchy refinements across all public menu routes, not only the landing page.
- When feedback targets one UI element (for example: button vs image), constrain CSS edits to that element only and re-verify before broadening scope.
- Before app-store or mobile packaging work, verify the target repository/folder explicitly so setup does not happen in the wrong project.

## 2026-03-11
- If the user says they do not want a wrapped website, do not default to Capacitor or any webview shell; treat that as a requirement for a real native app architecture unless they explicitly approve a hybrid approach.
- When replacing a wrong hybrid-mobile direction, remove the old runtime hooks from the web app and mark the abandoned path deprecated in-repo; do not leave stale architecture cues that make the deprecated path look current.

## 2026-03-13
- When a user retracts a reported issue, stop pursuing that verification path and focus only on the remaining requested change instead of continuing to optimize the abandoned concern.
