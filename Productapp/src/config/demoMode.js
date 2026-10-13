/**
 * Demo mode (fake counts, no API). Off unless REACT_APP_DEMO_MODE=true.
 */
export const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === "true";

export const DEMO_HINT =
  "Demo mode: any Email/Mobile + password (min 4 chars). Use admin@… for Admin panel. No server API required.";
