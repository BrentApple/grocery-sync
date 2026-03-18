// Clears the auth cookies
exports.handler = async () => {
  const cookieFlags = "Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0";
  const { SITE_URL } = process.env;

  return {
    statusCode: 302,
    multiValueHeaders: {
      "Set-Cookie": [
        `kroger_access=; ${cookieFlags}`,
        `kroger_refresh=; ${cookieFlags}`,
      ],
    },
    headers: { Location: `${SITE_URL || ""}/` },
    body: "",
  };
};
