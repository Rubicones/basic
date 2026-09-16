"use client";

import { useState } from "react";
import { Button, Dialog, Drawer, Input, Stack, Textarea, useToast } from "@/components/ui";

/** The parts of the kit that only exist once something has been clicked. */
export function OverlayDemo() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <>
      <Stack direction="row" gap={3} wrap>
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Button variant="outline" onClick={() => setDrawer(true)}>
          Open drawer
        </Button>
      </Stack>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Dialog"
        footer={
          <Stack direction="row" gap={3} justify="end">
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialog(false)}>Save</Button>
          </Stack>
        }
      >
        <Stack gap={5}>
          <p className="text-body-sm text-content-secondary">
            Native &lt;dialog&gt; with showModal: focus is trapped, Esc closes, the page
            behind is inert, and it renders in the top layer. Tab through it — focus never
            escapes, and it returns to the trigger on close.
          </p>
          <Input name="demo-name" label="Name" placeholder="Type here" />
          <Textarea
            name="demo-note"
            label="Note"
            rows={6}
            placeholder="Long text"
            help="The body scrolls; header and footer do not."
          />
        </Stack>
      </Dialog>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Drawer">
        <p className="text-body-sm text-content-secondary">
          Same mechanics, different entrance: from the bottom on a phone, from the right at
          sm and up. Resize the window with this open.
        </p>
      </Drawer>
    </>
  );
}

export function ToastDemo() {
  const { show } = useToast();

  return (
    <Stack direction="row" gap={3} wrap>
      <Button variant="outline" onClick={() => show("Saved.", "success")}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => show("That didn't send. Try again.", "error")}>
        Error toast
      </Button>
      <Button variant="outline" onClick={() => show("Nothing to report.", "info")}>
        Info toast
      </Button>
    </Stack>
  );
}

/** Loading is a state of the real button, not a separate component. */
export function LoadingDemo() {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      loading={busy}
      loadingLabel="Sending…"
      onClick={() => {
        setBusy(true);
        window.setTimeout(() => setBusy(false), 2200);
      }}
    >
      Send order
    </Button>
  );
}
