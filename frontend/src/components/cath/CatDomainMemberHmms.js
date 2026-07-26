import React from "react"
import { Link } from "gatsby"

/**
 * @param {object} props
 * @param {import("../../utils/buildCatDomainModels.js").CatDomainMemberHmm[]} props.memberHmms
 * @param {import("../../data/catDomainCatalog.js").CatDomainHmmMethodNote} props.hmmMethod
 */
const CatDomainMemberHmms = ({ memberHmms, hmmMethod }) => (
  <section id="cat-section-memberHmms" className="scroll-mt-28">
    <h3 className="text-lg font-semibold text-foreground mb-3">HMMs used</h3>

    {(hmmMethod?.text || hmmMethod?.methodologyAnchor) && (
      <div className="mb-4 rounded-lg border border-border bg-muted/15 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 m-0">
          How these were found
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed m-0">
          {hmmMethod?.text}
          {hmmMethod?.methodologyAnchor && (
            <Link
              to={`/methodology#${hmmMethod.methodologyAnchor}`}
              className="text-accent hover:text-accent-hover underline underline-offset-2 whitespace-nowrap"
            >
              Read the full methodology →
            </Link>
          )}
        </p>
      </div>
    )}

    {memberHmms.length === 0 ? (
      <p className="text-sm text-muted-foreground">No member HMMs currently assigned to this CATH domain.</p>
    ) : (
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground text-2xs uppercase tracking-widest font-semibold bg-muted/30">
              <th className="px-4 py-2.5">Pfam</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5 text-right">Families in atlas</th>
            </tr>
          </thead>
          <tbody>
            {memberHmms.map(m => (
              <tr key={m.id} className="border-t border-border hover:bg-surface-raised transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-accent">
                  <Link to={`/cath-domains?id=${encodeURIComponent(m.id)}`} className="hover:underline">
                    {m.pfamAccession}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-foreground">{m.displayName}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  {m.familyCount != null ? Number(m.familyCount).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

export default CatDomainMemberHmms
