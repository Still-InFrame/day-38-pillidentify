import { NextRequest, NextResponse } from "next/server";
import {
  analyzePillImageRequestSchema,
  analyzePillImageResponseSchema,
} from "@/lib/pillcheck/schemas";

const visionResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    imprint_text: { type: ["string", "null"] },
    imprint_confidence: { type: "string", enum: ["low", "medium", "high"] },
    shape: {
      type: "string",
      enum: [
        "round",
        "oval",
        "capsule",
        "oblong",
        "tablet",
        "square",
        "triangle",
        "unknown",
      ],
    },
    shape_confidence: { type: "string", enum: ["low", "medium", "high"] },
    color: { type: ["string", "null"] },
    color_confidence: { type: "string", enum: ["low", "medium", "high"] },
    has_score_line: { type: ["boolean", "null"] },
    visible_markings: { type: "array", items: { type: "string" } },
    photo_quality: { type: "string", enum: ["poor", "okay", "good"] },
    warnings: { type: "array", items: { type: "string" } },
    should_retake_photo: { type: "boolean" },
  },
  required: [
    "imprint_text",
    "imprint_confidence",
    "shape",
    "shape_confidence",
    "color",
    "color_confidence",
    "has_score_line",
    "visible_markings",
    "photo_quality",
    "warnings",
    "should_retake_photo",
  ],
};

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("multipart/form-data")
    ? await parseFormData(request)
    : await request.json().catch(() => ({}));

  const parsed = analyzePillImageRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image input" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    const analysis = analyzePillImageResponseSchema.parse(stubbedVisionResponse());
    return NextResponse.json(analysis);
  }

  try {
    const analysis = await analyzeWithOpenAI(parsed.data.image_url);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("OpenAI pill trait extraction failed", error);
    return NextResponse.json(
      { error: "Image analysis failed. Try a clearer single-pill photo." },
      { status: 502 },
    );
  }
}

async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const imageUrl = formData.get("image_url");

  return {
    image_url: typeof imageUrl === "string" ? imageUrl : undefined,
  };
}

async function analyzeWithOpenAI(imageUrl: string | undefined) {
  if (!imageUrl) {
    throw new Error("Missing image_url");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5.5",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Extract only visible pill traits from this image.",
                "Never identify the medication name. Never say the pill is safe.",
                "Never provide dosage, interaction, treatment, or emergency advice.",
                "If more than one pill is visible, no pill is visible, the image is blurry, dark, cropped, obstructed, or the imprint cannot be read, set should_retake_photo to true and add warnings.",
                "If no imprint is visible, set imprint_text to null, imprint_confidence to low, and include a warning that the pill may not be reliably identifiable.",
              ].join(" "),
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "pill_visible_trait_extraction",
          strict: true,
          schema: visionResponseSchema,
        },
      },
      max_output_tokens: 800,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI response did not include output text");
  }

  return analyzePillImageResponseSchema.parse(JSON.parse(outputText));
}

function extractOutputText(payload: {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}) {
  if (payload.output_text) return payload.output_text;

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)?.text;
}

function stubbedVisionResponse() {
  return {
    imprint_text: null,
    imprint_confidence: "low",
    shape: "unknown",
    shape_confidence: "low",
    color: null,
    color_confidence: "low",
    has_score_line: null,
    visible_markings: [],
    photo_quality: "okay",
    warnings: [
      "Vision analysis is running in stub mode. Add OPENAI_API_KEY to .env.local to enable image trait extraction.",
      "If the imprint is not visible, this pill may not be reliably identifiable.",
    ],
    should_retake_photo: false,
  };
}
