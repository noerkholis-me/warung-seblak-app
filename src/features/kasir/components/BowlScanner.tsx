"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { Preferences } from "@/features/order/schemas/order.schema";

interface BowlScannerProps {
  onBowlFound: (
    bowlId: string,
    order: {
      id: string;
      customerName: string;
      preferences: Preferences;
      totalPrice: number | null;
      status: string;
    } | null,
  ) => void;
}

export function BowlScanner({ onBowlFound }: BowlScannerProps) {
  const [bowlId, setBowlId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  const handleScan = async () => {
    if (!bowlId.trim()) return;
    setError(null);
    setIsLoading(true);

    try {
      const id = bowlId.trim();

      // Verify bowl exists
      await utils.bowls.getById.fetch({ id });

      // Get active order for the bowl
      const { order } = await utils.bowls.getActiveOrder.fetch({ bowlId: id });

      onBowlFound(id, order);
      setBowlId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scan QR Wadah</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="bowl-input">ID Wadah</Label>
          <div className="flex gap-2">
            <Input
              id="bowl-input"
              placeholder="Scan atau ketik ID wadah..."
              value={bowlId}
              onChange={(e) => setBowlId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              autoFocus
              disabled={isLoading}
            />
            <Button onClick={handleScan} disabled={isLoading || !bowlId}>
              {isLoading ? "..." : "Cek"}
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Arahkan scanner ke QR code pada wadah, atau ketik ID secara manual
        </p>
      </CardContent>
    </Card>
  );
}
