import { landscapeUrl } from "./images";

export type DemoVideo = {
  src: string;
  poster?: string;
};

const MDN_VIDEO_BASE =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos";

const TEST_VIDEO_BASE = "https://test-videos.co.uk";

/** Stable clip + still for fill examples. Google's sample bucket is 403 now. */
export const DEMO_FILL_VIDEO: DemoVideo = {
  src: `${MDN_VIDEO_BASE}/flower.mp4`,
  poster: "https://picsum.photos/id/106/640/360.webp",
};

const TEST_VIDEO_MOVIES = [
  { slug: "bigbuckbunny", prefix: "Big_Buck_Bunny" },
  { slug: "sintel", prefix: "Sintel" },
  { slug: "jellyfish", prefix: "Jellyfish" },
] as const;

const TEST_VIDEO_HEIGHTS = ["360", "720", "1080"] as const;
const TEST_VIDEO_SIZES = ["1MB", "2MB", "5MB"] as const;

function buildTestVideos(): DemoVideo[] {
  const videos: DemoVideo[] = [];

  for (const movie of TEST_VIDEO_MOVIES) {
    for (const height of TEST_VIDEO_HEIGHTS) {
      for (const size of TEST_VIDEO_SIZES) {
        videos.push({
          src: `${TEST_VIDEO_BASE}/vids/${movie.slug}/mp4/h264/${height}/${movie.prefix}_${height}_10s_${size}.mp4`,
        });
      }
    }
  }

  return videos;
}

const MDN_VIDEOS: DemoVideo[] = [
  { src: `${MDN_VIDEO_BASE}/flower.mp4`, poster: DEMO_FILL_VIDEO.poster },
  { src: `${MDN_VIDEO_BASE}/friday.mp4`, poster: DEMO_FILL_VIDEO.poster },
];

const DEMO_VIDEOS: DemoVideo[] = [...buildTestVideos(), ...MDN_VIDEOS];

function pickVideo(): DemoVideo {
  return DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)];
}

export function videoSrcAndPoster(): { src: string; poster: string } {
  const video = pickVideo();
  return {
    src: video.src,
    poster: video.poster ?? landscapeUrl(),
  };
}

export function videoSrc(): string {
  return pickVideo().src;
}

export function videoExampleAttrs(attrs = ""): string {
  const { src, poster } = videoSrcAndPoster();
  return `src="${src}" poster="${poster}"${attrs ? ` ${attrs}` : ""}`;
}
