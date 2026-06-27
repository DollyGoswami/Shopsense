import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { productService, recommendService } from "../services/productService";
import toast from "react-hot-toast";

function buildProductsSignature(items = []) {
  return items
    .map((item) =>
      [
        item?._id,
        item?.source,
        item?.sourceId ?? item?.source_id,
        item?.updatedAt ?? item?.updated_at,
        item?.currentPrice ?? item?.current_price,
      ].join(":"))
    .join("|");
}

const RECENT_SEARCH_PRODUCTS_KEY = (userId) => `ss-recent-search-products-${userId || "guest"}`;

function loadRecentSearchProducts(userId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_PRODUCTS_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getUserStorageId(user) {
  return String(user?._id || user?.id || "guest");
}

function saveRecentSearchProducts(items = [], userId) {
  if (typeof window === "undefined") return;

  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const productId = String(item?.productId || item?._id || item?.product_id || item?.productId || "").trim();
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    unique.push({
      productId,
      name: item?.name || item?.title || "Unnamed product",
      price: item?.price ?? item?.currentPrice ?? item?.current_price ?? null,
      image: item?.image || item?.thumbnail || "",
      source: item?.source || item?.brand || "Unknown",
      searchedAt: item?.searchedAt || new Date().toISOString(),
    });
    if (unique.length >= 5) break;
  }

  localStorage.setItem(RECENT_SEARCH_PRODUCTS_KEY(userId), JSON.stringify(unique.slice(0, 5)));
}

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const abortRef = useRef(null);
  const resultRef = useRef({ signature: "", page: 1, pages: 1, total: 0 });

  const search = useCallback(async (params = {}, options = {}) => {
    const { background = false } = options;

    if (abortRef.current && !background) abortRef.current.abort();
    const controller = new AbortController();
    if (!background) abortRef.current = controller;

    if (!background) {
      setLoading(true);
      setError(null);
      setProducts([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    }

    try {
      const { data } = await productService.search(params, { signal: controller.signal });
      const nextProducts = data.products || [];
      const nextPagination = { page: data.page, pages: data.pages, total: data.total };
      const nextSignature = buildProductsSignature(nextProducts);
      const hasChanged =
        resultRef.current.signature !== nextSignature ||
        resultRef.current.page !== nextPagination.page ||
        resultRef.current.pages !== nextPagination.pages ||
        resultRef.current.total !== nextPagination.total;

      if (hasChanged || !background) {
        setProducts(nextProducts);
        setPagination(nextPagination);
        resultRef.current = { signature: nextSignature, ...nextPagination };
      }

      if (!background && nextProducts.length > 0) {
        saveRecentSearchProducts(
          nextProducts.slice(0, 5).map((product) => ({
            productId: product._id || product.productId || product.product_id,
            name: product.name,
            price: product.currentPrice || product.current_price || product.price,
            image: product.image,
            source: product.source,
            searchedAt: new Date().toISOString(),
          })),
          getUserStorageId(user)
        );
      }

      return data;
    } catch (err) {
      if (err.name !== "CanceledError") {
        if (!background) {
          setError(err.message);
          toast.error("Failed to load products");
        }
      }
      return null;
    } finally {
      if (!background) setLoading(false);
    }
  }, [user]);

  const triggerScrape = useCallback(async (query) => {
    try {
      await productService.triggerScrape(query);
      toast.success(`Scraping started for "${query}" and results should appear shortly`);
    } catch {
      toast.error("Could not trigger scrape");
    }
  }, []);

  const clearResults = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setProducts([]);
    setError(null);
    setLoading(false);
    setPagination({ page: 1, pages: 1, total: 0 });
    resultRef.current = { signature: "", page: 1, pages: 1, total: 0 };
  }, []);

  return { products, loading, error, pagination, search, triggerScrape, clearResults };
}

export function useProductDetail(id) {
  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [bestTime, setBestTime] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    setProduct(null);
    setPriceHistory([]);
    setAlternatives([]);
    setBundles([]);
    setBestTime(null);
    setComparison([]);

    setLoading(true);
    try {
      const [prodRes, histRes, altRes, bundleRes, bestTimeRes] = await Promise.allSettled([
        productService.getById(id),
        productService.getPriceHistory(id),
        recommendService.getAlternatives(id),
        recommendService.getBundles(id),
        recommendService.getBestTime(id),
      ]);

      let resolvedProduct = null;
      if (prodRes.status === "fulfilled") {
        resolvedProduct = prodRes.value.data.product;
        setProduct(resolvedProduct);
      }
      if (histRes.status === "fulfilled") setPriceHistory(histRes.value.data.history || []);
      if (altRes.status === "fulfilled") setAlternatives(altRes.value.data.alternatives || []);
      if (bundleRes.status === "fulfilled") setBundles(bundleRes.value.data.bundles || []);
      if (bestTimeRes.status === "fulfilled") setBestTime(bestTimeRes.value.data);

      if (resolvedProduct?.name) {
        try {
          const compareRes = await productService.compare({
            name: resolvedProduct.name,
            id: resolvedProduct._id,
          });
          setComparison(compareRes.data.comparison || []);
        } catch {
          setComparison([]);
        }
      } else {
        setComparison([]);
      }
    } catch {
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { product, priceHistory, alternatives, bundles, bestTime, comparison, loading, load };
}

export function useRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [trendSignals, setTrendSignals] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [recentSearchProducts, setRecentSearchProducts] = useState([]);
  const [usesSearchHistory, setUsesSearchHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    const localRecent = loadRecentSearchProducts(getUserStorageId(user));
    try {
      const { data } = await recommendService.getDashboard(params);
      setRecommendations(data.recommendations || data.products || []);
      setTrendSignals(data.trendSignals || []);
      setSearchHistory(data.searchHistory || []);
      setRecentSearchProducts(
        Array.isArray(data.recentSearchProducts) && data.recentSearchProducts.length > 0
          ? data.recentSearchProducts
          : localRecent
      );
      setUsesSearchHistory(Boolean(data.usesSearchHistory));
    } catch {
      try {
        const { data } = await recommendService.getRecommendations(params);
        setRecommendations(data.products || data.recommendations || []);
      } catch {
        setRecommendations([]);
      }
      setTrendSignals([]);
      setSearchHistory([]);
      setRecentSearchProducts(localRecent);
      setUsesSearchHistory(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return { recommendations, trendSignals, searchHistory, recentSearchProducts, usesSearchHistory, loading, load };
}
