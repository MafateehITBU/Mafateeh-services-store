import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "start",
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-wide text-brand">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold text-ink md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-7 text-muted">{subtitle}</p> : null}
    </div>
  );
}
