import { createHash } from "node:crypto";

import { getCiTokenByHash, markCiTokenUsed } from "./database";

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function extractBearerToken(authHeader: string | null) {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

export async function authenticateCiToken(projectId: string, authHeader: string | null) {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const ciToken = await getCiTokenByHash(projectId, sha256(token));
  if (!ciToken) {
    return null;
  }

  await markCiTokenUsed(ciToken.id);
  return ciToken;
}
