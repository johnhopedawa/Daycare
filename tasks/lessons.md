# Lessons Learned

## 2026-03-02
- When the user asks for exact wording changes in governance docs, paste their text verbatim and do not paraphrase.
- Do not start background dev servers/build commands unless explicitly requested or clearly necessary for the specific deliverable.
- Validate header/logo/CTA alignment at both phone and narrow-desktop widths (especially around 1024px), not only at wide desktop.
- For legacy layouts using `display: table/table-cell`, avoid margin-based spacing assumptions; prefer explicit flex layout overrides for reliable mobile header alignment.
- After collision fixes, explicitly validate perceived typography scale and centering on-device; “no overlap” is not sufficient for header quality.
- When user says “entire phone version,” apply hierarchy refinements across all public menu routes, not only the landing page.
- When feedback targets one UI element (for example: button vs image), constrain CSS edits to that element only and re-verify before broadening scope.
