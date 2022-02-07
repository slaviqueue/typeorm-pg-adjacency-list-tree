import { first, get, map } from 'lodash'
import { In, Repository, SelectQueryBuilder } from 'typeorm'
import { FindTreeOptions } from 'typeorm/find-options/FindTreeOptions'
import { childrenPropertyMetadataArgs } from '../constant/decorator-constants'
import { TreeAssembler } from './tree-assembler'
import { FindTreeQuery } from './tree-query'
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
    const nodeIds = await this._getDescendantsIds(root)
    const nodes = await this.find({ where: { id: In(nodeIds) }, relations: options?.relations })

    return nodes
  }

  public async findDescendantsTree(root: Entity, options?: FindTreeOptions) {
    const nodes = await this.findDescendants(root, options)
    const rootAsTreeEntity = root as unknown as IBaseTreeEntity
    const assembledTreeNodes = this._assembleOrgTreeNodes(nodes, rootAsTreeEntity.id)

    return assembledTreeNodes
  }

  public async countDescendants(entity: Entity): Promise<number> {
    const rootAsTreeEntity = entity as unknown as IBaseTreeEntity
    const tableName = this.metadata.tableName
    const rootId = rootAsTreeEntity.id
    const query = new FindTreeQuery({ tableName, rootId, selectCount: true }).build()
    const result = await this.manager.query(query)
    const count = Number(get(first(result), 'count'))

    return count
  }

  public async createDescendantsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>> {
    const ids = await this._getDescendantsIds(entity)
    const queryBuilder = this.createQueryBuilder(alias).where({ id: In(ids) })

    return queryBuilder
  }

  private async _getDescendantsIds(root: Entity, maxDepth?: number) {
    const rootAsTreeEntity = root as unknown as IBaseTreeEntity
    const rootId = rootAsTreeEntity.id
    const tableName = this.metadata.tableName
    const query = new FindTreeQuery({ tableName, rootId, maxDepth }).build()
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
