/**
 * App brand colours — darker professional red (not peach).
 */
export const BRAND = {
  white: "#ffffff",
  black: "#000000",
  grey: "#f5f5f5",
  /** Darker red accent (client feedback) */
  accent: "#c62828",
  accentDark: "#8e0000",
  /** Aliases used across apple layouts */
  teal: "#c62828",
  tealDark: "#8e0000",
};

export const brandGradientFlat = `linear-gradient(195deg, ${BRAND.accent} 0%, ${BRAND.accentDark} 100%)`;

/** Shared professional card look */
export const cardSx = {
  bgcolor: BRAND.white,
  border: `1px solid #e8e8e8`,
  borderRadius: 3,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
};

export const primaryBtnSx = {
  background: brandGradientFlat,
  color: BRAND.white,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 600,
  py: 1.4,
  minHeight: 48,
  boxShadow: "0 4px 14px rgba(198, 40, 40, 0.28)",
  "&:hover": {
    background: `linear-gradient(195deg, ${BRAND.accentDark} 0%, #6d0000 100%)`,
    boxShadow: "0 6px 18px rgba(142, 0, 0, 0.35)",
  },
  "&:disabled": {
    opacity: 0.55,
    color: BRAND.white,
    // MDButtonRoot's gradient variant paints a disabled button white; restate
    // the gradient here so a dimmed button never becomes white-on-white.
    background: brandGradientFlat,
    backgroundImage: brandGradientFlat,
    boxShadow: "none",
  },
};

/** Black labels + input text (forms) */
export const inputBlackSx = {
  "& .MuiInputBase-root": { minHeight: 48 },
  "& .MuiInputBase-input": { color: BRAND.black },
  "& .MuiInputLabel-root": { color: `${BRAND.black} !important` },
  "& .MuiInputLabel-root.Mui-focused": { color: `${BRAND.black} !important` },
  "& .MuiInputLabel-shrink": { color: `${BRAND.black} !important` },
  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
    borderColor: BRAND.black,
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: BRAND.black,
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: BRAND.accent,
  },
};

/** Always-shrunk labels so they do not sit on top of browser autofill. */
export const inputAuthSx = {
  ...inputBlackSx,
  bgcolor: "#fff",
  "& .MuiOutlinedInput-root": { bgcolor: "#fff" },
  "& .MuiInputBase-input": {
    color: BRAND.black,
    WebkitBoxShadow: "0 0 0 1000px #fff inset",
    WebkitTextFillColor: BRAND.black,
  },
};
