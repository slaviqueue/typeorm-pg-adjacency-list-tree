# typeorm-pg-adjacency-list-tree

This library helps to manage trees that are structured as as adjacency list in postgres.

It partially implements public interface of `TreeRepository` from typeorm.

```typescript
import { FindTreeOptions } from 'typeorm/find-options/FindTreeOptions'

export interface BaseTreeEntity {
  id: number
  parentId: number
}

export declare class ITreeRepository<Entity extends BaseTreeEntity> {
  public findTrees(options?: FindTreeOptions): Promise<Entity[]>
  public findRoots(options?: FindTreeOptions): Promise<Entity[]>
  public findDescendants(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
  public findDescendantsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>

  // Methods below are to be implemented

  // public countDescendants(entity: Entity): Promise<number>
  // public createDescendantsQueryBuilder( alias: string, closureTableAlias: string, entity: Entity,)
  // public findAncestors(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
  // public findAncestorsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>
  // public countAncestors(entity: Entity): Promise<number>
  // public createAncestorsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity,)
}
```
