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

// POST /api/cart
// Body: { items: [{ upc: "0001234567890", quantity: 1 }] }
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const cookies = parseCookies(event.headers.cookie);
  const token = cookies.kroger_access;

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Not logged in." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  if (!body.items?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "items array required." }) };
  }

  try {
    const res = await fetch("https://api.kroger.com/v1/cart/add", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: body.items.map((i) => ({
          upc: i.upc,
          quantity: i.quantity || 1,
        })),
      }),
    });

    if (res.status === 204 || res.status === 200) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, itemCount: body.items.length }),
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: "Cart update failed", details: data }),
    };
  } catch (err) {
    console.error("Cart error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
