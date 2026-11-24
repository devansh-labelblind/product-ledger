// Optional write protection: if APP_PASSWORD is set, writes need the matching x-app-password header.
export function writeAllowed(request) {
  const expected = process.env.APP_PASSWORD;
  return !expected || request.headers.get("x-app-password") === expected;
}
export const unauthorized = () => Response.json({ error: "Wrong or missing password" }, { status: 401 });
