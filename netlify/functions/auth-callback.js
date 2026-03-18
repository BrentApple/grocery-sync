const fetch = require("node-fetch");

// Kroger redirects here after the user logs in.
// We exchange the auth code for an access_token + refresh_token,
// then redirect back to the app with the token in a cookie.

exports.handler = async (event) => {
  const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, SITE_URL } = process.env;
  const redirectUri = `${SITE_URL || "http://localhost:8080"}/api/auth-callback`;
  const params = event.queryStringParameters || {};

  if (!params.code) {
    return { statusCode: 400, body: "Missing authorization code." };
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
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Token exchange failed:", data);
      return {
        statusCode: 302,
        headers: { Location: `${SITE_URL || ""}/?error=auth_failed` },
        body: "",
      };
    }

    // Store tokens in httpOnly cookies (secure, not accessible to JS directly)
    const maxAge = data.expires_in || 1800;
    const cookieFlags = "Path=/; HttpOnly; SameSite=Lax; Secure";

    return {
      statusCode: 302,
      multiValueHeaders: {
        "Set-Cookie": [
          `kroger_access=${data.access_token}; Max-Age=${maxAge}; ${cookieFlags}`,
          `kroger_refresh=${data.refresh_token}; Max-Age=2592000; ${cookieFlags}`,
        ],
      },
      headers: { Location: `${SITE_URL || ""}/?logged_in=true` },
      body: "",
    };
  } catch (err) {
    console.error("Auth callback error:", err);
    return {
      statusCode: 302,
      headers: { Location: `${SITE_URL || ""}/?error=server_error` },
      body: "",
    };
  }
};
