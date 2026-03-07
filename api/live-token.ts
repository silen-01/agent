import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Serverless endpoint: возвращает Gemini API key из серверного env.
 * Ключ никогда не попадает в клиентский bundle.
 * В Vercel: задайте GEMINI_API_KEY в Environment Variables.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return res.status(503).json({
      error: "Gemini API key not configured. Set GEMINI_API_KEY on the server.",
    });
  }

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ apiKey });
}
