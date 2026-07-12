export function generateSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueSlug(baseSlug: string, exists: (slug: string) => Promise<boolean>) {
  let slug = baseSlug;
  let counter = 2;

  while (await exists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}
