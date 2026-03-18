const fetch = require("node-fetch");

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((c) => {
    const [key, ...val] = c.trim().split("=");
    cookies[key] = val.join("=");
  });
  return cookies;
}

// GET /api/products?term=bananas&locationId=01400376
exports.handler = async (event) => {
  const cookies = parseCookies(event.headers.cookie);
  const token = cookies.kroger_access;

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Not logged in." }) };
  }

  const { term, locationId } = event.queryStringParameters || {};

  if (!term || !locationId) {
    return { statusCode: 400, body: JSON.stringify({ error: "term and locationId required." }) };
  }

  try {
    const url = new URL("https://api.kroger.com/v1/products");
    url.searchParams.set("filter.term", term);
    url.searchParams.set("filter.locationId", locationId);
    url.searchParams.set("filter.limit", "5");
    url.searchParams.set("filter.fulfillment", "ais"); // available in store

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: "Product search failed", details: data }) };
    }

    const products = (data.data || []).map((p) => {
      const item = p.items?.[0];
      const price = item?.price;
      const img = p.images?.find((i) => i.perspective === "front");
      const imgUrl = img?.sizes?.find((s) => s.size === "medium")?.url ||
                     img?.sizes?.find((s) => s.size === "small")?.url || null;

      return {
        productId: p.productId,
        upc: p.upc,
        name: p.description,
        brand: p.brand,
        size: item?.size || "",
        price: price?.regular ?? null,
        promoPrice: price?.promo ?? null,
        inStock: item?.fulfillment?.inStore ?? false,
        aisle: item?.aisleLocations?.[0]?.description || null,
        image: imgUrl,
      };
    });

    // Sort: prefer Kroger/Simple Truth brands
    const preferred = ["kroger", "simple truth", "simple truth organic"];
    products.sort((a, b) => {
      const aP = preferred.some((p) => (a.brand || "").toLowerCase().includes(p));
      const bP = preferred.some((p) => (b.brand || "").toLowerCase().includes(p));
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return 0;
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    };
  } catch (err) {
    console.error("Product error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
