// Shared blur-up placeholder for next/image. Because images are served
// unoptimized (full-size R2 originals), lazy-loaded images would otherwise
// flash an empty box until they decode. A soft neutral-gray preview (an 8×8 PNG
// tinted to ~--surface-muted) paints instantly and cross-fades to the photo,
// removing the blank flash on scroll. One generic constant is reused everywhere.
export const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWN49/4jVsQwtCQAIiKzgVcRJVQAAAAASUVORK5CYII=";
