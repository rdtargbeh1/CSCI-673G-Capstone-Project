// src/shared/lib/jwtRole.ts
export function decodeJwtPayload(token: string): any {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  const payload = parts[1];

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  const json = decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );

  return JSON.parse(json);
}

export function getSystemAdminFromToken(accessToken: string) {
  const claims = decodeJwtPayload(accessToken);
  const roles: string[] = Array.isArray(claims.roles) ? claims.roles : [];

  const isSystemAdmin =
    claims.isSystemAdmin === true ||
    roles.some(
      (r) =>
        r === "ROLE_SYSTEM_ADMIN" ||
        r === "SYSTEM_ADMIN" ||
        r.endsWith("SYSTEM_ADMIN")
    );

  return {
    userId: String(claims.userId ?? claims.sub ?? ""),
    userName: String(claims.userName ?? ""),
    isSystemAdmin,
  };
}
