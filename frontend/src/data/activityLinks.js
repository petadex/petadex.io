// The Activity section's destinations. Drives both the /activity hub cards and
// the "Activity" dropdown in SiteHeader, so adding a page here adds it to both.
export const ACTIVITY_LINKS = [
  {
    key: "kinetics",
    label: "Kinetics",
    path: "/kinetics",
    blurb:
      "Kinetic parameters for plastic-degrading enzymes, both measured in the lab and predicted by machine learning. Covers turnover number (kcat), Michaelis constant (Km), and catalytic efficiency (kcat/Km).",
    tag: "kcat · Km · kcat/Km",
  },
  {
    key: "substrates",
    label: "Substrates",
    path: "/substrates",
    blurb:
      "Browse target polymers such as PET, PLA, PEF, polycarbonate, and nylons. Each one has an abstract, links to primary literature, and interactive 3D structures of its oligomers.",
    tag: "Polymer structure viewer",
  },
  {
    key: "halo-assay",
    label: "Halo Assay",
    path: "/halo-assay",
    blurb:
      "Measurements from plate-based clearing (halo) assays. Shows median pixel intensity of enzyme activity across BHET substrate concentrations and timepoints.",
    tag: "Median pixel intensity",
  },
]
