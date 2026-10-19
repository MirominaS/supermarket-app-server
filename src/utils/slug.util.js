
export const slugify = (value) => {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const generateUniqueSlug = async (
  Model,
  name,
  excludeId = null,
) => {
  const baseSlug = slugify(name);

  if (!baseSlug) {
    throw new Error("A valid name is required to generate a slug.");
  }

  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const filter = { slug };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await Model.exists(filter);

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};
