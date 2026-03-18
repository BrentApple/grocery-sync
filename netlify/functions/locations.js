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

// GET /api/locations?zip=80246
exports.handler = async (event) => {
  const cookies = parseCookies(event.headers.cookie);
  const token = cookies.kroger_access;

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Not logged in." }) };
  }

  const zip = (event.queryStringParameters || {}).zip || "80246";

  try {
    const url =
      `https://api.kroger.com/v1/locations` +
      `?filter.zipCode.near=${zip}` +
      `&filter.limit=5` +
      `&filter.department=09`; // grocery department

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: "Location lookup failed", details: data }) };
    }

    const locations = (data.data || []).map((loc) => ({
      id: loc.locationId,
      name: loc.name,
      address: `${loc.address?.addressLine1 || ""}, ${loc.address?.city || ""} ${loc.address?.state || ""} ${loc.address?.zipCode || ""}`,
      chain: loc.chain,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    };
  } catch (err) {
    console.error("Location error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
