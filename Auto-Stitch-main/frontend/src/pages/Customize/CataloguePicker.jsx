import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { X, Search, Check, ArrowLeft } from 'lucide-react';
import API_URL from '../../config/api';

const CATEGORIES = ['All', 'Luxury Pret', 'Bridal', 'Casual', 'Formal', 'Abayas', 'Festive', 'Ready To Wear'];
const PAGE_SIZE = 12;

/**
 * Modal that lets the customer pick photos from the boutique catalogue.
 * Products with several photos open into a second view so a specific photo
 * (e.g. a close-up of a neckline) can be chosen.
 */
export default function CataloguePicker({ regionName, remaining, alreadyAdded = [], onClose, onConfirm }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [picked, setPicked] = useState([]); // [{ url, productId, productName }]
  const requestId = useRef(0);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Close on Escape, lock page scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const load = useCallback(async (pageNum) => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pageNum, limit: PAGE_SIZE });
      if (category !== 'All') params.append('category', category);
      if (debouncedSearch) params.append('search', debouncedSearch);
      const { data } = await axios.get(`${API_URL}/api/products?${params.toString()}`);
      if (id !== requestId.current) return; // a newer request replaced this one
      const withPhotos = (data.products || []).filter((p) => p.images?.length > 0);
      setProducts((prev) => (pageNum === 1 ? withPhotos : [...prev, ...withPhotos]));
      setPage(pageNum);
      setPages(data.pagination?.pages || 1);
    } catch {
      if (id !== requestId.current) return;
      setError('Could not load the catalogue. Check your connection and try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [category, debouncedSearch]);

  useEffect(() => {
    setProducts([]);
    load(1);
  }, [load]);

  const atLimit = picked.length >= remaining;
  const isPicked = (url) => picked.some((p) => p.url === url);
  const isAdded = (url) => alreadyAdded.includes(url);

  const togglePhoto = (product, url) => {
    if (isAdded(url)) return;
    setPicked((prev) => {
      if (prev.some((p) => p.url === url)) return prev.filter((p) => p.url !== url);
      if (prev.length >= remaining) return prev;
      return [...prev, { url, productId: product._id, productName: product.name }];
    });
  };

  const openProduct = (product) => {
    if (product.images.length === 1) togglePhoto(product, product.images[0]);
    else setActiveProduct(product);
  };

  const pickedCount = (product) => picked.filter((p) => p.productId === product._id).length;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="rr-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="rr-modal" role="dialog" aria-modal="true" aria-label={`Choose catalogue photos for ${regionName}`}>
        <div className="rr-modal-head">
          {activeProduct ? (
            <button type="button" className="rr-back" onClick={() => setActiveProduct(null)}>
              <ArrowLeft size={16} /> Back to results
            </button>
          ) : (
            <h3>Choose photos for {regionName}</h3>
          )}
          <button type="button" className="rr-icon-btn" onClick={onClose} aria-label="Close catalogue">
            <X size={18} />
          </button>
        </div>

        {!activeProduct && (
          <div className="rr-modal-tools">
            <div className="rr-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, boutique or style"
                aria-label="Search the catalogue"
                autoFocus
              />
            </div>
            <div className="rr-chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`rr-chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rr-modal-body">
          {activeProduct ? (
            <>
              <p className="rr-product-title">{activeProduct.name}</p>
              <div className="rr-grid">
                {activeProduct.images.map((url) => {
                  const added = isAdded(url);
                  const on = isPicked(url);
                  const dim = !on && !added && atLimit;
                  return (
                    <button
                      key={url}
                      type="button"
                      className={`rr-tile ${on ? 'picked' : ''} ${dim || added ? 'dim' : ''}`}
                      aria-pressed={on}
                      disabled={dim || added}
                      onClick={() => togglePhoto(activeProduct, url)}
                    >
                      <div className="rr-tile-img">
                        <img src={url} alt={activeProduct.name} loading="lazy" />
                        {on && <span className="rr-tile-check"><Check size={13} /></span>}
                        {added && <span className="rr-tile-badge">Already added</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="rr-state">
                  <p>{error}</p>
                  <button type="button" className="rr-btn" onClick={() => load(1)}>Try again</button>
                </div>
              )}

              {!error && !loading && products.length === 0 && (
                <div className="rr-state">
                  <p>No products match your search. Try another word or category.</p>
                </div>
              )}

              {products.length > 0 && (
                <div className="rr-grid">
                  {products.map((p) => {
                    const count = pickedCount(p);
                    return (
                      <button key={p._id} type="button" className={`rr-tile ${count > 0 ? 'picked' : ''}`} onClick={() => openProduct(p)}>
                        <div className="rr-tile-img">
                          <img src={p.images[0]} alt={p.name} loading="lazy" />
                          {p.images.length > 1 && <span className="rr-tile-badge">{p.images.length} photos</span>}
                          {count > 0 && <span className="rr-tile-check">{count}</span>}
                        </div>
                        <p className="rr-tile-name">{p.name}</p>
                        <p className="rr-tile-meta">{p.boutique?.name || 'Partner boutique'}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {loading && <p className="rr-loading">Loading…</p>}

              {!loading && !error && page < pages && (
                <div className="rr-more">
                  <button type="button" className="rr-btn" onClick={() => load(page + 1)}>Show more</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rr-modal-foot">
          <span className="rr-foot-note">
            {picked.length === 0
              ? `Pick up to ${remaining} photo${remaining === 1 ? '' : 's'} for this region`
              : atLimit
                ? `${picked.length} selected (limit reached)`
                : `${picked.length} of ${remaining} selected`}
          </span>
          <button
            type="button"
            className="rr-confirm"
            disabled={picked.length === 0}
            onClick={() => onConfirm(picked)}
          >
            {picked.length > 0 ? `Add ${picked.length} photo${picked.length === 1 ? '' : 's'}` : 'Add photos'}
          </button>
        </div>
      </div>
    </div>
  );
}