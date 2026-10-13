/**
 * Phase 3 landing page config — override via env where noted.
 */

export const LANDING = {
  tagline: "Apple Quality. Assessed in Seconds.",
  /** Calendly / Google Calendar booking URL (optional) */
  bookMeetingUrl: process.env.REACT_APP_CALENDLY_URL || "",
  contactEmail: process.env.REACT_APP_CONTACT_EMAIL || "hello@cnelindia.com",
  contactPhone: "+91-998-334-5001",
  company: "CnEL India",
  productName: "Malus Lens",
};
