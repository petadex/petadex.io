import React, { useEffect, useMemo, useRef, useState } from "react"
import { getCatSectionNavItems } from "../../utils/catDomainSectionConfig"

const linkBase =
  "block rounded-md px-2.5 py-1.5 no-underline transition-colors text-sm leading-snug"

function navLinkClass(active) {
  return [
    linkBase,
    active
      ? "bg-accent/15 text-accent font-semibold"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
  ].join(" ")
}

/**
 * In-page section nav for a CATH-domain view. vertical sidebar on large screens, compact row on
 * small screens.
 * @param {{ catDomain: Record<string, unknown>, className?: string }} props
 */
const CatDomainSectionNav = ({ catDomain, className = "" }) => {
  const items = useMemo(() => getCatSectionNavItems(catDomain), [catDomain])
  const [activeId, setActiveId] = useState(items[0]?.id ?? "")
  const scrollLockRef = useRef(false)

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || items.length === 0) return undefined

    const visible = new Map()
    const observer = new IntersectionObserver(
      entries => {
        if (scrollLockRef.current) return

        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        if (visible.size === 0) return
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
        if (best?.[0]) setActiveId(best[0])
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] },
    )

    for (const { id } of items) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [catDomain.cathId, items])

  const handleNavClick = (event, id) => {
    event.preventDefault()
    const el = document.getElementById(id)
    scrollLockRef.current = true
    setActiveId(id)

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      window.history.replaceState(null, "", `#${id}`)
    }

    const unlockScroll = () => {
      scrollLockRef.current = false
      window.removeEventListener("scrollend", unlockScroll)
    }

    if (typeof window !== "undefined" && "onscrollend" in window) {
      window.addEventListener("scrollend", unlockScroll, { once: true })
    } else {
      scrollLockRef.current = false
    }
  }

  return (
    <>
      <nav aria-label="On this page" className={`lg:hidden mb-6 md:mb-8 ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 m-0">
          On this page
        </p>
        <ul className="flex flex-wrap gap-x-1 gap-y-1 list-none m-0 p-0 text-xs md:text-sm">
          {items.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={navLinkClass(id === activeId)}
                onClick={e => handleNavClick(e, id)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="On this page" className={`hidden lg:block sticky top-20 self-start pt-1 ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 m-0">
          On this page
        </p>
        <ul className="list-none m-0 p-0 border-l border-border">
          {items.map(({ id, label }) => {
            const active = id === activeId
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={e => handleNavClick(e, id)}
                  className={[
                    "block py-1.5 pl-3 -ml-px border-l-2 no-underline text-sm leading-snug transition-colors",
                    active
                      ? "border-accent text-accent font-semibold bg-accent/10 rounded-r-md"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                  ].join(" ")}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

export default CatDomainSectionNav
