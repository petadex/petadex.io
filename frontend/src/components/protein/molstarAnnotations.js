/** Mol* builder ref vs model Structure — annotations need `.units` on the model data. */
function resolveStructurePair(structureOrRef) {
  const structureRef = structureOrRef
  const structureData = structureOrRef?.cell?.obj?.data ?? structureOrRef
  return { structureRef, structureData }
}

/**
 * Build Mol* loci for residue positions (label_seq_id) and add ball-and-stick overlays.
 * @param {import('molstar/lib/mol-plugin').PluginUIContext} plugin
 * @param {object} structureOrRef Mol* structure builder ref from createStructure
 * @param {Array<{ seqPos: number, group?: string }>} annotations
 * @param {{ annotationColor?: string }} stylePreset
 * @param {Array<{ id: string, color?: string }>} annotationGroups
 */
export async function applyAnnotationRepresentations(
  plugin,
  structureOrRef,
  annotations,
  stylePreset,
  annotationGroups = [],
) {
  if (!plugin || !structureOrRef || !annotations?.length) return

  const { structureRef, structureData } = resolveStructurePair(structureOrRef)
  if (!structureData?.units) return

  const { StructureElement } = await import('molstar/lib/mol-model/structure')
  const { Schema } = await import(
    'molstar/lib/mol-model/structure/structure/element/schema',
  )
  const { Color } = await import('molstar/lib/mol-util/color')

  const groupColor = new Map(
    (annotationGroups || []).map(g => [g.id, g.color || stylePreset?.annotationColor || '#ff2ea6']),
  )

  const byGroup = new Map()
  for (const ann of annotations) {
    const gid = ann.group || '_default'
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid).push(ann.seqPos)
  }

  for (const [groupId, seqPositions] of byGroup) {
    const colorHex = groupColor.get(groupId) || stylePreset?.annotationColor || '#ff2ea6'
    const colorValue = Color.fromHexStyle(colorHex)

    const loci = Schema.toLoci(structureData, {
      items: seqPositions.map(label_seq_id => ({ label_seq_id })),
    })

    if (StructureElement.Loci.isEmpty(loci)) continue

    // Mol* addRepresentation ignores { loci }; build a sub-component for selected residues only.
    const expression = Schema.toExpression({
      items: seqPositions.map(label_seq_id => ({ label_seq_id })),
    })

    const component = await plugin.builders.structure.tryCreateComponentFromExpression(
      structureRef,
      expression,
      `annotation-${groupId}`,
      { label: `Annotation ${groupId}` },
    )

    if (!component) continue

    await plugin.builders.structure.representation.addRepresentation(component, {
      type: 'ball-and-stick',
      typeParams: { sizeFactor: 0.9 },
      color: 'uniform',
      colorParams: { value: colorValue },
    })
  }
}
