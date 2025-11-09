/*
 * Tracks a social click event using Google Analytics.
 *
 * @param {string} platform - The platform where the social click occurred.
 * ------------------------------------------------------------------------
 */
export const trackSocialClick = (platform: string) => {
  if (window.gtag) {
    window.gtag("event", "social_click", { platform, event_category: "engagement" });
  }
};
