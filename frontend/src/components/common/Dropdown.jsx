// Themed replacement for a native <select>: a button that opens a listbox.
// Options are { value, label, detail? }; `detail` renders muted on the right.
// Keyboard follows the WAI-ARIA select-only combobox pattern: arrows,
// Home/End, Enter/Space to pick, Escape to close, and type-ahead.
import React, { useEffect, useId, useRef, useState } from "react"

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  className = "",
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ text: "", timer: null })

  const selectedIndex = Math.max(
    0,
    options.findIndex(o => o.value === value)
  )
  const selected = options[selectedIndex]

  const openList = () => {
    setActive(selectedIndex)
    setOpen(true)
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const pick = i => {
    if (options[i] && options[i].value !== value) onChange(options[i].value)
    close()
  }

  // Close on any press outside the control.
  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (!rootRef.current?.contains(e.target)) close(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // Keep the highlighted option in view in long lists.
  useEffect(() => {
    if (!open) return
    document
      .getElementById(`${id}-opt-${active}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [open, active, id])

  const typeAhead = key => {
    const t = typed.current
    clearTimeout(t.timer)
    t.text += key.toLowerCase()
    t.timer = setTimeout(() => (t.text = ""), 600)
    const i = options.findIndex(o =>
      String(o.label).toLowerCase().startsWith(t.text)
    )
    if (i >= 0) setActive(i)
  }

  const onButtonKey = e => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const onListKey = e => {
    const last = options.length - 1
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActive(i => Math.min(last, i + 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActive(i => Math.max(0, i - 1))
        break
      case "Home":
        e.preventDefault()
        setActive(0)
        break
      case "End":
        e.preventDefault()
        setActive(last)
        break
      case "Enter":
      case " ":
        e.preventDefault()
        pick(active)
        break
      case "Escape":
        e.preventDefault()
        close()
        break
      case "Tab":
        close(false)
        break
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) typeAhead(e.key)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
    >
      {label && <span id={`${id}-label`}>{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
        className={`group inline-flex cursor-pointer items-center gap-2 rounded-md border bg-surface-sunken py-1 pl-2.5 pr-2 font-sans text-sm font-medium text-foreground transition-colors duration-fast hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
          open ? "border-accent" : "border-input"
        }`}
      >
        <span id={`${id}-value`} className="whitespace-nowrap">
          {selected?.label}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className={`h-1.5 w-2.5 text-muted-foreground transition-transform duration-normal group-hover:text-foreground ${
            open ? "rotate-180 text-accent" : ""
          }`}
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
          className="dropdown-in absolute right-0 top-full z-(--z-dropdown) mt-1 max-h-72 w-max min-w-full max-w-[min(40rem,90vw)] overflow-y-auto rounded-md border border-border-strong bg-popover p-1 font-sans text-sm font-medium text-popover-foreground shadow-xl focus:outline-none"
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex
            return (
              <li
                key={String(o.value)}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`relative flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-sm py-1.5 pl-3 pr-2.5 ${
                  i === active ? "bg-surface-raised" : ""
                } ${isSelected ? "text-accent" : "text-secondary-foreground"}`}
              >
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0.5 w-0.5 rounded-full bg-accent"
                  />
                )}
                <span
                  className={
                    i === active && !isSelected ? "text-foreground" : ""
                  }
                >
                  {o.label}
                </span>
                {o.detail && (
                  <span className="ml-auto pl-4 text-muted-foreground tabular-nums">
                    {o.detail}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
