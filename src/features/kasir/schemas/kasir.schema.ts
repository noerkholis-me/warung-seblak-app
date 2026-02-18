import { z } from "zod";

export const inputHargaSchema = z.object({
  total_price: z
    .number({ error: "Harga harus berupa angka" })
    .min(1000, "Harga minimal Rp 1.000")
    .max(10000000, "Harga terlalu besar"),
});

export type InputHargaInput = z.infer<typeof inputHargaSchema>;
