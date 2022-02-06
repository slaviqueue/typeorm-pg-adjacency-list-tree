# typeorm-pg-adjacency-list-tree

<a
href="https://codeclimate.com/github/slaviqueue/typeorm-pg-adjacency-list-tree/maintainability"><img
src="https://api.codeclimate.com/v1/badges/87bcd3913294f1f2aaf0/maintainability"
/></a>
![tests](https://github.com/slaviqueue/typeorm-pg-adjacency-list-tree/workflows/test/badge.svg)

This library helps to manage trees that are structured as as adjacency list in
postgres.

It partially implements public interface of `TreeRepository` from typeorm. Check [tree-repository.interface.ts](https://github.com/slaviqueue/typeorm-pg-adjacency-list-tree/blob/master/lib/repository/tree-repository.interface.ts)

## Quick start

### Decorators

There are three decorators exported from this module: `Tree`, `TreeParent` and `TreeChildren`.

`Tree` is used to specify that decoratable entity is a tree.

```typescript
@Tree()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number
}
```

`TreeParent` is used to identify class property which will hold entities parent:

```typescript
@Tree()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @TreeParent()
  public parent!: Node
}
```

`TreeChildren` is used to identify class property which will hold children of current entity:

```typescript
@Tree()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @TreeParent()
  public parent!: Node

  @TreeChildren()
  public children!: Node[]
}
```

### Tree repository

`TreeRepository` can be used to access some methods used for working with trees:

```typescript
// node-repository.ts

@EntityRepository(Node)
class NodeRepository extends TreeRepository<Node> {}

// node-service.ts
class NodeService {
  private _nodeRepo = getConnection().getCustomRepository(NodeRepository)

  public getAllTrees() {
    return this._nodeRepo.findTrees()
  }
}
```

### Tree repository methods

```typescript
public findTrees(options?: FindTreeOptions): Promise<Entity[]>
```

Gets complete trees for all roots in the table.

```typescript
public findRoots(options?: FindTreeOptions): Promise<Entity[]>
```

Roots are entities that have no ancestors. Finds them all.

```typescript
public findDescendants(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
```

Gets all children (descendants) of the given entity. Returns them all in a flat array.

```typescript
public findDescendantsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>
```

Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.

```typescript
public countDescendants(entity: Entity): Promise<number>
```

Gets number of descendants of the entity.

```typescript
public createDescendantsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>>
```

Creates a query builder used to get descendants of the entities in a tree.
