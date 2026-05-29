import { ProductEditor } from "@/components/ProductEditor";

export default function ProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProductEditor productId={params.id} />;
}