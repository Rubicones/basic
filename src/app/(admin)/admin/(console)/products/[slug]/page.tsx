import { notFound } from "next/navigation";
import { Button } from "@/components/ui";
import { getProduct } from "@/lib/admin/queries";
import { ProductEditor } from "../editor";
import { deleteProduct } from "../actions";

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display-md">{slug}</h1>
        <form action={deleteProduct}>
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" variant="danger" size="sm">
            Delete
          </Button>
        </form>
      </div>

      <ProductEditor product={product} />
    </>
  );
}
