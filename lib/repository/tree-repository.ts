import { first, get, map } from 'lodash'
import { In, Repository } from 'typeorm'
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
    const rootAsTreeEntity = root as unknown as IBaseTreeEntity
    const query = new FindTreeQuery({ tablePath: this.metadata.tablePath, rootId: rootAsTreeEntity.id }).build()
    const rawNodes = await this.manager.query(query)
    const nodeIds = map(rawNodes, 'id')
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
    const query = new FindTreeQuery({
      tablePath: this.metadata.tablePath,
      rootId: rootAsTreeEntity.id,
      selectCount: true,
    }).build()

    const result = await this.manager.query(query)
    const count = Number(get(first(result), 'count'))

    return count
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
