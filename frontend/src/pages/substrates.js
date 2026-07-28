// src/pages/substrates.js
import React, { useState } from "react"
import ProteinViewer from "../components/protein/ProteinViewer"

// Helper function to dynamically generate dropdown file selections for standard polymer sets
// Now builds full S3 URLs.
const generateOligomers = (prefix, maxUnits = 20) => {
  const options = []
  for (let i = 1; i <= maxUnits; i++) {
    const numStr = String(i).padStart(2, "0")
    options.push({
      label: `${i}-mer`,
      file: `https://petadex.s3.amazonaws.com/pdb_substrates/${prefix}-${numStr}mer.pdb`
    })
  }
  options.push({
    label: "40-mer",
    file: `https://petadex.s3.amazonaws.com/pdb_substrates/${prefix}-40mer.pdb`
  })
  return options
}

const substratesData = [
  {
    id: "pet_group",
    name: "PET & Copolyesters",
    isGroup: true,
    variants: [
      {
        id: "pet",
        name: "PET (Polyethylene Terephthalate)",
        abstract: "Polyethylene terephthalate (PET) is a semi-crystalline thermoplastic polyester widely used in single-use beverage bottles, synthetic fibers (polyester), and packaging. Synthesised from ethylene glycol and terephthalic acid, PET offers excellent mechanical strength, chemical resistance, and thermal stability. Its slow natural degradation rate has led to severe global pollution, driving intense research into enzymatic depolymerization using cutinases, esterases, and specialized PETases.",
        references: [
          { text: "Yoshida et al., 2016 (Science)", url: "https://doi.org/10.1126/science.aad6359" },
          { text: "Austin et al., 2018 (PNAS)", url: "https://doi.org/10.1073/pnas.1718804115" }
        ],
        otherResources: [
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/poly_ethylene-terephthalate_-_PET" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polyethylene_terephthalate" }
        ],
        options: [
          { label: "Terephthalic Acid (TPA)", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET-TPA.pdb" },
          { label: "1-mer (MHET)", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET-01mer-(MHET).pdb" },
          { label: "1-mer (BHET Intermediate)", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-01mer-(BHET).pdb" },
          { label: "2-mer (HALO Intermediate)", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-02mer-(HALO).pdb" },
          { label: "3-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-03mer.pdb" },
          { label: "4-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-04mer.pdb" },
          { label: "5-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-05mer.pdb" },
          { label: "6-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-06mer.pdb" },
          { label: "7-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-07mer.pdb" },
          { label: "8-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-08mer.pdb" },
          { label: "9-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-09mer.pdb" },
          { label: "10-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-10mer.pdb" },
          { label: "11-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-11mer.pdb" },
          { label: "12-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-12mer.pdb" },
          { label: "13-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-13mer.pdb" },
          { label: "14-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-14mer.pdb" },
          { label: "15-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-15mer.pdb" },
          { label: "16-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-16mer.pdb" },
          { label: "17-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET-EG-17mer.pdb" },
          { label: "18-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-18mer.pdb" },
          { label: "19-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-19mer.pdb" },
          { label: "20-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-20mer.pdb" },
          { label: "40-mer", file: "https://petadex.s3.amazonaws.com/pdb_substrates/PET_EG-40mer.pdb" }
        ]
      },
      {
        id: "petg",
        name: "PETG (Glycol-modified PET)",
        abstract: "Glycol-modified polyethylene terephthalate (PETG) is an amorphous copolyester formed by replacing a portion of the ethylene glycol in PET with cyclohexanedimethanol (CHDM). The bulky CHDM groups disrupt the regular chain structure, preventing crystallisation during processing. Consequently, PETG offers superior clarity, toughness, flexibility, chemical resistance, and ease of thermoforming compared to standard PET. Due to these characteristics, it is particularly suitable for 3D printing, where it provides good layer adhesion and reduces shrinkage during cooling.",
        references: [
          { text: "Hsueh et al., 2021 (Polymers)", url: "https://doi.org/10.3390/polym13111758" }
        ],
        otherResources: [],
        options: generateOligomers("PETG", 20)
      }
    ]
  },
  {
    id: "pla",
    name: "PLA (Polylactic Acid)",
    abstract: "Polylactic acid (PLA) is a biodegradable and compostable thermoplastic polyester synthesised from renewable resources like corn starch or sugarcane. Owing to its biodegradability, excellent biocompatibility, favorable mechanical properties, and ease of processing, PLA is regarded as one of the most promising biodegradable materials. PLA can exist in amorphous or semicrystalline states depending on its molecular distribution and stereochemistry. It exhibits high stiffness and good transparency but suffers from inherent brittleness and limited thermal stability. It is widely used in food packaging, biomedical applications, and as a primary filament in 3D printing. Copolymerisation strategies are being developed to enhance its toughness and processability.",
    references: [
      { text: "Hsueh et al., 2021 (Polymers)", url: "https://doi.org/10.3390/polym13111758" },
      { text: "Garlotta et al., 2001 (Journal of Polymers and the Environment)", url: "https://doi.org/10.1023/A:1020200822435" },
      { text: "Pang et al., 2010 (Biotechnology Journal)", url: "https://doi.org/10.1002/biot.201000135" },
      { text: "Taib et al., 2023 (Polymer Bulletin)", url: "https://doi.org/10.1007/s00289-022-04160-y" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/poly_lactic-acid_-_PLA" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polylactic_acid" }
    ],
    options: generateOligomers("PLA", 20)
  },
  {
    id: "pef",
    name: "PEF (Polyethylene Furanoate)",
    abstract: "Polyethylene furanoate (PEF) is a fully biobased polyester derived from renewable feedstocks, such as sugars, and is a chemical analogue of PET. PEF has emerged as one of the most promising sustainable alternatives to petroleum-based plastics due to its superior gas-barrier performance and strong mechanical properties. Compared to PET, PEF offers up to 10 times better oxygen barrier and significantly improved CO2 barrier performance. The introduction of rigid furan rings in its chemical structure enhances its mechanical and thermal properties. PEF also possesses excellent thermal stability and low gas permeability. These attributes make PEF a suitable candidate for packaging, textiles, and automotive components.",
    references: [
      { text: "Xu et al., 2025 (Biofuels, Bioproducts and Biorefining)", url: "https://doi.org/10.1002/bbb.70000" },
      { text: "Sanders et al., 2024 (Advanced Sustainable Systems)", url: "https://doi.org/10.1002/adsu.202400074" }
    ],
    otherResources: [
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polyethylene_furan-2,5-dicarboxylate" }
    ],
    options: generateOligomers("PEF", 20)
  },
  {
    id: "pc",
    name: "PC (Polycarbonate)",
    abstract: "Polycarbonate (PC) is a versatile engineering thermoplastic known for its exceptional properties. The most common type is bisphenol A polycarbonate (BPA-PC), which is polymerized from bisphenol A. This amorphous polymer is characterized by extreme toughness, high impact resistance, high thermal resistance, and excellent optical transparency. The BPA-based structure enables strong polymer chain interactions, combining optical clarity with dimensional stability and ductility. These properties make PC suitable for demanding applications, including bulletproof windows, eyewear lenses, and automotive components. Other types of PC exist, such as bio-based PC derived from isosorbide.",
    references: [
      { text: "Kyiacos, 2017 (Brydson's Plastics Materials, 8th edition)", url: "https://doi.org/10.1016/B978-0-323-35824-8.00017-7" },
      { text: "Kausar et al., 2017 (Journal of Plastic Film & Sheeting)", url: "https://doi.org/10.1177/8756087917691088" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Poly_bisphenol-A-carbonate" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polycarbonate" }
    ],
    options: generateOligomers("BPA-PC", 20)
  },
  {
    id: "nr",
    name: "NR (Natural Rubber, Latex)",
    abstract: "Natural rubber (NR) is a high-molecular-weight elastomer derived from the latex of the Hevea brasiliensis tree. Its superior performance relative to synthetic variants is attributed to its complex microstructure, which consists of a linear chain of cis-1,4-polyisoprene with distinct functional end groups. Vulcanization crosslinks the polymer chains and significantly enhances strength, resilience, and chemical resistance. Natural rubber exhibits high tensile strength, excellent abrasion resistance, and good vibration-dampening characteristics. However, it has poor resistance to oils, ozone, and UV light due to the unsaturation in its backbone. Its applications range from tires and conveyor belts to seals and medical gloves.",
    references: [
      { text: "Payungwong et al., 2024 (Polymers)", url: "https://doi.org/10.1016/j.polymer.2024.127419" },
      { text: "Dieu et al., 2023 (Vietnam Journal of Chemistry)", url: "https://doi.org/10.1002/vjch.202200225" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Natural-latex-rubber" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Natural_rubber" }
    ],
    options: generateOligomers("NR", 20)
  },
  {
    id: "pa_group",
    name: "Polyamides (Nylon / Aramids)",
    isGroup: true,
    variants: [
      {
        id: "pa6",
        name: "PA-Nylon-6 (Polyamide 6)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs an aliphatic polyamide, Polyamide 6 (Nylon 6) is a semi-crystalline thermoplastic synthesized via the ring-opening polymerization of caprolactam. Due to its single-monomer structural origin, it features a lower melting temperature (~220°C) than Nylon 6,6, which widens its thermal processing window and improves flow behavior during molding. It exhibits high tensile strength, excellent elasticity, and robust resistance to abrasion and surface wear. Nylon 6 is widely engineered into structural components, automotive manifolds, industrial gears, heavy-duty textile fibers, and ropes.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Francisco et al., 2018 (Polymer Composites)", url: "https://doi.org/10.1002/pc.24837" },
          { text: "Sunil et al., 2026 (EPH- International Journal of Science and Engineering)", url: "https://doi.org/10.53555/m2hyw924" },
          { text: "Kohutiar et al., 2025 (Polymers)", url: "https://doi.org/10.3390/polym17040442" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Nylon-6" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nylon_6" }
        ],
        options: generateOligomers("PA-Nylon-6", 20)
      },
      {
        id: "pa66",
        name: "PA-Nylon-6,6 (Polyamide 6,6)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs an aliphatic polyamide, Polyamide 6,6 (Nylon 6,6) is synthesized through the polycondensation of hexamethylenediamine and adipic acid. The highly symmetrical configuration of its hydrocarbon backbone encourages tight molecular packing and high crystallinity, resulting in superior mechanical stiffness, tensile toughness, and thermal resistance compared to Nylon 6. It maintains its dimensional stability under higher mechanical loads and elevated temperatures. It is commonly deployed in high-stress electrical casings, automotive engine compartments, conveyor belts, and industrial carpet fibers.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Francisco et al., 2018 (Polymer Composites)", url: "https://doi.org/10.1002/pc.24837" },
          { text: "Avbar et al., 2025 (Journal of Composites Science)", url: "https://doi.org/10.3390/jcs9010048" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Nylon-66" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nylon_66" }
        ],
        options: generateOligomers("PA-Nylon-6,6", 20)
      },
      {
        id: "pa46",
        name: "PA-Nylon-4,6 (Polyamide 4,6)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs an aliphatic polyamide, Polyamide 4,6 (Nylon 4,6) is a highly crystalline aliphatic polymer synthesized via the polycondensation of tetramethylenediamine and adipic acid. Because it possesses a shorter hydrocarbon sequence between amide groups, it exhibits a remarkably high amide density per chain unit. This structural symmetry allows for a high crystallization rate and an elevated melting point (~295°C). Nylon 4,6 retains exceptional stiffness, torque resistance, and mechanical strength retention at elevated temperatures where other nylons fail. It is widely applied in demanding automotive engine environments, heavy-duty transmission gears, and electronic connectors.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Francisco et al., 2018 (Polymer Composites)", url: "https://doi.org/10.1002/pc.24837" },
          { text: "Yang et al., 2016 (Journal of Polymer Engineering)", url: "https://doi.org/10.1515/polyeng-2016-0092" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nylon_46" }
        ],
        options: generateOligomers("PA-Nylon-4,6", 20)
      },
      {
        id: "pa11",
        name: "PA-Nylon-11 (Polyamide 11)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs an aliphatic polyamide, Polyamide 11 (Nylon 11) is a bio-based engineering thermoplastic derived from renewable castor oil via the polymerization of 11-aminoundecanoic acid. Its long aliphatic hydrocarbon segments lower its amide group density, which drastically reduces its capacity for hydrogen bonding with water. Consequently, Nylon 11 exhibits exceptionally low moisture absorption, superb dimensional stability, and excellent impact resistance. Its structural flexibility and chemical resistance under load make it ideal for automotive fuel lines, pneumatic air brake hoses, oil and gas pipes, and cable sheathing.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Francisco et al., 2018 (Polymer Composites)", url: "https://doi.org/10.1002/pc.24837" },
          { text: "Jariyavidyanont et al., 2019 (Thermal Properties of Bio-based Polymers)", url: "https://link.springer.com/chapter/10.1007/12_2019_47" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Nylon-11" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nylon_11" }
        ],
        options: generateOligomers("PA-Nylon-11", 20)
      },
      {
        id: "pa12",
        name: "PA-Nylon-12 (Polyamide 12)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs an aliphatic polyamide, Polyamide 12 (Nylon 12) is a semi-crystalline aliphatic polymer synthesized from laurlactam. Featuring an extended sequence of eleven methylene units between amide linkages, Nylon 12 possesses the lowest water absorption rate and density among common industrial nylons. The reduced polarity of the chain provides strong structural resistance to impacts, abrasions, hydraulic fluids, and mechanical fatigue, even at sub-zero temperatures. It is frequently utilized in precision engineering applications, custom 3D printing filaments (SLS), flexible fuel distribution systems, and sports equipment.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Francisco et al., 2018 (Polymer Composites)", url: "https://doi.org/10.1002/pc.24837" },
          { text: "Kohutiar et al., 2025 (Polymers)", url: "https://doi.org/10.3390/polym17040442" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/nylon-12" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nylon_12" }
        ],
        options: generateOligomers("PA-Nylon-12", 20)
      },
      {
        id: "panomex",
        name: "PA-Nomex (Aromatic Polyamide)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs a fully aromatic polyamide (meta-aramid), Nomex (poly-metaphenylene isophthalamide) is renowned for its outstanding thermal, chemical, and radiation resistance. Unlike its para-aramid counterparts, the meta-linked aromatic chains create a kinked backbone that prevents tightly aligned packing, resulting in high flexibility suitable for textile conversion. When exposed to intense heat, the polymer undergoes a carbonization process that thickens the fiber barrier, absorbing thermal energy. It serves as the primary material for firefighting turnout gear, military flight suits, aerospace insulation, and industrial flame barriers.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Frousiou et al., 2023 (Molecules)", url: "https://doi.org/10.3390/molecules28145465" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nomex" }
        ],
        options: generateOligomers("PA-Nomex", 20)
      },
      {
        id: "pakevlar",
        name: "PA-Kevlar (Para-Aromatic Polyamide)",
        abstract: "Polyamides (PA) are a diverse group of natural and synthetic polymers linked by repeating amide (-CO-NH-) functional groups. Based on their chemical backbone structure, polyamides are generally classified into four primary categories: Aliphatic Polyamides (nylons), which feature flexible straight-chain hydrocarbon segments; Semi-Aromatic Polyamides (polyphthalamides or PPA), which combine aliphatic sequences with aromatic rings to balance high-temperature strength with processability; Fully Aromatic Polyamides (aramids), where amide bonds connect directly to benzene rings, creating ultra-rigid, highly flame-retardant matrices; and Natural Proteins, such as silk, wool, and collagen, which are biopolymers formed by the biological condensation of α-amino acids.\n\nAs a fully aromatic polyamide (para-aramid), Kevlar (poly-paraphenylene terephthalamide) is engineered for ultra-high tensile strength and modulus. The rigid, linear aromatic chains line up parallel to the fiber axis and are stabilized by extensive inter-chain hydrogen bonds, creating a highly ordered crystalline lattice. This configuration yields a material five times stronger than steel on an equal weight basis, with superb puncture, impact, and thermal degradation resistance. Kevlar fibers form the standard for ballistic vests, cut-resistant gloves, radial tires, composite marine hulls, and aerospace structural panels.",
        references: [
          { text: "Krishna et al., 2021 (Computational Materials Science)", url: "https://doi.org/10.1016/j.commatsci.2021.110853" },
          { text: "Rayjadhav et al., 2024 (Sustainable Civil Infrastructures. Springer, Cham.)", url: "https://doi.org/10.1007/978-3-031-72527-2_30" },
          { text: "Jiang et al., 2016 (Polymers)", url: "https://doi.org/10.3390/polym8070243" },
          { text: "Frousiou et al., 2023 (Molecules)", url: "https://doi.org/10.3390/molecules28145465" }
        ],
        otherResources: [
          { text: "Polyamide General Wikipedia", url: "https://en.wikipedia.org/wiki/Polyamide" },
          { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/62788" },
          { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Kevlar" }
        ],
        options: generateOligomers("PA-Kevlar", 20)
      }
    ]
  },
  {
    id: "pbat",
    name: "PBAT (Polybutylene Adipate Terephthalate)",
    abstract: "PBAT, or poly(butylene adipate-co-terephthalate), is a biodegradable aliphatic-aromatic copolyester produced through the polycondensation of adipate and terephthalate esters with 1,4-butanediol. As a copolymer, it combines the degradation properties of aliphatic polyesters with the mechanical performance of aromatic polyesters. PBAT exhibits exceptional film-forming ability, high flexibility, and a remarkably high elongation at break, making it comparable to low-density polyethylene in mechanical properties. These properties make it ideal for packaging applications, agricultural mulch films, and compostable bags. However, its broader deployment remains constrained by cost, limited barrier performance, and uncertain degradation outside industrial composting.",
    references: [
      { text: "Itabana et al., 2024 (Macromolecular Materials and Engineering)", url: "https://doi.org/10.1002/mame.202400179" },
      { text: "Ferreira et al., 2017 (Polymer Engineering & Science)", url: "https://doi.org/10.1002/pen.24770" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/patent/US-2015065610-A1" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polybutylene_adipate_terephthalate" }
    ],
    options: generateOligomers("PBAT", 20)
  },
  {
    id: "pbs",
    name: "PBS (Polybutylene Succinate)",
    abstract: "Polybutylene succinate (PBS) is a biodegradable aliphatic thermoplastic polyester synthesized through the polycondensation of succinic acid and 1,4-butanediol. It is a semi-crystalline polymer that can be derived from both petroleum and biobased monomers, with succinic acid producible via fermentation of biomass. PBS exhibits excellent mechanical properties, including high tensile strength, good flexibility, and an elongation at break of around 300%. It also offers good heat resistance, superior to many other bioplastics. Its biodegradability allows it to be broken down by microorganisms into water, carbon dioxide, and biomass under composting conditions. PBS is used in applications such as packaging films, agricultural products, and biomedical devices.",
    references: [
      { text: "Barletta et al., 2022 (Progress in Polymer Science)", url: "https://doi.org/10.1016/j.progpolymsci.2022.101579" },
      { text: "Rafiqah et al., 2021 (Polymers)", url: "https://doi.org/10.3390/polym13091436" },
      { text: "Aliotta et al., 2022 (Polymers)", url: "https://doi.org/10.3390/polym14040844" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Poly_butylene-sebacate" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polybutylene_succinate" }
    ],
    options: generateOligomers("PBS", 20)
  },
  {
    id: "pe",
    name: "PE (Polyethylene)",
    abstract: "Polyethylene (PE) is the most commonly produced plastic, a vinyl polymer made from ethylene monomer. It is a semi-crystalline thermoplastic that exists in various forms, including low-density (LDPE), linear low-density (LLDPE), high-density (HDPE), and ultra-high molecular weight (UHMWPE). PE is characterized by outstanding chemical resistance, mechanical robustness, low cost, and industrial scalability. It also exhibits high ductility, good impact strength even at low temperatures, and excellent moisture resistance. Its primary applications are in packaging (films, bags, containers), cable insulation, and separation membranes.",
    references: [
      { text: "Khanam et al., 2014 (Advanced Manufacturing: Polymer & Composites Science)", url: "https://doi.org/10.1179/2055035915Y.0000000002" },
      { text: "Ronca, 2017 (Brydson's Plastics Materials, 8th edition)", url: "https://doi.org/10.1016/B978-0-323-35824-8.00010-4" },
      { text: "Sundar and Sweeting, 1956 (Chemical Reviews)", url: "https://pubs.acs.org/doi/pdf/10.1021/cr50016a004" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Polyethylene" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polyethylene" }
    ],
    options: generateOligomers("PE", 20)
  },
  {
    id: "pp",
    name: "PP (Polypropylene)",
    abstract: "Polypropylene (PP) is a versatile thermoplastic polymer made from the monomer propylene. The versatility of PP originates from its regular molecular arrangement, where the stereoregular alignment of pendant methyl groups allows for high crystallinity, providing superior chemical resistance, low density, and satisfactory mechanical strength. PP is one of the most widely used thermoplastic polymers due to its exceptional properties, cost-effectiveness, and ease of processing. It is a semi-rigid, tough material with excellent fatigue resistance and good moisture resistance. However, it faces challenges such as limited UV resistance and flammability. Its applications range from packaging and automotive components to medical devices and filtration membranes.",
    references: [
      { text: "Hossain et al., 2024 (Discover Nano)", url: "https://doi.org/10.1186/s11671-023-03952-z" },
      { text: "Maddah et al., 2016 (American Journal of Polymer Science)", url: "https://doi.org/10.5923/j.ajps.20160601.01" },
      { text: "Gahleitner and Paulik, 2014 (Brydson's Plastics Materials, 8th edition)", url: "https://doi.org/10.1016/B978-0-323-35824-8.00011-6" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Polypropylene" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polypropylene" }
    ],
    options: generateOligomers("PP", 20)
  },
  {
    id: "ps",
    name: "PS (Polystyrene)",
    abstract: "Polystyrene (PS) is an optically clear, rigid, and stiff thermoplastic polymer that finds extensive usage in packaging, electronics, and healthcare. In its solid form, it is known for its excellent thermal and electrical insulation properties and good dimensional stability. Pure PS is brittle and has poor UV and chemical resistance. However, its mechanical properties can be improved by blending with elastomers or through chemical modification methods such as functionalisation, grafting, and copolymerisation. The modification can enhance mechanical strength, photo-stability, and surface features. PS is widely used in protective packaging, disposable cutlery, and CD cases.",
    references: [
      { text: "Muthukumar et al., 2023 (Polymer Bulletin)", url: "https://doi.org/10.1007/s00289-023-04851-0" },
      { text: "Singh et al., 2025 (Discover Chemistry)", url: "https://doi.org/10.1007/s44371-025-00125-y" },
      { text: "Dong et al., 2023 (Environmental Pollution)", url: "https://doi.org/10.1016/j.envpol.2023.123034" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Polystyrene" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polystyrene" }
    ],
    options: generateOligomers("PS", 20)
  },
  {
    id: "pur",
    name: "PUR (Polyurethane)",
    abstract: "Polyurethane (PUR) is a highly versatile class of polymers that can be either thermoplastic or thermosetting. Since its first synthesis in 1937, it has gained extensive application across global industries due to its remarkable physical and chemical properties. The molecular structure of PUR consists of soft segments (polyols) and hard segments (polyisocyanates and chain extenders), forming a microphase-separated architecture. This unique structure allows PUR to exhibit a wide range of mechanical properties, from soft elastomers to rigid plastics. PUR exhibits excellent abrasion resistance, high tensile strength, and good resistance to wear and mechanical stress. It is used in foams, coatings, adhesives, and elastomers across construction, transportation, and many other fields.",
    references: [
      { text: "Akindoyo et al., 2016 (RSC Advances)", url: "https://doi.org/10.1039/c6ra14525f" },
      { text: "Mistry et al., 2024 (Journal of Polymers and the Environment)", url: "https://doi.org/10.1007/s10924-023-03161-w" },
      { text: "Atiqah et al., 2023 (Current Organic Synthesis)", url: "https://doi.org/10.2174/1570179413666160831124749" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Polyurethane" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polyurethane" }
    ],
    options: generateOligomers("PUR", 20)
  },
  {
    id: "pvc",
    name: "PVC (Polyvinyl Chloride)",
    abstract: "Polyvinyl chloride (PVC), behind only polyethylene and polypropylene, is the world's third-most widely produced synthetic polymer. It is a thermoplastic polymer composed of repeating chloroethyl units. In its pure, uncompounded form, PVC is a colourless or white, rigid, and brittle solid. However, the addition of plasticizers, stabilizers, and other additives allows its properties to be modified extensively, resulting in both rigid and flexible forms. It is biologically and chemically resistant, making it the plastic of choice for pipes and other applications where corrosion would limit the use of metal. Flexible PVC, achieved through plasticization, is used in tubing, cable insulation, and clothing.",
    references: [
      { text: "Edo et al., 2024 (Journal of Materials Science)", url: "https://doi.org/10.1007/s10853-024-10471-4" },
      { text: "Patrick, 2005 (Rapra Technology Limited)", url: "https://books.google.ca/books?hl=en&lr=&id=8j3elWO9ebcC&oi=fnd&pg=PA1&dq=PVC+(Polyvinyl+Chloride)+review&ots=PmLhtLlGXK&sig=KDdyXySnVUslSEUevN5P1wFmw_o#v=onepage&q=PVC%20(Polyvinyl%20Chloride)%20review&f=false" },
      { text: "Mnyango et al., 2023 (Progress in Rubber, Plastics and Recycling Technology)", url: "https://doi.org/10.1177/14777606241308652" }
    ],
    otherResources: [
      { text: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Poly_vinyl-chloride" },
      { text: "Wikipedia", url: "https://en.wikipedia.org/wiki/Polyvinyl_chloride" }
    ],
    options: generateOligomers("PVC", 20)
  }
]

const SubstratesPage = () => {
  // Grab the first actual structural variant item to prevent crashing on an expandable parent group
  const firstPlastic = substratesData[0].isGroup ? substratesData[0].variants[0] : substratesData[0]
  
  const [activePlastic, setActivePlastic] = useState(firstPlastic)
  const [selectedPdb, setSelectedPdb] = useState(firstPlastic.options[0].file)
  
  // Accordion open/close state tracking map
  const [expandedGroups, setExpandedGroups] = useState({
    pet_group: true,
    pa_group: true
  })

  const handlePlasticChange = (plastic) => {
    setActivePlastic(plastic)
    setSelectedPdb(plastic.options[0].file)
  }

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-background text-foreground transition-colors">

      {/* LEFT COLUMN: Polymer Selector Sidebar */}
      {/* Fixed-height column at md+: the heading stays pinned and the list itself
          scrolls, so the tail of the library (PVC) stays reachable instead of being
          clipped at the viewport edge. */}
      <nav className="flex flex-col w-full md:w-72 md:shrink-0 bg-card border-b md:border-b-0 md:border-r border-border px-5 pt-5 md:sticky md:top-16 md:self-start md:h-[calc(100vh-64px)]">
        <h2 className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Polymer Library
        </h2>
        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1 pb-5">
          {substratesData.map((item) => {
            if (item.isGroup) {
              const isExpanded = expandedGroups[item.id]
              return (
                <li key={item.id} className="mb-2">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="flex items-center justify-between w-full text-left px-3 py-2 rounded-md font-semibold text-sm transition-colors text-primary hover:bg-muted"
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>
                  
                  {/* Collapsible Children Lists */}
                  {isExpanded && (
                    <ul className="pl-3 mt-1 space-y-1 border-l-2 border-border ml-3">
                      {item.variants.map((variant) => {
                        const isActive = activePlastic.id === variant.id
                        return (
                          <li key={variant.id}>
                            <button
                              onClick={() => handlePlasticChange(variant)}
                              className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                isActive
                                  ? "bg-accent text-white"
                                  : "text-secondary-foreground hover:bg-muted"
                              }`}
                            >
                              {variant.name.split(" (")[0]}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            } else {
              // Standalone Entry Rendering 
              const isActive = activePlastic.id === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handlePlasticChange(item)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {item.name.split(" (")[0]}
                  </button>
                </li>
              )
            }
          })}
        </ul>
      </nav>

      {/* RIGHT COLUMN: Responsive split layout description area */}
      <section className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 md:p-10">
        
        {/* Sub-Column 1: Scientific Abstracts, References & Other Resources */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary mb-3">
              {activePlastic.name}
            </h1>
            <p className="text-base leading-relaxed text-secondary-foreground mb-6 whitespace-pre-line">
              {activePlastic.abstract}
            </p>

            {/* Primary Literature References */}
            {activePlastic.references && activePlastic.references.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Primary Literature References:
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-accent">
                  {activePlastic.references.map((ref, idx) => (
                    <li key={idx}>
                      <a 
                        href={ref.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-accent-hover underline underline-offset-2 transition-colors"
                      >
                        {ref.text} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Other Resources */}
            {activePlastic.otherResources && activePlastic.otherResources.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Other Resources:
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-accent">
                  {activePlastic.otherResources.map((res, idx) => (
                    <li key={idx}>
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-accent-hover underline underline-offset-2 transition-colors"
                      >
                        {res.text} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Selector & Download Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
            <div>
              <label 
                htmlFor="oligomer-select" 
                className="block text-sm font-semibold text-primary mb-2"
              >
                Select Chain Length / Oligomer:
              </label>
              <select
                id="oligomer-select"
                value={selectedPdb}
                onChange={(e) => setSelectedPdb(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-shadow"
              >
                {activePlastic.options.map((opt, idx) => (
                  <option key={idx} value={opt.file} className="bg-background text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Download PDB Button */}
            <a
              href={selectedPdb}
              download
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <svg 
                className="w-4 h-4 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Selected PDB
            </a>
          </div>
        </div>

        {/* Sub-Column 2: 3D Molecular Viewer Canvas */}
        <div className="flex flex-col h-full min-h-[450px]">
          <div className="flex-1 bg-neutral-950 border border-border rounded-xl overflow-hidden relative shadow-md">
            {/* selectedPdb is a full S3 URL — ProteinViewer fetches http(s) accessions directly.
                These are Open Babel small-molecule PDBs (all HETATM/UNL, no protein backbone),
                so they must be drawn as ball-and-stick; the default `cartoon` has nothing to render. */}
            <ProteinViewer accession={selectedPdb} initialStyle="ball-and-stick" />
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4 italic">
            Use mouse to rotate (Left-Click), zoom (Scroll), or pan (Right-Click) the polymer chain.
          </div>
        </div>

      </section>

    </div>
  )
}

export default SubstratesPage