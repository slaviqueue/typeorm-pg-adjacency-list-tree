import { InvalidTreeTypeError as InvalidRelationTypeError } from '../error/invalid-relation-type.error'

export type RelationType = 'descendants' | 'ancestors'

type TreeQueryConfig = {
  tableName: string
  rootId: number
  relationType: RelationType
  selectCount?: boolean
  maxDepth?: number
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
              ON ${this._getJoinCondition()}

        ${this._maybeLimitDepth()}
      )

      ${this._getFinalSelect()};
    `
  }

  private _getJoinCondition() {
    if (this._config.relationType === 'descendants') {
      return 'node.parent_id = r.id'
    }

    if (this._config.relationType === 'ancestors') {
      return 'node.id = r.parent_id'
    }

    throw new InvalidRelationTypeError(this._config.relationType)
  }

  private _maybeLimitDepth() {
    if (!this._config.maxDepth) {
      return ''
    }

    return `WHERE depth < ${this._config.maxDepth - 1}`
  }

  private _getSelectFields({ isRecursiveSelect }: { isRecursiveSelect?: boolean } = {}) {
    const defaultFields = ['node.id', 'node.parent_id']

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
