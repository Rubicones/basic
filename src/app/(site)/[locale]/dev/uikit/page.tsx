import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n/config";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Grid,
  IconArrowRight,
  IconCheck,
  IconPlus,
  Input,
  Link,
  Panel,
  Section,
  Select,
  Skeleton,
  Stack,
  Textarea,
  Tile,
  ToastProvider,
} from "@/components/ui";
import { LoadingDemo, OverlayDemo, ToastDemo } from "./interactive";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The review surface.
 *
 * Every primitive, every state, every size, side by side — and the same page in
 * all three locales, because the point is to see Serbian and Russian strings in
 * the components before any screen is built on them.
 */

/* The 1.4x problem, in the exact places it bites: a button label, a field label,
   a badge, and a nav item. English first, then the real translations. */
const LONG = {
  en: { cta: "Send order", field: "Pickup date", badge: "team favorite", nav: "For business" },
  sr: {
    cta: "Pošalji porudžbinu",
    field: "Datum preuzimanja",
    badge: "omiljeno u ekipi",
    nav: "Za lokale",
  },
  ru: {
    cta: "Отправить заказ",
    field: "Дата получения",
    badge: "выбор команды",
    nav: "Для заведений",
  },
} as const;

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="border-line border-t pt-6">
      <h3 className="text-display-sm">{title}</h3>
      {note && <p className="text-body-sm text-content-secondary mt-1 max-w-measure">{note}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* Static map, not `bg-${name}` — Tailwind scans source text, so a class assembled
   at runtime is never generated and the swatch renders transparent. */
const SWATCHES = {
  "surface-page": "bg-surface-page",
  "surface-raised": "bg-surface-raised",
  "surface-sunken": "bg-surface-sunken",
  "surface-brand": "bg-surface-brand",
  brand: "bg-brand",
  "brand-hover": "bg-brand-hover",
  "content-primary": "bg-content-primary",
  "content-secondary": "bg-content-secondary",
  "content-tertiary": "bg-content-tertiary",
  line: "bg-line",
  "line-control": "bg-line-control",
  danger: "bg-danger",
  success: "bg-success",
} as const;

function Swatch({ name, ratio }: { name: keyof typeof SWATCHES; ratio?: string }) {
  return (
    <Stack gap={2}>
      <span className={`border-line h-14 w-full rounded-inner border ${SWATCHES[name]}`} />
      <span className="text-caption text-content-secondary">
        {name}
        {ratio && <span className="text-content-tertiary"> · {ratio}</span>}
      </span>
    </Stack>
  );
}

export default async function UiKitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const long = LONG[locale];

  return (
    <ToastProvider>
      <main id="main">
        <Section size="compact" tone="raised">
          <Container>
            <p className="text-micro text-brand uppercase">Phase 2 · review surface</p>
            <h1 className="text-display-lg mt-3">UI kit</h1>
            <p className="text-body-lg text-content-secondary mt-4 max-w-measure">
              Every primitive in every state. Tab through this page — focus must be visible on
              every interactive element, without exception.
            </p>
            <Stack direction="row" gap={3} wrap>
              <div className="mt-6 flex gap-3">
                {LOCALES.map((l) => (
                  <Link key={l} href={`/${l}/dev/uikit`} tone={l === locale ? "inline" : "quiet"}>
                    {l}
                  </Link>
                ))}
              </div>
            </Stack>
          </Container>
        </Section>

        <Section>
          <Container>
            <Stack gap={12}>
              {/* ---------------------------------------------------------- color */}
              <Row
                title="Color"
                note="The reference palette, kept by decision. Ratios are measured against the page surface; the ones marked under AA are known and deliberate. Only --color-focus departs from the reference, because a clay focus ring at 2.86:1 is invisible to a keyboard user."
              >
                <Grid cols={4} gap={4}>
                  <Swatch name="surface-page" />
                  <Swatch name="surface-raised" />
                  <Swatch name="surface-sunken" />
                  <Swatch name="surface-brand" />
                  <Swatch name="brand" ratio="2.86:1 — under AA, kept from the reference" />
                  <Swatch name="brand-hover" ratio="hover fill" />
                  <Swatch name="content-primary" ratio="11.49:1" />
                  <Swatch name="content-secondary" ratio="4.56:1" />
                  <Swatch name="content-tertiary" ratio="3.75:1 — under AA" />
                  <Swatch name="line" ratio="decorative" />
                  <Swatch name="line-control" ratio="1.27:1 — under 1.4.11" />
                  <Swatch name="danger" ratio="4.46:1" />
                  <Swatch name="success" ratio="5.32:1" />
                </Grid>
              </Row>

              {/* ----------------------------------------------------------- type */}
              <Row
                title="Type"
                note="Display sizes are the display face; the rest is the body face. In Russian both come from Onest, which has Cyrillic — Outfit and DM Sans do not."
              >
                <Stack gap={4}>
                  <p className="text-display-xl">Display xl</p>
                  <p className="text-display-lg">Display lg</p>
                  <p className="text-display-md">Display md</p>
                  <p className="text-display-sm">Display sm</p>
                  <p className="text-title">Title</p>
                  <p className="text-body-lg">Body lg — a paragraph at reading size.</p>
                  <p className="text-body">Body — the default.</p>
                  <p className="text-body-sm">Body sm — dense UI and form text.</p>
                  <p className="text-caption text-content-secondary">Caption — helper text.</p>
                  <p className="text-micro text-brand uppercase">Micro — the one label size</p>
                </Stack>
              </Row>

              {/* --------------------------------------------------------- buttons */}
              <Row
                title="Buttons"
                note="Four variants, three sizes. Size is a height, never padding. Hover, focus-visible, active, disabled and loading are all below."
              >
                <Stack gap={6}>
                  {(["solid", "outline", "ghost", "danger"] as const).map((variant) => (
                    <Stack key={variant} gap={3}>
                      <p className="text-micro text-content-tertiary uppercase">{variant}</p>
                      <Stack direction="row" gap={3} align="center" wrap>
                        <Button variant={variant} size="sm">
                          Small
                        </Button>
                        <Button variant={variant} size="md">
                          Medium
                        </Button>
                        <Button variant={variant} size="lg">
                          Large
                        </Button>
                        <Button variant={variant} iconEnd={<IconArrowRight size={16} />}>
                          With icon
                        </Button>
                        <Button variant={variant} iconStart={<IconPlus size={16} />}>
                          Leading
                        </Button>
                        <Button variant={variant} disabled>
                          Disabled
                        </Button>
                        <Button variant={variant} loading loadingLabel="Sending…">
                          Loading
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                  <Stack gap={3}>
                    <p className="text-micro text-content-tertiary uppercase">
                      loading, live — click it
                    </p>
                    <div>
                      <LoadingDemo />
                    </div>
                  </Stack>
                  <Stack gap={3}>
                    <p className="text-micro text-content-tertiary uppercase">full width</p>
                    <Button fullWidth iconEnd={<IconArrowRight size={16} />}>
                      {long.cta}
                    </Button>
                  </Stack>
                </Stack>
              </Row>

              {/* ----------------------------------------------------------- links */}
              <Row title="Links" note="A navigation is a link, never a button with an onClick.">
                <Stack direction="row" gap={6} align="center" wrap>
                  <Link href={`/${locale}`}>Inline link</Link>
                  <Link href={`/${locale}`} tone="quiet">
                    Quiet link
                  </Link>
                  <Link href={`/${locale}`} tone="button" size="sm">
                    Button link sm
                  </Link>
                  <Link href={`/${locale}`} tone="button">
                    Button link md
                  </Link>
                  <Link href={`/${locale}`} tone="button" size="lg">
                    Button link lg
                  </Link>
                  <Link href="https://example.com" external>
                    External
                  </Link>
                </Stack>
              </Row>

              {/* ---------------------------------------------------------- fields */}
              <Row
                title="Form controls"
                note="Borders are 3.05:1 so the control boundary satisfies 1.4.11. Errors carry an icon and a sentence — never color alone — and are wired through aria-describedby."
              >
                <Grid form gap={5}>
                  <Input name="a" label="Text" placeholder="Placeholder" required />
                  <Input name="b" label={long.field} type="date" help="With help text below." />
                  <Input
                    name="c"
                    label="Error state"
                    defaultValue="not a phone number"
                    error="Enter a phone number we can reach."
                  />
                  <Input name="d" label="Disabled" disabled defaultValue="Locked" />
                  <Select
                    name="e"
                    label="Select"
                    placeholder="Choose…"
                    options={[
                      { value: "1", label: "Beograd" },
                      { value: "2", label: "Novi Sad" },
                    ]}
                  />
                  <Select
                    name="f"
                    label="Select, error"
                    placeholder="Choose…"
                    error="Pick a city."
                    options={[{ value: "1", label: "Beograd" }]}
                  />
                  <Textarea
                    name="g"
                    label="Textarea"
                    wide
                    placeholder="Notes for the kitchen"
                    help="No resize handle: the row count is the affordance."
                  />
                  <Textarea name="h" label="Textarea, error" wide error="This field is required." />
                </Grid>

                <Stack gap={4} >
                  <div className="mt-6">
                    <Stack gap={4}>
                      <Checkbox name="k1" label="Show on the site" defaultChecked />
                      <Checkbox name="k2" label="Unchecked" help="With help text." />
                      <Checkbox name="k3" label="Disabled" disabled />
                      <Checkbox name="k4" label="Disabled, checked" disabled defaultChecked />
                    </Stack>
                  </div>
                </Stack>
              </Row>

              {/* ---------------------------------------------------------- badges */}
              <Row title="Badges" note="Five meanings, not six treatments of one accent color.">
                <Stack direction="row" gap={3} align="center" wrap>
                  <Badge>{long.badge}</Badge>
                  <Badge tone="brand">brand</Badge>
                  <Badge tone="success" iconStart={<IconCheck size={16} />}>
                    success
                  </Badge>
                  <Badge tone="danger">danger</Badge>
                  <Badge tone="inverse">on a photo</Badge>
                </Stack>
              </Row>

              {/* --------------------------------------------------------- surfaces */}
              <Row title="Surfaces" note="Card, Panel, Tile — three roles, one radius each.">
                <Grid cols={3} gap={5}>
                  <Card>
                    <p className="text-title">Card</p>
                    <p className="text-body-sm text-content-secondary mt-2">
                      Something you look at. 28px radius, raised, soft shadow.
                    </p>
                  </Card>
                  <Card interactive>
                    <p className="text-title">Card, interactive</p>
                    <p className="text-body-sm text-content-secondary mt-2">
                      Hover me. Only for a card that is genuinely a link or a control.
                    </p>
                  </Card>
                  <Panel>
                    <p className="text-title">Panel</p>
                    <p className="text-body-sm text-content-secondary mt-2">
                      Something you fill in. 24px radius, no hover.
                    </p>
                  </Panel>
                  <Panel tone="sunken">
                    <p className="text-title">Panel, sunken</p>
                    <p className="text-body-sm text-content-secondary mt-2">
                      For a panel sitting on a raised surface.
                    </p>
                  </Panel>
                  <Tile>
                    <p className="text-micro text-content-secondary uppercase">Tile</p>
                    <p className="text-display-sm mt-1">3.000 RSD</p>
                  </Tile>
                </Grid>
              </Row>

              {/* -------------------------------------------------------- skeleton */}
              <Row
                title="Loading states"
                note="A skeleton in the shape of what is coming, so nothing moves when it arrives. Not a spinner in the middle of the page."
              >
                <Grid cols={3} gap={5}>
                  <Card padding="none" clip>
                    <Skeleton shape="block" />
                    <div className="p-6">
                      <Skeleton shape="title" width="3/4" />
                      <div className="mt-3">
                        <Skeleton lines={3} />
                      </div>
                    </div>
                  </Card>
                  <Stack gap={3}>
                    <Skeleton shape="circle" />
                    <Skeleton shape="line" width="1/2" />
                    <Skeleton lines={4} />
                  </Stack>
                </Grid>
              </Row>

              {/* -------------------------------------------------------- overlays */}
              <Row
                title="Overlays and messages"
                note="Dialog and Drawer are the native <dialog> element: focus trap, Esc, inert background and the top layer, all from the platform. Toasts announce themselves to screen readers."
              >
                <Stack gap={5}>
                  <OverlayDemo />
                  <ToastDemo />
                </Stack>
              </Row>

              {/* ------------------------------------------------------ long strings */}
              <Row
                title="Long strings"
                note="Serbian and Russian run roughly 1.4x English. Every one of these must hold without truncating, overflowing or breaking the grid — check this at phone width."
              >
                <Stack gap={6}>
                  <Grid cols={3} gap={4}>
                    {LOCALES.map((l) => (
                      <Stack key={l} gap={3}>
                        <p className="text-micro text-content-tertiary uppercase">{l}</p>
                        <Button fullWidth iconEnd={<IconArrowRight size={16} />}>
                          {LONG[l].cta}
                        </Button>
                        <Button variant="outline" fullWidth>
                          {LONG[l].nav}
                        </Button>
                        <div>
                          <Badge>{LONG[l].badge}</Badge>
                        </div>
                        <Input name={`long-${l}`} label={LONG[l].field} placeholder={LONG[l].cta} />
                      </Stack>
                    ))}
                  </Grid>

                  <Panel tone="sunken">
                    <p className="text-micro text-content-tertiary uppercase">
                      worst case — one unbroken word
                    </p>
                    <div className="mt-3">
                      <Stack direction="row" gap={3} wrap>
                        <Button>Nepredvidivo</Button>
                        <Badge>Достопримечательность</Badge>
                      </Stack>
                    </div>
                  </Panel>
                </Stack>
              </Row>

              {/* ---------------------------------------------------------- layout */}
              <Row
                title="Layout primitives"
                note="Container owns the gutter, Section owns the vertical rhythm, Stack and Grid own the gaps. No margins on children."
              >
                <Stack gap={4}>
                  <Tile>
                    <p className="text-body-sm">
                      Container: content 1280 · measure 672 · form 448, gutter 20 / 40
                    </p>
                  </Tile>
                  <Tile>
                    <p className="text-body-sm">
                      Section: compact 56/72 · default 80/112 · loose 112/160
                    </p>
                  </Tile>
                  <Tile>
                    <p className="text-body-sm">Grid: 2 / 3 / 4 columns, one collapse ladder each</p>
                  </Tile>
                </Stack>
              </Row>
            </Stack>
          </Container>
        </Section>
      </main>
    </ToastProvider>
  );
}
