import api from "./api";

export const productService = {
  search:          (params, config = {}) => api.get("/products", { params, ...config }),
  getById:         (id)     => api.get(`/products/${id}`),
  getPriceHistory: (id, days = 90) => api.get(`/products/${id}/price-history`, { params: { days } }),
  getTrending:     ()       => api.get("/products/trending"),
  getDeals:        ()       => api.get("/products/deals"),
  getCategories:   ()       => api.get("/products/categories"),
  compare:         ({ name, id })   => api.get("/products/compare", { params: { name, id } }),
  triggerScrape:   (query, sources, pages)  => api.post("/products/scrape", {
    query,
    ...(Array.isArray(sources) && sources.length ? { sources } : {}),
    ...(Number.isFinite(pages) && pages > 0 ? { pages } : {}),
  }),
  getUpcomingSales: ()       => api.get("/sales/upcoming"),
};

export const recommendService = {
  getRecommendations: (params)    => api.get("/recommendations", { params }),
  getDashboard:       (params)    => api.get("/recommendations/dashboard", { params }),
  getAlternatives:    (id)        => api.get(`/recommendations/alternatives/${id}`),
  getBundles:         (id)        => api.get(`/recommendations/bundles/${id}`),
  getBestTime:        (id)        => api.get(`/recommendations/best-time/${id}`),
  getFlashSalePred:   ()          => api.get("/recommendations/flash-sale-prediction"),
};

export const searchService = {
  search:        (q, limit = 20)  => api.get("/search", { params: { q, limit } }),
  autocomplete:  (q)              => api.get("/search/suggest", { params: { q } }),
  imageSearch:   (formData)       => api.post("/search/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  }),
};
