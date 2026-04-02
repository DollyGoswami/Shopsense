/**
 * Product Controller
 * Fetches products from MongoDB (populated by scraper service).
 * Also triggers live scraping when needed.
 */
const axios = require("axios");
const Fuse = require("fuse.js");
const Product = require("../models/Product");
const PriceHist = require("../models/PriceHistory");

const SCRAPER_URL = process.env.SCRAPER_SERVICE_URL || "http://localhost:8002";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";
const MIN_SCRAPE_QUERY_LENGTH = 3;
const DEFAULT_SCRAPE_PAGES = 1;
const MAX_FUZZY_CANDIDATES = 120;
const SCRAPE_DEDUPE_WINDOW_MS = 90 * 1000;

const getProductScore = (product) => {
  const score =
    product?.scores?.finalScore ??
    product?.scores?.final_score ??
    product?.finalScore ??
    product?.final_score ??
    product?.ai_score ??
    product?.aiScore ??
    product?.score;
  return Number.isFinite(Number(score)) ? Number(score) : null;
};

// Common misspellings and variations
const COMMON_MISSPELLINGS = {
  'phone': ['fone', 'phonne', 'phon', 'pone'],
  'smartphone': ['smartfone', 'smart phone', 'smartphon'],
  'laptop': ['laptp', 'latop', 'loptop'],
  'headphone': ['headfone', 'head phone', 'headphon'],
  'earphone': ['earfone', 'ear phone', 'earphon'],
  'watch': ['wach', 'watc'],
  'tablet': ['tabet', 'tabl'],
  'camera': ['camra', 'camer'],
  'charger': ['chargar', 'chrger'],
  'speaker': ['spekar', 'speakr'],
  'keyboard': ['keybord', 'keyboad'],
  'mouse': ['mous', 'mose'],
  'monitor': ['moniter', 'monitr'],
  'printer': ['printr', 'printar'],
  'router': ['routar', 'ruter'],
  'hard disk': ['harddisk', 'hard drive', 'hdd'],
  'ssd': ['solid state drive', 'solid state'],
  'ram': ['memory', 'ddr'],
  'processor': ['cpu', 'chip'],
  'graphics card': ['gpu', 'graphics', 'video card'],
};

const normalizeProduct = (product) => {
  if (!product) return product;

  return {
    ...product,
    _id: product._id?.toString?.() || product._id,
    sourceId: product.sourceId || product.source_id,
    currentPrice: product.currentPrice ?? product.current_price ?? null,
    originalPrice: product.originalPrice ?? product.original_price ?? null,
    discountPct: product.discountPct ?? product.discount_pct ?? null,
    reviewCount: product.reviewCount ?? product.review_count ?? 0,
    scrapedAt: product.scrapedAt || product.scraped_at,
    updatedAt: product.updatedAt || product.updated_at || product.createdAt,
  };
};

const priceExistsFilter = {
  $or: [
    { currentPrice: { $exists: true, $ne: null } },
    { current_price: { $exists: true, $ne: null } },
  ],
};

const productListProjection = {
  name: 1,
  brand: 1,
  category: 1,
  image: 1,
  url: 1,
  affiliateUrl: 1,
  source: 1,
  sourceId: 1,
  source_id: 1,
  currentPrice: 1,
  current_price: 1,
  originalPrice: 1,
  original_price: 1,
  discountPct: 1,
  discount_pct: 1,
  rating: 1,
  reviewCount: 1,
  review_count: 1,
  scores: 1,
  buyDecision: 1,
  buy_decision: 1,
  hypeLabel: 1,
  updatedAt: 1,
  updated_at: 1,
  createdAt: 1,
  scrapedAt: 1,
  scraped_at: 1,
};

const activeScrapeRequests = new Map();

const queueScrape = (query, pages = DEFAULT_SCRAPE_PAGES, sources = undefined) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery || normalizedQuery.length < MIN_SCRAPE_QUERY_LENGTH) return false;
  const normalizedSources = Array.isArray(sources)
    ? sources.map((source) => String(source || "").trim().toLowerCase()).filter(Boolean).sort()
    : [];
  const normalized = `${normalizedQuery}::${normalizedSources.join(",") || "all"}`;

  const now = Date.now();
  const lastQueuedAt = activeScrapeRequests.get(normalized);
  if (lastQueuedAt && now - lastQueuedAt < SCRAPE_DEDUPE_WINDOW_MS) {
    return false;
  }

  activeScrapeRequests.set(normalized, now);
  axios
    .post(`${SCRAPER_URL}/scrape/search`, { query, pages, sources })
    .catch(() => {})
    .finally(() => {
      setTimeout(() => {
        if (activeScrapeRequests.get(normalized) === now) {
          activeScrapeRequests.delete(normalized);
        }
      }, SCRAPE_DEDUPE_WINDOW_MS);
    });

  return true;
};

const buildRegexFromQuery = (input) =>
  input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*`)
    .join(".*");

const applyMisspellingCorrection = (input) => {
  let correctedQuery = input;
  const lower = input.toLowerCase();

  for (const [correct, misspellings] of Object.entries(COMMON_MISSPELLINGS)) {
    if (misspellings.includes(lower)) {
      return correct;
    }

    for (const misspelling of misspellings) {
      if (lower.includes(misspelling)) {
        correctedQuery = lower.replace(misspelling, correct);
        return correctedQuery;
      }
    }
  }

  return correctedQuery;
};

const tokenizeComparableName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);

const isComparableProduct = (baseProduct, candidate) => {
  if (!baseProduct || !candidate) return false;

  const baseBrand = String(baseProduct.brand || "").trim().toLowerCase();
  const candidateBrand = String(candidate.brand || "").trim().toLowerCase();
  if (baseBrand && candidateBrand && baseBrand !== candidateBrand) return false;

  const baseCategory = String(baseProduct.category || "").trim().toLowerCase();
  const candidateCategory = String(candidate.category || "").trim().toLowerCase();
  if (baseCategory && candidateCategory && baseCategory !== candidateCategory) return false;

  const baseTokens = tokenizeComparableName(baseProduct.name || baseProduct.title || "");
  const candidateTokens = tokenizeComparableName(candidate.name || candidate.title || "");
  if (!baseTokens.length || !candidateTokens.length) return true;

  const candidateSet = new Set(candidateTokens);
  const sharedTokens = baseTokens.filter((token) => candidateSet.has(token));
  const requiredShared = Math.min(2, Math.max(1, Math.floor(baseTokens.length / 3)));
  return sharedTokens.length >= requiredShared;
};

const diversifyProductsBySource = (items = [], limit = 20) => {
  if (!Array.isArray(items) || items.length <= 1) return items.slice(0, limit);

  const buckets = new Map();
  for (const item of items) {
    const sourceKey = String(item?.source || "unknown").trim().toLowerCase() || "unknown";
    if (!buckets.has(sourceKey)) buckets.set(sourceKey, []);
    buckets.get(sourceKey).push(item);
  }

  if (buckets.size <= 1) return items.slice(0, limit);

  const orderedSources = Array.from(buckets.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([sourceKey]) => sourceKey);

  const diversified = [];
  while (diversified.length < limit) {
    let addedInRound = false;
    for (const sourceKey of orderedSources) {
      const queue = buckets.get(sourceKey);
      if (queue?.length) {
        diversified.push(queue.shift());
        addedInRound = true;
      }
      if (diversified.length >= limit) break;
    }
    if (!addedInRound) break;
  }

  return diversified;
};

exports.searchProducts = async (req, res) => {
  const {
    q = "",
    category = "",
    source = "",
    minPrice,
    maxPrice,
    minRating,
    sort = "score",
    page = 1,
    limit = 20,
    buyDecision,
    hypeLabel,
    skipAutoScrape = "false",
  } = req.query;

  const normalizedQuery = String(q).trim();
  const normalizedCategory = String(category).trim();
  const shouldSkipAutoScrape = String(skipAutoScrape).toLowerCase() === "true";
  const filter = {};

  if (normalizedQuery) filter.$text = { $search: normalizedQuery };
  if (normalizedCategory) filter.category = { $regex: normalizedCategory, $options: "i" };
  if (source) filter.source = source;
  if (buyDecision) filter.buyDecision = buyDecision;
  if (hypeLabel) filter.hypeLabel = hypeLabel;
  if (minRating) filter.rating = { $gte: Number(minRating) };

  if (minPrice || maxPrice) {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          {
            currentPrice: {
              ...(min != null ? { $gte: min } : {}),
              ...(max != null ? { $lte: max } : {}),
            },
          },
          {
            current_price: {
              ...(min != null ? { $gte: min } : {}),
              ...(max != null ? { $lte: max } : {}),
            },
          },
        ],
      },
    ];
  }

  const sortMap = {
    score: { "scores.finalScore": -1, updatedAt: -1 },
    price_asc: { current_price: 1, currentPrice: 1 },
    price_desc: { current_price: -1, currentPrice: -1 },
    rating: { rating: -1 },
    newest: { updatedAt: -1, updated_at: -1, createdAt: -1 },
    discount: { discount_pct: -1, discountPct: -1 },
  };

  const skip = (Number(page) - 1) * Number(limit);
  const selectedSort = sortMap[sort] || sortMap.score;
  const shouldDiversifySources = !source && Number(page) === 1;
  const queryLimit = shouldDiversifySources ? Math.min(Number(limit) * 4, 80) : Number(limit);

  let [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .select(productListProjection)
      .sort(selectedSort)
      .skip(skip)
      .limit(queryLimit)
      .lean(),
  ]);

  if (shouldDiversifySources && products.length > Number(limit)) {
    products = diversifyProductsBySource(products, Number(limit));
  }

  // Fuzzy search is kept as a targeted fallback only for empty first-page searches.
  const shouldTryFuzzy = normalizedQuery && Number(page) === 1 && products.length === 0;

  if (shouldTryFuzzy) {
    const correctedQuery = applyMisspellingCorrection(normalizedQuery);

    if (correctedQuery !== normalizedQuery) {
      const correctedFilter = { ...filter };
      correctedFilter.$text = { $search: correctedQuery };
      const [correctedTotal, correctedProducts] = await Promise.all([
        Product.countDocuments(correctedFilter),
        Product.find(correctedFilter)
          .select(productListProjection)
          .sort(selectedSort)
          .limit(queryLimit)
          .lean(),
      ]);

      if (correctedProducts.length > products.length) {
        products = correctedProducts;
        total = correctedTotal;
      }
    }

    const regexPattern = buildRegexFromQuery(normalizedQuery);
    const fuzzyRegex = new RegExp(regexPattern, "i");

    const fallbackFilter = { ...filter };
    delete fallbackFilter.$text;
    fallbackFilter.$or = [
      { name: { $regex: fuzzyRegex } },
      { brand: { $regex: fuzzyRegex } },
      { category: { $regex: fuzzyRegex } },
    ];

  
    const [fuzzyTotal, fuzzyProducts] = await Promise.all([
      Product.countDocuments(fallbackFilter),
      Product.find(fallbackFilter)
        .select(productListProjection)
        .sort(selectedSort)
        .limit(queryLimit)
        .lean(),
    ]);

    if (fuzzyProducts.length > products.length) {
      products = fuzzyProducts;
      total = fuzzyTotal;
    }

    if (products.length === 0) {
      try {
        const tokens = normalizedQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => token.length >= 2);
        const tokenFilter = tokens.length
          ? {
              $or: tokens.flatMap((token) => {
                const tokenRegex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
                return [
                  { name: tokenRegex },
                  { brand: tokenRegex },
                  { category: tokenRegex },
                ];
              }),
            }
          : {
              $or: [
                { name: { $exists: true, $ne: "" } },
                { brand: { $exists: true, $ne: "" } },
                { category: { $exists: true, $ne: "" } },
              ],
            };

        const allProducts = await Product.find(tokenFilter)
          .select({
            name: 1,
            brand: 1,
            category: 1,
            currentPrice: 1,
            current_price: 1,
            originalPrice: 1,
            original_price: 1,
            discountPct: 1,
            discount_pct: 1,
            rating: 1,
            reviewCount: 1,
            review_count: 1,
            scores: 1,
            url: 1,
            affiliateUrl: 1,
            source: 1,
            sourceId: 1,
            source_id: 1,
            image: 1,
            buyDecision: 1,
            updatedAt: 1,
            updated_at: 1,
            scrapedAt: 1,
            scraped_at: 1,
          })
          .sort(selectedSort)
          .limit(Math.max(MAX_FUZZY_CANDIDATES, queryLimit))
          .lean();

        if (allProducts.length > 0) {
          const fuse = new Fuse(allProducts, {
            keys: [
              { name: "name", weight: 0.5 },
              { name: "brand", weight: 0.3 },
              { name: "category", weight: 0.2 },
            ],
            threshold: 0.32,
            includeScore: true,
            shouldSort: true,
            minMatchCharLength: 2,
          });

          const fuzzyResults = fuse.search(normalizedQuery);
          const matchedIds = fuzzyResults
            .filter((result) => result.score < 0.45)
            .slice(0, Number(limit))
            .map((result) => result.item._id);

          if (matchedIds.length > 0) {
            products = await Product.find({
              _id: { $in: matchedIds },
            })
              .select(productListProjection)
              .lean();

            const scoreMap = new Map(fuzzyResults.map((r) => [r.item._id.toString(), r.score]));
            products.sort((a, b) => {
              const scoreA = scoreMap.get(a._id.toString()) || 1;
              const scoreB = scoreMap.get(b._id.toString()) || 1;
              return scoreA - scoreB;
            });
            total = matchedIds.length;
          }
        }
      } catch (error) {
        console.error("Fuzzy search error:", error);
      }
    }
  }

  if (shouldDiversifySources && products.length > Number(limit)) {
    products = diversifyProductsBySource(products, Number(limit));
  }

  // If products are found but none have a valid score, enrich them via ML scoring.
  const allProductsMissingScore = products.length > 0 && products.every((product) => {
    const score = getProductScore(product);
    return score === null || score === 0;
  });

  if (allProductsMissingScore) {
    try {
      const { data: scoreData } = await axios.post(
        `${ML_SERVICE_URL}/recommend/score`,
        { products },
        { timeout: 15000 }
      );
      if (scoreData?.scored?.length) {
        products = scoreData.scored;
      }
    } catch (error) {
      console.error("ML scoring enrichment failed:", error?.message || error);
    }
  }

  const scrapeSeed = normalizedQuery || normalizedCategory;
  let scrapeQueued = false;
  // Always scrape for new queries (page 1) with sufficient length,
  // regardless of existing database results
  if (!shouldSkipAutoScrape && scrapeSeed.length >= MIN_SCRAPE_QUERY_LENGTH && Number(page) === 1) {
    scrapeQueued = queueScrape(scrapeSeed, DEFAULT_SCRAPE_PAGES);
  }

  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    scrapeQueued,
    scrapeQuery: scrapeQueued ? scrapeSeed : null,
    products: products.map(normalizeProduct),
  });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product: normalizeProduct(product) });
};

exports.getPriceHistory = async (req, res) => {
  const { id } = req.params;
  const { days = 90 } = req.query;

  const product = await Product.findById(id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const sourceId = product.sourceId || product.source_id;
  const productId = product.productId || product.product_id || (product.source && sourceId ? `${product.source}_${sourceId}` : null);

  const history = await PriceHist.find({
    $or: [
      { productId: product._id },
      { productId: String(product._id) },
      ...(productId ? [{ product_id: productId }] : []),
      ...(product.source && sourceId ? [{ source: product.source, sourceId }, { source: product.source, source_id: sourceId }] : []),
    ],
    timestamp: { $gte: since },
  })
    .sort({ timestamp: 1 })
    .lean();

  res.json({
    success: true,
    history: history.map((entry) => ({
      ...entry,
      oldPrice: entry.oldPrice ?? entry.old_price ?? null,
      productId: entry.productId ?? entry.product_id ?? null,
    })),
  });
};

exports.compareProducts = async (req, res) => {
  const { name, id } = req.query;
  if (!name && !id) {
    return res.status(400).json({ success: false, message: "Product name or id required" });
  }

  let baseProduct = null;
  if (id) {
    baseProduct = await Product.findById(id).lean();
  }

  const normalizedName = String(name || baseProduct?.name || "").trim();
  if (!normalizedName && !baseProduct) {
    return res.status(400).json({ success: false, message: "Product name or id required" });
  }

  let products = await Product.find({ $text: { $search: normalizedName } })
    .sort({ current_price: 1, currentPrice: 1, updatedAt: -1 })
    .limit(20)
    .lean();

  if (!products.length) {
    const regexPattern = normalizedName
      .split(/\s+/)
      .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    const fuzzyRegex = new RegExp(regexPattern, "i");

    products = await Product.find({
      $or: [
        { name: { $regex: fuzzyRegex } },
        { title: { $regex: fuzzyRegex } },
      ],
    })
      .sort({ current_price: 1, currentPrice: 1, updatedAt: -1 })
      .limit(20)
      .lean();
  }

  const normalizedBaseName = normalizedName.toLowerCase();
  baseProduct =
    baseProduct ||
    products.find((product) => String(product.name || product.title || "").trim().toLowerCase() === normalizedBaseName) ||
    products[0];

  if (!baseProduct) {
    return res.json({ success: true, cheapest: null, comparison: [] });
  }

  const comparableProducts = products.filter((product) => isComparableProduct(baseProduct, product));

  const bySource = {};
  bySource[baseProduct.source] = baseProduct;
  comparableProducts.forEach((product) => {
    const currentPrice = product.currentPrice ?? product.current_price ?? Number.MAX_SAFE_INTEGER;
    if (!bySource[product.source] || currentPrice < (bySource[product.source].currentPrice ?? bySource[product.source].current_price ?? Number.MAX_SAFE_INTEGER)) {
      bySource[product.source] = product;
    }
  });

  const cheapest = Object.values(bySource)
    .map(normalizeProduct)
    .sort((a, b) => (a.currentPrice ?? 0) - (b.currentPrice ?? 0));

  res.json({
    success: true,
    cheapest: cheapest[0] || null,
    comparison: cheapest,
  });
};

exports.triggerScrape = async (req, res) => {
  const query = String(req.body?.query || "").trim();
  const requestedPages = Number(req.body?.pages);
  const pages = Number.isFinite(requestedPages) && requestedPages > 0 ? requestedPages : DEFAULT_SCRAPE_PAGES;
  const requestedSources = Array.isArray(req.body?.sources)
    ? req.body.sources.map((source) => String(source || "").trim()).filter(Boolean)
    : undefined;

  if (!query) {
    return res.status(400).json({ success: false, message: "Query required" });
  }
  if (query.length < MIN_SCRAPE_QUERY_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Query must be at least ${MIN_SCRAPE_QUERY_LENGTH} characters`,
    });
  }

  try {
    const queued = queueScrape(query, pages, requestedSources);
    res.json({
      success: true,
      message: queued ? `Scraping started for: ${query}` : `Scraping for "${query}" is already running`,
      queued,
      sources: requestedSources || null,
    });
  } catch {
    res.json({ success: true, message: "Scraping queued (scraper may be starting up)" });
  }
};

exports.getTrending = async (req, res) => {
  const products = await Product.find({
    ...priceExistsFilter,
    "scores.trendScore": { $gte: 70 },
  })
    .sort({ "scores.trendScore": -1, updatedAt: -1 })
    .limit(12)
    .lean();

  res.json({ success: true, products: products.map(normalizeProduct) });
};

exports.getBestDeals = async (req, res) => {
  const products = await Product.find({
    ...priceExistsFilter,
    $or: [
      { discountPct: { $gte: 20 } },
      { discount_pct: { $gte: 20 } },
    ],
  })
    .sort({ discount_pct: -1, discountPct: -1 })
    .limit(12)
    .lean();

  res.json({ success: true, products: products.map(normalizeProduct) });
};

exports.getCategories = async (req, res) => {
  const categories = await Product.distinct("category");
  res.json({ success: true, categories: categories.filter(Boolean).sort() });
};
