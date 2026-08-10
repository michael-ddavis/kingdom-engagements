(() => {
  const hex = /^#[0-9a-f]{6}$/i;
  const readCookie = (name) => {
    const prefix = `${encodeURIComponent(name)}=`;
    const entry = document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  };

  const primary = readCookie('KingdomOS.ActionPrimary');
  const secondary = readCookie('KingdomOS.ActionSecondary');
  const root = document.documentElement;

  if (primary && hex.test(primary)) root.style.setProperty('--kos-action-primary', primary.toUpperCase());
  if (secondary && hex.test(secondary)) root.style.setProperty('--kos-action-secondary', secondary.toUpperCase());
})();
