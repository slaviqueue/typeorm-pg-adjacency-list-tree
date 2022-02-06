import { keyBy } from 'lodash'

type TreeAssemblerConfig = {
  childrenPropertyName: string
}

export class TreeAssembler<Entity> {
  public constructor(private readonly _config: TreeAssemblerConfig) {}

  public assemble(nodes: Entity[], rootId: number) {
    const idToNode = keyBy(nodes, 'id')

    for (const node of nodes) {
      const nodeAsAny = node as any
      const parentIdAsAny = nodeAsAny.parentId as any

      if (parentIdAsAny) {
        const parentAsAny = idToNode[parentIdAsAny] as any

        if (!parentAsAny[this._config.childrenPropertyName]) {
          parentAsAny[this._config.childrenPropertyName] = []
        }

        parentAsAny[this._config.childrenPropertyName].push(node)
      }
    }

    return idToNode[rootId]
  }
}
