let _counter = 1;

export function portraitUrl() {
  return `https://picsum.photos/320.webp?random=${_counter++}`;
}

export function landscapeUrl() {
  return `https://picsum.photos/320.webp?random=${_counter++}`;
}

export function squareUrl() {
  return `https://picsum.photos/320.webp?random=${_counter++}`;
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
  return `https://picsum.photos/${width}/${height}.webp?random=${_counter++}`;
}
