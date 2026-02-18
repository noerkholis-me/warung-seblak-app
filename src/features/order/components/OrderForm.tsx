"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrderSchema,
  CreateOrderInput,
  preferencesSchema,
} from "@/features/order/schemas/order.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

interface OrderFormProps {
  bowlId: string;
}

export function OrderForm({ bowlId }: OrderFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      router.push(`/order/track/${data.order.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      bowlId: bowlId,
      preferences: {
        broth: "kuah",
        spicyLevel: 3,
        taste: "normal",
      },
    },
  });

  const tastes = Object.values(preferencesSchema.shape.taste.enum);

  const spicyLevel = useWatch({ control, name: "preferences.spicyLevel" });
  const selectedBroth = useWatch({ control, name: "preferences.broth" });
  const selectedTaste = useWatch({ control, name: "preferences.taste" });

  const onSubmit = (data: CreateOrderInput) => {
    setError(null);
    createOrder.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl">
          🍜 Seblak Prasmanan
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Wadah: {bowlId}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nama kamu</Label>
            <Input
              id="customer_name"
              placeholder="Contoh: Budi"
              {...register("customerName")}
            />
            {errors.customerName && (
              <p className="text-sm text-red-500">
                {errors.customerName.message}
              </p>
            )}
          </div>

          {/* Level Pedas */}
          <div className="space-y-2">
            <Label>Level Pedas</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setValue("preferences.spicyLevel", level)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                    spicyLevel === level
                      ? "bg-red-500 text-white border-red-500"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {level}🌶️
                </button>
              ))}
            </div>
          </div>

          {/* Jenis Kuah */}
          <div className="space-y-2">
            <Label>Jenis Kuah</Label>
            <div className="flex gap-2">
              {(["kuah", "nyemek", "kering"] as const).map((broth) => (
                <button
                  key={broth}
                  type="button"
                  onClick={() => setValue("preferences.broth", broth)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize transition-colors ${
                    selectedBroth === broth
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {broth}
                </button>
              ))}
            </div>
          </div>

          {/* Rasa */}
          <div className="space-y-2">
            <Label>Rasa</Label>
            <div className="flex gap-2">
              {tastes.map((taste) => (
                <button
                  key={taste}
                  type="button"
                  onClick={() => setValue("preferences.taste", taste)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium capitalize transition-colors ${
                    selectedTaste === taste
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {taste}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="extra_notes">
              Catatan tambahan{" "}
              <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Textarea
              id="extra_notes"
              placeholder="Contoh: tidak pakai kencur"
              rows={2}
              {...register("preferences.extraNotes")}
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? "Memproses..." : "Pesan Sekarang →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
