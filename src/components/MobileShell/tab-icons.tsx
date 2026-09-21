/** Line icons for the phone sheet tabs (#215): an icon over a short label keeps five tabs readable at 320 px. */
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const TAB_ICONS = {
  parts: <Icon><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><path d="M16.5 13.5v6M13.5 16.5h6" /></Icon>,
  inspector: <Icon><path d="M5 6h14M5 12h14M5 18h14" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="8" cy="18" r="2" fill="currentColor" /></Icon>,
  timeline: <Icon><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v3.5H8" /><path d="M12 8v4l2.5 2" /></Icon>,
  room: <Icon><path d="M4 9.5 12 4l8 5.5V20H4z" /><path d="M9.5 20v-5.5h5V20" /></Icon>,
  outliner: <Icon><path d="M5 5h6M8 5v14M8 12h5M8 19h5" /><path d="M15 12h4M15 19h4" /></Icon>,
};
