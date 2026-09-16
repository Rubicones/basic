import { ProductEditor } from "../editor";

export default function NewProductPage() {
  return (
    <>
      <h1 className="text-display-md mb-8">New product</h1>
      <ProductEditor product={null} />
    </>
  );
}
