import slugify from 'slugify';

/**
 * Creates a URL-safe kebab-case slug from a string
 * @param {string} text
 * @returns {string}
 */
export const generateSlug = (text) => {
  return slugify(text || '', {
    lower: true,
    strict: true,
    trim: true,
  });
};

/**
 * Generates a collision-safe slug for a given Prisma model
 * If 'mulberry-silk-gown' exists, produces 'mulberry-silk-gown-1', etc.
 *
 * @param {Object} prismaModel - e.g. prisma.category or prisma.collection
 * @param {string} text - The raw text to slugify
 * @param {string} [currentId] - Exclude the current record ID when updating
 * @returns {Promise<string>}
 */
export const generateUniqueSlug = async (prismaModel, text, currentId = null) => {
  const baseSlug = generateSlug(text) || 'item';
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { slug: uniqueSlug };
    if (currentId) {
      where.id = { not: currentId };
    }

    const existing = await prismaModel.findFirst({
      where,
      select: { id: true },
    });

    if (!existing) {
      return uniqueSlug;
    }

    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
};
