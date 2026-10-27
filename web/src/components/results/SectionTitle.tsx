/** A descriptive section title with its count in a small badge. No prose. */
export function SectionTitle({
  title,
  count,
  as: Heading = "h2",
}: {
  title: string
  count?: number | null
  as?: "h2" | "h3"
}) {
  return (
    <Heading className="text-foreground flex items-center gap-2 text-sm font-semibold">
      {title}
      {count != null && <CountBadge count={count} />}
    </Heading>
  )
}

export function CountBadge({ count }: { count: number }) {
  return (
    <span className="bg-muted text-muted-foreground tabular text-2xs rounded-full px-2 py-0.5 font-mono font-medium">
      {count.toLocaleString("en-US")}
    </span>
  )
}
