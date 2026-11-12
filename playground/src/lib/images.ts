const PHOTO_IDS = [
  "photo-1500530855697-b586d89ba3ee",
  "photo-1470770841072-f978cf4d019e",
  "photo-1441974231531-c6227db76b6e",
  "photo-1501785888041-af3ef285b470",
  "photo-1469474968028-56623f02e42e",
  "photo-1507525428034-b723cf961d3e",
  "photo-1472214103451-9374bd1c798e",
  "photo-1497436072909-f5e4be1713c0",
  "photo-1511497584788-876760111969",
  "photo-1500534314209-a25ddb2bd429",
];

let _counter = 0;

export function imageUrl(width: number, height: number, index?: number) {
  const photoIndex = index ?? _counter++;
  const photoId = PHOTO_IDS[photoIndex % PHOTO_IDS.length];
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

export function portraitUrl(width = 320) {
  return imageUrl(width, Math.round(width * 1.25));
}

export function landscapeUrl() {
  return imageUrl(320, 180);
}

export function squareUrl() {
  return imageUrl(320, 320);
}

export function variedAspectRatioUrl() {
  const sizes = [
    [320, 180],
    [320, 240],
    [240, 320],
    [180, 320],
    [320, 320],
  ];
  const [width, height] = sizes[Math.floor(Math.random() * sizes.length)];
  return imageUrl(width, height);
}
