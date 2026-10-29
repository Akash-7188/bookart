/**
 * Test bridge — the flow suite runs outside Next's bundler, so this module
 * re-exports the domain functions it needs with the server-only bits trimmed.
 */
export {
  createListing,
  createSession,
  findUserByEmail,
  getDb,
  getProductBySlugOrId,
  hydrate,
  inspectAndSettle,
  listingsBySeller,
  logSearch,
  placePurchaseOrders,
  queryProducts,
  rentItem,
  rentalsForBuyer,
  rentalsForSeller,
  requestReturn,
  resetDb,
  searchSuggestions,
  trendingSearches,
} from "./db";

/** Placeholder kept for symmetry with the server-action suite. */
export const checkoutActionPlaceholder = null;
