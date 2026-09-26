/** Locale-formatted count, or an em dash when the value is missing. */
export const formatCount = n => (n == null ? "—" : Number(n).toLocaleString())
