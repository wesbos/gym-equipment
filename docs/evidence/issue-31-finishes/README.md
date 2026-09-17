# Bulk steel finish follow-up (#31)

Browser: `gym-wave2-multiselect`, development port 5311. The screenshot shows two
physical J-hook sides with different steel finishes and a Mixed finish control.

Run `agent-browser --session gym-wave2-multiselect open http://127.0.0.1:5311/builder`,
then `agent-browser --session gym-wave2-multiselect eval --stdin < docs/evidence/issue-31-finishes/verify.js`.
Use an isolated test browser: the script imports a fixture into the working design
and captures JSON downloads. It does not save a named configuration.

Verified through the real page/store: mixed steel finishes and no checked paint
swatch; bulk stainless edit and one-step undo; separate color/finish reset without
changing the other override map; choosing paint supersedes explicit steel; complete
pair duplication preserves each physical side's remembered color and steel finish;
combined appearance reset and undo; duplicate undo restores the original part count.

Unit tests additionally cover same-side, reversed and arbitrary-ID upright pairs,
finish-only duplication, unpair after duplication, explicit Save/reload, transient
selection, unchanged fastener/rod roles, and actual 3MF dominant-color output before
and after paint/undo. Steel visual/UV/texture behavior is unchanged from PR45.
