// Draws the app icons into /public. Run with: node scripts/make-icons.mjs
import { ImageResponse } from "next/og.js";
import { writeFile } from "node:fs/promises";
import React from "react";

const h = React.createElement;
const HIS = "#1F6F78";
const HERS = "#A8326A";

function icon(size, padFrac) {
  const inner = Math.round(size * (1 - padFrac * 2));
  const r = padFrac > 0 ? 0 : Math.round(size * 0.22);
  return h(
    "div",
    { style: { width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F4F1" } },
    h(
      "div",
      {
        style: {
          width: padFrac > 0 ? size : inner, height: padFrac > 0 ? size : inner, borderRadius: r, overflow: "hidden",
          display: "flex", position: "relative",
          background: `linear-gradient(135deg, ${HIS} 0%, ${HIS} 50%, ${HERS} 50%, ${HERS} 100%)`,
          alignItems: "center", justifyContent: "center",
        },
      },
      h("div", { style: { color: "white", fontSize: Math.round(size * (padFrac > 0 ? 0.3 : 0.36)), fontWeight: 900, letterSpacing: -2 } }, "H&H"),
    ),
  );
}

const out = [
  ["public/icon-192.png", 192, 0],
  ["public/icon-512.png", 512, 0],
  ["public/apple-touch-icon.png", 180, 0.0001],
  ["public/icon-maskable-512.png", 512, 0.0001],
];
for (const [file, size, pad] of out) {
  const res = new ImageResponse(icon(size, pad), { width: size, height: size });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", file);
}
