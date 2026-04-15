/** Facebook / Meta Pixel ID (NEXT_PUBLIC_* so it can be overridden per environment). */
export const META_PIXEL_ID =
  (process.env.NEXT_PUBLIC_META_PIXEL_ID || "323597132246232").trim() || "323597132246232";
