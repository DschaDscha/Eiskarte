const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "eis2024";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const sepIndex = decoded.indexOf(":");
    const user = decoded.slice(0, sepIndex);
    const pass = decoded.slice(sepIndex + 1);
    if (user === username && pass === password) {
      return next();
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="Eiskarte Admin"');
  res.status(401).send("Authentifizierung erforderlich.");
}
