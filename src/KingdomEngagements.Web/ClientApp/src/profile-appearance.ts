/** Share the profile color saved by Platform Settings across module origins. */
export function installProfileAppearance(): void {
  const apply = () => {
    const cookie = document.cookie.split(';').map(value => value.trim())
      .find(value => value.startsWith('KingdomOS.ActionPrimary='));
    let primary = '';
    try {
      primary = decodeURIComponent(cookie?.slice('KingdomOS.ActionPrimary='.length) ?? '');
    } catch {
      // Ignore malformed cookie values and use the theme default.
    }
    if (/^#[0-9a-f]{6}$/i.test(primary)) {
      document.documentElement.style.setProperty('--action-primary', primary);
    } else {
      document.documentElement.style.removeProperty('--action-primary');
    }
  };

  apply();
  window.addEventListener('focus', apply);
  window.addEventListener('pageshow', apply);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') apply();
  });
}
