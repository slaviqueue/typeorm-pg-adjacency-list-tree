import { first, get, map } from 'lodash'
import { In, Repository, SelectQueryBuilder } from 'typeorm'
import { FindTreeOptions } from 'typeorm/find-options/FindTreeOptions'
import { childrenPropertyMetadataArgs } from '../constant/decorator-constants'
import { NoRootParentError } from '../error/no-root-parent.error'
import { TreeAssembler } from './tree-assembler'
import { FindTreeQuery, RelationType } from './tree-query'
import { ITreeRepository } from './tree-repository.interface'

export interface IBaseTreeEntity {
  id: number
  parentId: number
}

export class TreeRepository<Entity> extends Repository<Entity> implements ITreeRepository<Entity> {
  public async findTrees(options?: FindTreeOptions) {
    const roots = await this.findRoots(options)
    const trees = await Promise.all(roots.map((root) => this.findDescendantsTree(root, options)))
    return trees
  }

  public findRoots(options?: FindTreeOptions) {
    return this.find({ where: { parentId: null }, relations: options?.relations })
  }

  public async findDescendants(root: Entity, options?: FindTreeOptions) {
    return this._find('descendants', root, options)
  }

  public async findDescendantsTree(root: Entity, options?: FindTreeOptions) {
    const nodes = await this._find('descendants', root, options)
    const rootAsTreeEntity = root as unknown as IBaseTreeEntity
    const assembledTreeNodes = this._assembleOrgTreeNodes(nodes, rootAsTreeEntity.id)

    return assembledTreeNodes
  }

  public async countDescendants(entity: Entity): Promise<number> {
    return this._count('descendants', entity)
  }

  public async createDescendantsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>> {
    return this._createQueryBuilder('descendants', alias, entity)
  }

  public findAncestors(entity: Entity, options?: FindTreeOptions) {
    return this._find('ancestors', entity, options)
  }

  public async findAncestorsTree(node: Entity, options?: FindTreeOptions) {
    const ancestors = await this._find('ancestors', node, options)
    const root = ancestors.find((node: any) => !node.parentId) as unknown as IBaseTreeEntity

    if (!root) {
      throw new NoRootParentError((node as any).id)
    }

    const assembledTreeNodes = this._assembleOrgTreeNodes(ancestors, root.id)

    return assembledTreeNodes
  }

  public async countAncestors(entity: Entity): Promise<number> {
    return this._count('ancestors', entity)
  }

  public async createAncestorsQueryBuilder(alias: string, entity: Entity) {
    return this._createQueryBuilder('ancestors', alias, entity)
  }

  private async _find(relationType: RelationType, root: Entity, options?: FindTreeOptions) {
    const nodeIds = await this._getIds(relationType, root)
    const nodes = await this.find({ where: { id: In(nodeIds) }, relations: options?.relations })

    return nodes
  }

  private async _count(relationType: RelationType, entity: Entity): Promise<number> {
    const rootAsTreeEntity = entity as unknown as IBaseTreeEntity
    const tableName = this.metadata.tableName
    const rootId = rootAsTreeEntity.id
    const query = new FindTreeQuery({ relationType: relationType, tableName, rootId, selectCount: true }).build()
    const result = await this.manager.query(query)
    const count = Number(get(first(result), 'count'))

    return count
  }

  private async _createQueryBuilder(relationType: RelationType, alias: string, entity: Entity) {
    const ids = await this._getIds(relationType, entity)
    const queryBuilder = this.createQueryBuilder(alias).where({ id: In(ids) })

    return queryBuilder
  }

  private async _getIds(relationType: RelationType, root: Entity, maxDepth?: number) {
    const rootAsTreeEntity = root as unknown as IBaseTreeEntity
    const rootId = rootAsTreeEntity.id
    const tableName = this.metadata.tableName
    const query = new FindTreeQuery({ relationType: relationType, tableName, rootId, maxDepth }).build()
    const rawNodes = await this.manager.query(query)
    const ids = map(rawNodes, 'id')

    return ids
  }

  private _assembleOrgTreeNodes(nodes: Entity[], rootId: number) {
    return new TreeAssembler<Entity>({ childrenPropertyName: this._childrenPropertyName }).assemble(nodes, rootId)
  }

  private get _entity() {
    return this.target
  }

  private get _childrenPropertyName() {
    const [, childrenPropertyName] = Reflect.getMetadata(childrenPropertyMetadataArgs, this._entity)
    return childrenPropertyName
  }
}
