const fetch = require("node-fetch");

// Refreshes the Kroger access token using the refresh token in the cookie

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((c) => {
    const [key, ...val] = c.trim().split("=");
    cookies[key] = val.join("=");
  });
  return cookies;
}

exports.handler = async (event) => {
  const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET } = process.env;
  const cookies = parseCookies(event.headers.cookie);

  if (!cookies.kroger_refresh) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No refresh token. Please log in again." }),
    };
  }

  try {
    const encoded = Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString("base64");

    const response = await fetch("https://api.kroger.com/v1/connect/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${encoded}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: cookies.kroger_refresh,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Refresh failed. Please log in again.", details: data }),
      };
    }

    const maxAge = data.expires_in || 1800;
    const cookieFlags = "Path=/; HttpOnly; SameSite=Lax; Secure";

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [
          `kroger_access=${data.access_token}; Max-Age=${maxAge}; ${cookieFlags}`,
          ...(data.refresh_token
            ? [`kroger_refresh=${data.refresh_token}; Max-Age=2592000; ${cookieFlags}`]
            : []),
        ],
      },
      body: JSON.stringify({ success: true, expires_in: maxAge }),
    };
  } catch (err) {
    console.error("Refresh error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
