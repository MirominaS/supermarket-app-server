
export const categoryCacheKeys = {
  all: "categories:all",

  byId: (categoryId) => `category:${categoryId}`,

  bySlug: (slug) => `category:slug:${slug}`,
};
