export const extractJoinCode = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4,5}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsedUrl = new URL(trimmed);
    const fromQuery = parsedUrl.searchParams.get("code");

    if (fromQuery && /^\d{4,5}$/.test(fromQuery)) {
      return fromQuery;
    }
  } catch {
    const matched = trimmed.match(/\d{4,5}/);
    if (matched) {
      return matched[0];
    }
  }

  return null;
};
