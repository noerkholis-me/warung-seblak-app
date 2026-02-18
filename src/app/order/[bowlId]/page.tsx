import { OrderForm } from "@/features/order/components/OrderForm";
import { Card, CardContent } from "@/components/ui/card";
import { serverClient } from "@/lib/trpc/server";

interface Props {
  params: Promise<{ bowlId: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { bowlId } = await params;

  const bowl = await serverClient.bowls.getById({ id: bowlId });

  if (!bowl) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-4xl">❓</p>
            <p className="font-semibold">Wadah tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Pastikan kamu scan QR code yang benar
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (bowl.isActive) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-4xl">🚫</p>
            <p className="font-semibold">Wadah sedang digunakan</p>
            <p className="text-sm text-muted-foreground">
              Silakan ambil wadah lain dari area prasmanan
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <OrderForm bowlId={bowlId} />
    </main>
  );
}
