const NO_TABBAR_PREFIXES = [
  '/onboarding',
  '/tour-mode',
  '/course/',
  '/coursemap',
  '/template/',
  '/templates',
  '/lunchie',
  '/session',
  '/join',
  '/feed/',
  '/explore/places',
  '/auth',
  '/admin',
];

export function shouldShowTabBar(location: string): boolean {
  const isLunchieFlow = location.startsWith('/lunchie/') || location === '/session/lobby';
  return isLunchieFlow || !NO_TABBAR_PREFIXES.some(prefix => location.startsWith(prefix));
}
