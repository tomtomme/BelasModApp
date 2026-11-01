export type DesktopProfile = { id: string; name: string; game: string; loader: string; loaderVersion: string; path: string; color: string };
export type DesktopCollection = { name: string; mods: { name: string; slug: string }[] };
export type InstallProgress = { completed: string[]; total: number; current: string; path: string };
export type DesktopApi = {
  listProfiles: () => Promise<{ directory: string; profiles: DesktopProfile[] }>;
  chooseProfileFolder: () => Promise<{ directory: string; profiles: DesktopProfile[] } | null>;
  fetchCollections: () => Promise<DesktopCollection[]>;
  installMods: (payload: { profile: DesktopProfile; slugs: string[] }) => Promise<{ installed: string[]; modsPath: string }>;
  onInstallProgress: (callback: (progress: InstallProgress) => void) => () => void;
};
declare global { interface Window { modnest?: DesktopApi } }
