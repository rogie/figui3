const PORTRAIT_IDS = [
  "photo-1494790108377-be9c29b29330",
  "photo-1438761681033-6461ffad8d80",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1544005313-94ddf0286df2",
  "photo-1531746020798-e6953c6e8e04",
  "photo-1534528741775-53994a69daeb",
  "photo-1517841905240-472988babdf9",
  "photo-1524504388940-b1c1722653e1",
  "photo-1539571696357-5a69c17a67c6",
  "photo-1488426862026-3ee34a7d66df",
];

const LANDSCAPE_IDS = [
  "photo-1506744038136-46273834b3fb",
  "photo-1501785888041-af3ef285b470",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1441974231531-c6227db76b6e",
  "photo-1472214103451-9374bd1c798e",
  "photo-1465146344425-f00d5f5c8f07",
  "photo-1500534623283-312aade213eb",
  "photo-1469474968028-56623f02e42e",
  "photo-1426604966848-d7adac402bff",
  "photo-1464822759023-fed622ff2c3b",
];

const SQUARE_IDS = [
  "photo-1506744038136-46273834b3fb",
  "photo-1494790108377-be9c29b29330",
  "photo-1501785888041-af3ef285b470",
  "photo-1438761681033-6461ffad8d80",
  "photo-1470071459604-3b5ec3a7fe05",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

type Orientation = "portrait" | "landscape" | "square";

export function unsplash(
  w: number,
  h: number,
  orientation?: Orientation,
): string {
  const auto = orientation ?? (h > w ? "portrait" : w > h ? "landscape" : "square");
  const pool =
    auto === "portrait"
      ? PORTRAIT_IDS
      : auto === "landscape"
        ? LANDSCAPE_IDS
        : SQUARE_IDS;
  return `https://images.unsplash.com/${pick(pool)}?w=${w}&h=${h}&fit=crop`;
}

export function portraitUrl(w = 260, h = 400) {
  return unsplash(w, h, "portrait");
}

export function landscapeUrl(w = 480, h = 270) {
  return unsplash(w, h, "landscape");
}

export function squareUrl(w = 200, h = 200) {
  return unsplash(w, h, "square");
}
