import { NextResponse } from "next/server";

import { readSession } from "@/lib/session";

const geminiModels = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];
const extractionPrompt = `You extract ride details from an inDrive ride screenshot. Return only valid JSON with exactly these keys:
{
  "pickupDistance": number,
  "customerDistance": number,
  "ridePrice": number,
  "acUsed": boolean
}
Rules:
- pickupDistance is the distance shown near Point A, meaning the distance between the driver and customer.
- customerDistance is the trip distance shown near Point B, in kilometers. Convert comma decimals such as 28,1 to 28.1.
- ridePrice is the numeric fare shown with Rs, such as Rs 13,15 means 13.15.
- acUsed is true only when the screenshot visibly contains "Ride A/C" or an equivalent AC label. Otherwise use false.
- Use 0 only when a requested numeric value is genuinely not visible.
- Never include markdown, explanations, or extra keys.`;

function parseGeminiJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const pickupDistance = Number(parsed.pickupDistance);
  const customerDistance = Number(parsed.customerDistance);
  const ridePrice = Number(parsed.ridePrice);

  if (
    !Number.isFinite(pickupDistance) ||
    pickupDistance < 0 ||
    !Number.isFinite(customerDistance) ||
    customerDistance < 0 ||
    !Number.isFinite(ridePrice) ||
    ridePrice < 0
  ) {
    throw new Error("Gemini returned invalid ride values.");
  }

  return {
    pickupDistance,
    customerDistance,
    ridePrice,
    acUsed: parsed.acUsed === true,
  };
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey =
    process.env.GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || !image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Upload a valid ride screenshot." },
        { status: 400 },
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Screenshot must be smaller than 10 MB." },
        { status: 400 },
      );
    }

    const imageBytes = Buffer.from(await image.arrayBuffer()).toString(
      "base64",
    );
    let lastError = "Gemini could not read this screenshot.";

    for (const model of geminiModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: extractionPrompt },
                    { inlineData: { mimeType: image.type, data: imageBytes } },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
              },
            }),
          },
        );

        const payload = (await response.json()) as {
          error?: { message?: string };
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const message = payload.error?.message || `HTTP ${response.status}`;

        if (!response.ok) {
          lastError = message;
          const isTemporary =
            response.status === 429 ||
            response.status === 503 ||
            /high demand|temporar|unavailable|overloaded/i.test(message);

          if (isTemporary) continue;

          return NextResponse.json(
            { error: `Gemini could not read this screenshot: ${message}` },
            { status: 502 },
          );
        }

        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            return NextResponse.json({ ride: parseGeminiJson(text) });
          } catch (error) {
            lastError =
              error instanceof Error
                ? error.message
                : "Invalid Gemini response.";
          }
        } else {
          lastError = "No ride details were found in the screenshot.";
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Gemini request failed.";
      }
    }

    return NextResponse.json(
      {
        error: `Gemini is temporarily busy. Please try again in a moment. (${lastError})`,
      },
      { status: 503 },
    );
  } catch (error) {
    console.error("Ride screenshot extraction failed:", error);
    return NextResponse.json(
      { error: "Could not extract ride details from this screenshot." },
      { status: 422 },
    );
  }
}
