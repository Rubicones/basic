import { IconChevronDown, IconClose } from "@/components/ui";
import { listFields } from "@/lib/admin/queries";
import { FieldEditor } from "./editor";
import { deleteField, moveField } from "./actions";

/**
 * The row controls live inside each card's header.
 *
 * They were a column of three stacked buttons beside the card, which made every
 * row as tall as that column whether the row had anything to say or not — a list
 * of eight questions took up a screen and a half of mostly nothing.
 */
export default async function FormPage() {
  const fields = await listFields();

  return (
    <>
      <h1 className="text-display-md">Order form</h1>
      <p className="text-body-sm text-content-secondary mt-2 mb-8 max-w-measure">
        These are the questions the order form asks. A field that is hidden keeps its answers in
        past orders — nothing here rewrites an order that has already been placed.
      </p>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <FieldEditor
            key={field.id}
            field={field}
            toolbar={
              <>
                <RowButton action={moveField} id={field.id} direction="up" disabled={index === 0}>
                  <span className="flex rotate-180">
                    <IconChevronDown size={16} />
                  </span>
                  <span className="sr-only">Move up</span>
                </RowButton>

                <RowButton
                  action={moveField}
                  id={field.id}
                  direction="down"
                  disabled={index === fields.length - 1}
                >
                  <IconChevronDown size={16} />
                  <span className="sr-only">Move down</span>
                </RowButton>

                <RowButton action={deleteField} id={field.id} danger>
                  <IconClose size={16} />
                  <span className="sr-only">Delete field</span>
                </RowButton>
              </>
            }
          />
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-title mb-4 font-extrabold">Add a question</h2>
        <FieldEditor field={null} defaultOpen />
      </div>
    </>
  );
}

/**
 * A 36 px square inside the header row, so the controls never set the row's
 * height. Not the kit's `Button`: that one is a 44 px pill with a label, which is
 * right on a form and wrong three-in-a-row in a list header.
 */
function RowButton({
  action,
  id,
  direction,
  disabled = false,
  danger = false,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  direction?: "up" | "down";
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {direction && <input type="hidden" name="direction" value={direction} />}
      <button
        type="submit"
        disabled={disabled}
        className={
          danger
            ? "text-content-secondary hover:bg-surface-sunken hover:text-danger grid size-9 place-items-center rounded-pill transition-surface"
            : "text-content-secondary hover:bg-surface-sunken hover:text-brand disabled:text-content-tertiary grid size-9 place-items-center rounded-pill transition-surface disabled:pointer-events-none"
        }
      >
        {children}
      </button>
    </form>
  );
}
