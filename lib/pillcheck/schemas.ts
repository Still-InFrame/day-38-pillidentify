import { z } from "zod";
import { CONFIDENCE_LEVELS, PHOTO_QUALITY, SHAPES } from "./constants";

const confidenceSchema = z.enum(CONFIDENCE_LEVELS);
const photoQualitySchema = z.enum(PHOTO_QUALITY);
const shapeSchema = z.enum(SHAPES);

export const analyzePillImageResponseSchema = z.object({
  imprint_text: z.string().trim().min(1).nullable(),
  imprint_confidence: confidenceSchema,
  shape: shapeSchema,
  shape_confidence: confidenceSchema,
  color: z.string().trim().min(1).nullable(),
  color_confidence: confidenceSchema,
  has_score_line: z.boolean().nullable(),
  visible_markings: z.array(z.string().trim()).default([]),
  photo_quality: photoQualitySchema,
  warnings: z.array(z.string().trim()).default([]),
  should_retake_photo: z.boolean(),
});

export const analyzePillImageRequestSchema = z.object({
  image_url: z
    .string()
    .refine(
      (value) => value.startsWith("data:image/") || z.url().safeParse(value).success,
      "Must be an image data URL or URL",
    )
    .optional(),
  front_image_url: z
    .string()
    .refine(
      (value) => value.startsWith("data:image/") || z.url().safeParse(value).success,
      "Must be an image data URL or URL",
    )
    .optional(),
  back_image_url: z
    .string()
    .refine(
      (value) => value.startsWith("data:image/") || z.url().safeParse(value).success,
      "Must be an image data URL or URL",
    )
    .optional(),
  back_is_blank: z.boolean().default(false),
});

export const searchPillMatchesRequestSchema = z.object({
  imprint: z.string().trim().min(1).nullable(),
  front_imprint: z.string().trim().min(1).nullable().optional(),
  back_imprint: z.string().trim().min(1).nullable().optional(),
  shape: z.string().trim().min(1).nullable(),
  color: z.string().trim().min(1).nullable(),
  photo_quality: photoQualitySchema.default("okay"),
});

export const pillReferenceSchema = z.object({
  id: z.string(),
  medication_name: z.string(),
  generic_name: z.string().nullable(),
  brand_name: z.string().nullable(),
  strength: z.string().nullable(),
  manufacturer: z.string().nullable(),
  imprint: z.string().nullable(),
  normalized_imprint: z.string().nullable(),
  shape: z.string().nullable(),
  color: z.string().nullable(),
  dosage_form: z.string().nullable(),
  route: z.string().nullable(),
  ndc: z.string().nullable(),
  rxcui: z.string().nullable(),
  dailymed_setid: z.string().nullable(),
  image_url: z.string().nullable().optional(),
  source: z.string().nullable(),
  source_updated_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const pillMatchSchema = z.object({
  pill_reference_id: z.string(),
  medication_name: z.string(),
  generic_name: z.string().nullable(),
  brand_name: z.string().nullable(),
  strength: z.string().nullable(),
  manufacturer: z.string().nullable(),
  imprint: z.string().nullable(),
  shape: z.string().nullable(),
  color: z.string().nullable(),
  ndc: z.string().nullable(),
  rxcui: z.string().nullable(),
  dailymed_setid: z.string().nullable(),
  confidence_score: z.number(),
  confidence_label: z.enum(["low", "medium", "high"]),
  match_reasons: z.array(z.string()),
  safety_disclaimer: z.string(),
});

export const searchPillMatchesResponseSchema = z.object({
  matches: z.array(pillMatchSchema),
});

export const feedbackRequestSchema = z.object({
  search_id: z.string().uuid().optional(),
  pill_reference_id: z.string().uuid(),
  feedback_value: z.enum(["looks_correct", "looks_wrong", "not_sure"]),
});

export const referenceCorrectionRequestSchema = z.object({
  medication_name: z.string().trim().min(2),
  imprint: z.string().trim().min(1).nullable(),
  front_imprint: z.string().trim().min(1).nullable().optional(),
  back_imprint: z.string().trim().min(1).nullable().optional(),
  shape: z.string().trim().min(1).nullable(),
  color: z.string().trim().min(1).nullable(),
  photo_quality: photoQualitySchema.default("okay"),
});
