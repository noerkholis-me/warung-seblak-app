import z from "zod";

export const preferencesSchema = z.object({
  broth: z.enum(["kuah", "kering", "nyemek"]),
  spicyLevel: z.number().min(1).max(5),
  taste: z.enum(["pedas", "manis", "asin", "asam", "gurih", "normal"]),
  extraNotes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  bowlId: z.string().min(1),
  customerName: z.string().min(1, "Nama tidak boleh kosong").max(50),
  preferences: preferencesSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
