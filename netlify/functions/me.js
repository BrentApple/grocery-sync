// Simple check: does the user have a valid Kroger token cookie?
// Returns { loggedIn: true/false }

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
  const cookies = parseCookies(event.headers.cookie);
  const loggedIn = !!cookies.kroger_access;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loggedIn }),
  };
};
