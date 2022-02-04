import { FindTreeOptions } from 'typeorm/find-options/FindTreeOptions'

export interface BaseTreeEntity {
  id: number
  parentId: number
}

export declare class ITreeRepository<Entity extends BaseTreeEntity> {
  /**
   * Gets complete trees for all roots in the table.
   */
  public findTrees(options?: FindTreeOptions): Promise<Entity[]>
  /**
   * Roots are entities that have no ancestors. Finds them all.
   */
  public findRoots(options?: FindTreeOptions): Promise<Entity[]>
  /**
   * Gets all children (descendants) of the given entity. Returns them all in a flat array.
   */
  public findDescendants(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
  /**
   * Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.
   */
  public findDescendantsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>

  // Methods below are to be implemented
  // /**
  //  * Gets number of descendants of the entity.
  //  */
  // public countDescendants(entity: Entity): Promise<number>
  // /**
  //  * Creates a query builder used to get descendants of the entities in a tree.
  //  */
  // public createDescendantsQueryBuilder(
  //   alias: string,
  //   closureTableAlias: string,
  //   entity: Entity,
  // ): SelectQueryBuilder<Entity>
  // /**
  //  * Gets all parents (ancestors) of the given entity. Returns them all in a flat array.
  //  */
  // public findAncestors(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
  // /**
  //  * Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.
  //  */
  // public findAncestorsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>
  // /**
  //  * Gets number of ancestors of the entity.
  //  */
  // public countAncestors(entity: Entity): Promise<number>
  // /**
  //  * Creates a query builder used to get ancestors of the entities in the tree.
  //  */
  // public createAncestorsQueryBuilder(
  //   alias: string,
  //   closureTableAlias: string,
  //   entity: Entity,
  // ): SelectQueryBuilder<Entity>
}
