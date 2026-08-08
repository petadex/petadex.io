import React, { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "gatsby"
import { useTheme } from "../context/ThemeContext"

const NAV_ITEMS = [
  {
    label: "Activity",
    path: "/activity",
    key: "activity",
    children: [
      { label: "Kinetics", path: "/kinetics", key: "kinetics" },
      { label: "Substrates", path: "/substrates", key: "substrates" },
      { label: "Halo Assay", path: "/halo-assay", key: "halo-assay" },
    ],
  },
  { label: "Enzymes", path: "/enzymes", key: "enzymes" },
  { label: "Search", path: "/search", key: "search" },
  { label: "CATH domains", path: "/cath-domains", key: "cath-domains" },
  { label: "Atlas", path: "/atlas", key: "atlas" },
]

const ChevronDownIcon = ({ open }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

// Desktop nav dropdown — opens on hover or click, closes on outside click / Escape.
const NavDropdown = ({ item }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const closeTimer = useRef(null)

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // Small delay so moving the pointer across the gap to the panel doesn't close it.
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = e => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      {/* Clicking navigates to the Activity hub; hover/focus reveals the quick menu. */}
      <Link
        to={item.path}
        onFocus={openMenu}
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        activeClassName="text-foreground border-b-2 border-accent"
        partiallyActive
        aria-haspopup="true"
        aria-expanded={open}
      >
        {item.label}
        <ChevronDownIcon open={open} />
      </Link>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-background/95 backdrop-blur-md shadow-lg py-1 z-50">
          {item.children.map(child => (
            <Link
              key={child.key}
              to={child.path}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              activeClassName="text-foreground bg-muted"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const SunIcon = () => (
  <svg className="w-5 h-5 fill-yellow-500" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-5 h-5 fill-violet-500" viewBox="0 0 20 20">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
)

const SiteHeader = () => {
  const { dark, toggle } = useTheme()
  const [isHidden, setIsHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const handleScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY
      // Don't hide when near the top
      setIsHidden(currentScrollY > 80 && currentScrollY > lastScrollY.current)
      lastScrollY.current = currentScrollY
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const iconButtonClass = "h-10 w-10 flex items-center justify-center rounded-lg transition-colors hover:bg-muted"

  return (
    <>
      {/* ── Mobile overlay ─────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────── */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 z-50 md:hidden
          bg-sidebar text-sidebar-foreground shadow-xl
          transform transition-transform duration-300 ease-in-out
          overflow-y-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
          <Link to="/" onClick={closeMobileMenu}>
            <img
              src={require("../images/petadex-icon.png").default}
              alt="PETadex"
              className="h-8 w-auto dark:invert"
            />
          </Link>
          <button onClick={closeMobileMenu} className={iconButtonClass} aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map(item =>
            item.children ? (
              <div key={item.key} className="pt-2 first:pt-0">
                <Link
                  to={item.path}
                  onClick={closeMobileMenu}
                  className="block px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  activeClassName="text-accent"
                >
                  {item.label}
                </Link>
                {item.children.map(child => (
                  <Link
                    key={child.key}
                    to={child.path}
                    onClick={closeMobileMenu}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-accent"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.key}
                to={item.path}
                onClick={closeMobileMenu}
                className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-accent"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>

      {/* ── Main header ────────────────────────────────── */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-40 h-16
          bg-background/90 backdrop-blur-md
          border-b border
          transition-transform duration-300 ease-out
          ${isHidden ? "-translate-y-full" : "translate-y-0"}
        `}
      >
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" aria-label="PETadex Home" className="shrink-0">
            <img
              src={require("../images/petadex-icon.png").default}
              alt="PETadex"
              className="h-8 w-auto dark:invert"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-x-1" aria-label="Main navigation">
            {NAV_ITEMS.map(item =>
              item.children ? (
                <NavDropdown key={item.key} item={item} />
              ) : (
                <Link
                  key={item.key}
                  to={item.path}
                  className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted  "
                  activeClassName="text-foreground border-b-2 border-accent"
                  partiallyActive={item.key === "enzymes"}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-x-2">
            <button
              onClick={toggle}
              className={iconButtonClass}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <MoonIcon /> : <SunIcon />}
            </button>

            {/* Hamburger — md and below only, matches desktop nav breakpoint */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`${iconButtonClass} md:hidden`}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* Spacer so page content clears the fixed header */}
      <div className="h-16" aria-hidden="true" />
    </>
  )
}

export default SiteHeader
