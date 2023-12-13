import { first, get, map } from 'lodash'
import { FindOptionsWhere, In, IsNull, Repository, SelectQueryBuilder } from 'typeorm'
import { FindTreeOptions } from 'typeorm/find-options/FindTreeOptions'
import { childrenPropertyMetadataArgs } from '../constant/decorator-constants'
import { NoRootParentError } from '../error/no-root-parent.error'
import { TreeAssembler } from './tree-assembler'
import { FindTreeQuery, RelationType } from './tree-query'
import { ITreeRepository } from './tree-repository.interface'

export interface IBaseTreeEntity {
  id: number

  // This one is optional because we do not force user to specify the parentId
  // column in the entity definition
  parentId?: number | null
}

export type TreeRepository<Entity extends IBaseTreeEntity> = Repository<Entity> & ITreeRepository<Entity>

// I hate what they've done to custom repos, but we have to work with what we have.
//
// I don't know if there's a better way to separate custom repo methods from the
// call of dataSource.getRepository(Entity).extend({ ... }). If you know, please
// create an issue or a pr.
export function extendTreeRepository<Entity extends IBaseTreeEntity>(repository: Repository<Entity>) {
  const repo = repository.extend({
    async findTrees(options?: FindTreeOptions) {
      const roots = await this.findRoots(options)
      const trees = await Promise.all(roots.map((root) => this.findDescendantsTree(root, options)))
      return trees
    },

    async findRoots(options?: FindTreeOptions) {
      // I don't know wtf is wrong here, so I just cast it
      // Seems like the issue is opened for 1 year already
      // https://github.com/typeorm/typeorm/issues/9508
      return this.find({ where: { parentId: IsNull() } as FindOptionsWhere<Entity>, relations: options?.relations })
    },

    async findDescendants(root: Entity, options?: FindTreeOptions) {
      return this._find('descendants', root, options)
    },

    async findDescendantsTree(root: Entity, options?: FindTreeOptions) {
      const nodes = await this._find('descendants', root, options)
      const rootAsTreeEntity = root as unknown as IBaseTreeEntity
      const assembledTreeNodes = this._assembleOrgTreeNodes(nodes, rootAsTreeEntity.id)

      return assembledTreeNodes
    },

    async countDescendants(entity: Entity): Promise<number> {
      return this._count('descendants', entity)
    },

    async createDescendantsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>> {
      return this._createQueryBuilder('descendants', alias, entity)
    },

    findAncestors(entity: Entity, options?: FindTreeOptions) {
      return this._find('ancestors', entity, options)
    },

    async findAncestorsTree(node: Entity, options?: FindTreeOptions) {
      const ancestors = await this._find('ancestors', node, options)
      const root = ancestors.find((node: any) => !node.parentId) as unknown as IBaseTreeEntity

      if (!root) {
        throw new NoRootParentError((node as any).id)
      }

      const assembledTreeNodes = this._assembleOrgTreeNodes(ancestors, root.id)

      return assembledTreeNodes
    },

    async countAncestors(entity: Entity): Promise<number> {
      return this._count('ancestors', entity)
    },

    async createAncestorsQueryBuilder(alias: string, entity: Entity) {
      return this._createQueryBuilder('ancestors', alias, entity)
    },

    async _find(relationType: RelationType, root: Entity, options?: FindTreeOptions) {
      const nodeIds = await this._getIds(relationType, root)
      const nodes = await this.find({
        where: { id: In(nodeIds) } as FindOptionsWhere<Entity>,
        relations: options?.relations,
      })

      return nodes
    },

    async _count(relationType: RelationType, entity: Entity): Promise<number> {
      const rootAsTreeEntity = entity as unknown as IBaseTreeEntity
      const tableName = this.metadata.tableName
      const rootId = rootAsTreeEntity.id
      const query = new FindTreeQuery({ relationType: relationType, tableName, rootId, selectCount: true }).build()
      const result = await this.manager.query(query)
      const count = Number(get(first(result), 'count'))

      return count
    },

    async _createQueryBuilder(relationType: RelationType, alias: string, entity: Entity) {
      const ids = await this._getIds(relationType, entity)
      const queryBuilder = this.createQueryBuilder(alias).where({ id: In(ids) })

      return queryBuilder
    },

    async _getIds(relationType: RelationType, root: Entity, maxDepth?: number) {
      const rootAsTreeEntity = root as unknown as IBaseTreeEntity
      const rootId = rootAsTreeEntity.id
      const tableName = this.metadata.tableName
      const query = new FindTreeQuery({ relationType: relationType, tableName, rootId, maxDepth }).build()
      const rawNodes = await this.manager.query(query)
      const ids = map(rawNodes, 'id')

      return ids
    },

    _assembleOrgTreeNodes(nodes: Entity[], rootId: number) {
      return new TreeAssembler<Entity>({ childrenPropertyName: this._getChildrenPropertyName() }).assemble(
        nodes,
        rootId,
      )
    },

    _getEntity() {
      return this.target
    },

    _getChildrenPropertyName() {
      const [, childrenPropertyName] = Reflect.getMetadata(childrenPropertyMetadataArgs, this._getEntity())
      return childrenPropertyName
    },
  })

  return repo
}
