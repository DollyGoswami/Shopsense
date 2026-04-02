import { useState, useEffect, useCallback } from "react";
import { favoriteService } from "../services/authService";
import toast from "react-hot-toast";

export function useFavorites() {
  const [favorites,   setFavorites]   = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading,     setLoading]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await favoriteService.getAll();
      setFavorites(data.favorites || []);
      setFavoriteIds(new Set((data.favorites || []).map((f) => f.productId?._id || f.productId)));
    } catch {
      // user not logged in or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (productId) => {
    const isFav = favoriteIds.has(productId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (isFav) {
        await favoriteService.remove(productId);
        setFavorites((prev) => prev.filter((f) => (f.productId?._id || f.productId) !== productId));
        toast.success("Removed from favorites");
      } else {
        await favoriteService.add(productId);
        await load(); // reload to get populated product
        toast.success("Added to favorites ❤️");
      }
    } catch {
      // Revert
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.add(productId) : next.delete(productId);
        return next;
      });
      toast.error("Failed to update favorites");
    }
  }, [favoriteIds, load]);

  const isFavorite = useCallback((id) => favoriteIds.has(id), [favoriteIds]);

  return { favorites, favoriteIds, loading, toggle, isFavorite, reload: load };
}
