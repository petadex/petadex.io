import React from "react"
import { pfamEntryUrl } from "../../utils/cathDomainSectionConfig"

/**
 * @param {object} props
 * @param {import("../../models/CathDomain.js").CathDomainMemberHmm[]} props.memberHmms
 */
const CathDomainMemberHmms = ({ memberHmms }) => {
  return (
  <section id="cat-section-memberHmms" className="scroll-mt-28">
    <h3 className="text-lg font-semibold text-foreground mb-3">HMMs used</h3>

    {memberHmms.length === 0 ? (
      <p className="text-sm text-muted-foreground">No member HMMs currently assigned to this CATH domain.</p>
    ) : (
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground text-2xs uppercase tracking-widest font-semibold bg-muted/30">
              <th className="px-4 py-2.5">Pfam</th>
              <th className="px-4 py-2.5">Name</th>
            </tr>
          </thead>
          <tbody>
            {memberHmms.map(m => (
              <tr key={m.id} className="border-t border-border hover:bg-surface-raised transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-accent whitespace-nowrap">
                  <a
                    href={pfamEntryUrl(m.pfamAccession)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {m.pfamAccession}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-foreground">{m.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
  )
}

export default CathDomainMemberHmms
