type TreeQueryConfig = {
  maxDepth?: number
  selectCount?: boolean
  tableName: string
  rootId: number
}

export class FindTreeQuery {
  public constructor(private readonly _config: TreeQueryConfig) {}

  public build() {
    return `
      WITH RECURSIVE r AS (
        SELECT ${this._getSelectFields()}
        FROM ${this._config.tableName} node
        WHERE id = ${this._config.rootId}

        UNION

        SELECT ${this._getSelectFields({ isRecursiveSelect: true })}
        FROM ${this._config.tableName} node
          JOIN r
              ON node.parent_id = r.id

        ${this._maybeLimitDepth()}
      )

      ${this._getFinalSelect()};
    `
  }

  private _maybeLimitDepth() {
    if (!this._config.maxDepth) {
      return ''
    }

    return `WHERE depth < ${this._config.maxDepth - 1}`
  }

  private _getSelectFields({ isRecursiveSelect }: { isRecursiveSelect?: boolean } = {}) {
    const defaultFields = ['node.id']

    if (this._config.maxDepth) {
      if (isRecursiveSelect) {
        defaultFields.push('0 AS depth')
      } else {
        defaultFields.push('r.depth + 1')
      }
    }

    return defaultFields.join(', ')
  }

  private _getFinalSelect() {
    if (this._config.selectCount) {
      return 'SELECT COUNT(*) AS count FROM r'
    } else {
      return 'SELECT * FROM r'
    }
  }
}
