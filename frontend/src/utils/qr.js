const JOIN_CODE_PATTERN = /^(\d{4,5}|[A-Z0-9]{10})$/;
const normalizeCode = (value) => value.trim().toUpperCase();

export const extractJoinCode = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = normalizeCode(value);

  if (JOIN_CODE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsedUrl = new URL(trimmed);
    const fromQuery = parsedUrl.searchParams.get("code");

    if (fromQuery) {
      const normalizedFromQuery = normalizeCode(fromQuery);

      if (JOIN_CODE_PATTERN.test(normalizedFromQuery)) {
        return normalizedFromQuery;
      }
    }
  } catch {
    const matched = trimmed.match(/[A-Z0-9]{10}|\d{4,5}/);
    if (matched) {
      return matched[0];
    }
  }

  return null;
};
