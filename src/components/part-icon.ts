/** Loading/error fallback only. Successful icons come from the Manifold geometry. */
export function partIcon(id: string) {
  const path = id.startsWith("foot-")
    ? '<path d="M12 8v35h35M8 47h42M12 30l17 13"/>'
    : id.startsWith("storage-pin")
      ? '<path d="M10 13v30M11 26h36v7H11M43 24v11"/>'
      : id === "single-bar-holder"
        ? '<path d="M10 15h36v8H10zM15 23v24h8V23M34 23v24h8V23"/>'
        : id.startsWith("dip-")
          ? '<path d="M21 8h14v18M28 26 12 44M28 26l17 18M8 43h10m21 0h10"/>'
          : id === "landmine"
            ? '<path d="M9 41h20M19 36l18-23 9 7-19 24z"/><circle cx="19" cy="41" r="5"/>'
            : id === "spotter-arm"
              ? '<path d="M9 9v36h38v-7H19V9zM19 25l18 13"/>'
              : id.includes("branded") || id === "nameplate"
                ? '<path d="M6 15h44v28H6z"/><path d="M16 23v12m8-12v12m8-12v12m8-12v12"/>'
                : id === "angled-crossmember"
                  ? '<path d="M8 30v18m40-40v18M8 37 48 16M8 42 48 21"/>'
                  : id === "offset-crossmember"
                    ? '<path d="M6 29h10l6-12h12l6 12h10M6 35h14l6-12h4l6 12h14"/>'
                    : id === "upright"
                      ? '<path d="M21 6h10v44H21z"/><path d="M26 12v2m0 6v2m0 6v2m0 6v2m0 6v2M15 50h22"/>'
                      : id.startsWith("j-hook") || id === "monolift"
                        ? '<path d="M17 9h10v28h16v-8h5v16H17z"/>'
                        : id.includes("sphere")
                          ? '<path d="M8 24h40M17 24v12m22-12v12"/><circle cx="17" cy="40" r="6"/><circle cx="39" cy="40" r="6"/>'
                          : id.includes("multigrip")
                            ? '<path d="M6 32h10l7-12h13l7 12h7M17 32h22M25 20v12m8-12v12"/>'
                            : id.includes("webbing")
                              ? '<path d="M8 18v20m40-20v20M9 26q20 24 38 0"/>'
                              : '<path d="M8 18v24m40-24v24M9 27h38v7H9z"/>';
  return `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
