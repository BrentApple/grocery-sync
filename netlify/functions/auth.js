const fetch = require("node-fetch");

// ─── GET /api/auth ──────────────────────────────────────────────
// Redirects user to Kroger's login page
// ─── GET /api/auth?code=XYZ ─────────────────────────────────────
// Exchanges the auth code for an access token (after Kroger redirects back)

exports.handler = async (event) => {
  const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, SITE_URL } = process.env;
  const redirectUri = `${SITE_URL || "http://localhost:8080"}/api/auth-callback`;

  const params = event.queryStringParameters || {};

  // Step 1: Start OAuth — redirect user to Kroger login
  if (!params.code) {
    const krogerAuthUrl =
      `https://api.kroger.com/v1/connect/oauth2/authorize` +
      `?scope=product.compact%20cart.basic:write` +
      `&response_type=code` +
      `&client_id=${KROGER_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
      statusCode: 302,
      headers: { Location: krogerAuthUrl },
      body: "",
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: "Unexpected request" }) };
};
