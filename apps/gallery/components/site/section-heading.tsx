import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  inverted?: boolean;
};

export function SectionHeading({ eyebrow, title, description, inverted }: SectionHeadingProps) {
  return (
    <div className="mb-9 max-w-3xl">
      <p className={cn("text-sm font-semibold uppercase tracking-[0.24em]", inverted ? "text-marigold" : "text-rust")}>
        {eyebrow}
      </p>
      <h1 className={cn("mt-3 text-3xl font-semibold text-balance sm:text-4xl", inverted ? "text-ivory" : "text-ink")}>
        {title}
      </h1>
      {description ? (
        <p className={cn("mt-4 text-base leading-7", inverted ? "text-ivory/70" : "text-ink/70")}>{description}</p>
      ) : null}
    </div>
  );
}
