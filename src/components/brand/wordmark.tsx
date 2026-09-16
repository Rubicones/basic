import { cx } from "@/components/ui/cx";

export type WordmarkProps = {
  size?: "sm" | "md" | "lg";
  /** The "coffee & breakfast" line beside the name. Hidden below sm. */
  tagline?: string;
};

const sizes = { sm: "text-title", md: "text-display-sm", lg: "text-display-md" } as const;

/**
 * `basıc`, with the dotless ı it is actually set in.
 *
 * The reference wrapped that character in `<span className="relative">` with no
 * offset — a leftover from positioning a dot that is not there. Dropped: U+0131 is
 * the character, and both type families ship it.
 */
export function Wordmark({ size = "md", tagline }: WordmarkProps) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className={cx("text-brand font-display leading-none font-extrabold", sizes[size])}>
        bas&#x131;c
      </span>
      {/* Normal tracking: the micro size carries 0.14em for uppercase labels, which
          is too airy under a lowercase tagline. */}
      {tagline && (
        <span className="text-caption text-content-secondary hidden leading-none tracking-normal sm:block">
          {tagline}
        </span>
      )}
    </span>
  );
}
