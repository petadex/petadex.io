import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CitationCard } from "./CitationCard"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("CitationCard", () => {
  it("renders the BibTeX entry with the DOI-bearing url field", () => {
    render(<CitationCard />)
    expect(screen.getByText("citation.bib")).toBeInTheDocument()
    expect(screen.getByText(/petadex2026/)).toBeInTheDocument()
    expect(screen.getByText(/https:\/\/petadex\.net/)).toBeInTheDocument()
  })

  it("copies the BibTeX entry to the clipboard and shows a transient confirmation", async () => {
    // user-event installs its own clipboard stub during setup(), so the mock
    // has to be defined after that call or setup() clobbers it.
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<CitationCard />)
    await user.click(
      screen.getByRole("button", { name: /copy the bibtex entry/i })
    )

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("petadex2026")
    )
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /bibtex entry copied/i })
      ).toBeInTheDocument()
    )
  })
})
