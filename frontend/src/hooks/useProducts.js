import { useState, useEffect, useCallback, useRef } from "react";
import { productService, recommendService } from "../services/productService";
import toast from "react-hot-toast";

function buildProductsSignature(items = []) {
  return items
    .map((item) => [item?._id, item?.source, item?.sourceId ?? item?.source_id, item?.updatedAt ?? item?.updated_at, item?.currentPrice ?? item?.current_price].join(":"))
    .join("|");
}

export function useProducts() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0 });
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
      // Clear previous results immediately for a clean search transition
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
  }, []);

  const triggerScrape = useCallback(async (query) => {
    try {
      await productService.triggerScrape(query);
      toast.success(`Scraping started for "${query}" and results should appear shortly`);
    } catch {
      toast.error("Could not trigger scrape");
    }
  }, []);

  return { products, loading, error, pagination, search, triggerScrape };
}

export function useProductDetail(id) {
  const [product,      setProduct]      = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [bundles,      setBundles]      = useState([]);
  const [bestTime,     setBestTime]     = useState(null);
  const [comparison,   setComparison]   = useState([]);
  const [loading,      setLoading]      = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    // reset previous details so UI doesn't show stale product/history data
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
    } catch (err) {
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
  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(false);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await recommendService.getRecommendations(params);
      setRecommendations(data.products || data.recommendations || []);
    } catch {
      // silently use empty array
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendations, loading, load };
}
