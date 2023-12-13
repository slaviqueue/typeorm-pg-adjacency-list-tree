# typeorm-pg-adjacency-list-tree

<a
href="https://codeclimate.com/github/slaviqueue/typeorm-pg-adjacency-list-tree/maintainability"><img
src="https://api.codeclimate.com/v1/badges/87bcd3913294f1f2aaf0/maintainability"
/></a>
[![tests](https://github.com/slaviqueue/typeorm-pg-adjacency-list-tree/workflows/test/badge.svg)](https://github.com/slaviqueue/typeorm-pg-adjacency-list-tree/actions)
[![npm version](https://badge.fury.io/js/typeorm-pg-adjacency-list-tree.svg)](https://www.npmjs.com/package/typeorm-pg-adjacency-list-tree)

This library helps to manage trees that are structured as as adjacency list in
postgres.

It partially implements public interface of `TreeRepository` from typeorm. Check
[tree-repository.interface.ts](https://github.com/slaviqueue/typeorm-pg-adjacency-list-tree/blob/master/lib/repository/tree-repository.interface.ts)

Current version of the library is compatible with typeorm >= 0.3.0. If you use
typeorm < 0.3.0, please use typeorm-pg-adjacency-list-tree < 2.0.0.

## Installation

```bash
npm i typeorm-pg-adjacency-list-tree
```

## Quick start

### Decorators

There are three decorators exported from this module: `Tree`, `TreeParent` and
`TreeChildren`.

`Tree` is used to specify that decoratable entity is a tree.

```typescript
@Tree()
@Entity()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public value!: number
}
```

`TreeParent` is used to identify class property which will hold entities parent:

```typescript
@Tree()
@Entity()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @TreeParent()
  public parent!: Node

  @Column()
  public value!: number
}
```

`TreeChildren` is used to identify class property which will hold children of
current entity:

```typescript
@Tree()
@Entity()
export class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @TreeParent()
  public parent!: Node

  @TreeChildren()
  public children!: Node[]

  @Column()
  public value!: number
}
```

### Tree repository

In the latest major version of typeorm, they decided to drop support for
creating custom repositories with classes. And now the only way to create a
custom repository is to call `dataSource.getRepository(Entity).extend({ /* your custom repo here */ })`.

To simplify the process of getting the tree repo, there's a helper function
`extendTreeRepository`.

If you have any suggestions on how to implement this in a better way, please
create an issue or send a pr.

Instantiating a tree repo from connection:
```typescript
import { extendTreeRepository } from 'typeorm-pg-adjacency-list-tree'

const nodeRepo = extendTreeRepository(dataSource.getRepository(Node))
const roots = await nodeRepo.findRoots()
```

After 0.3, extending a tree repo is not as simple as just extending a class.

We have to get our tree repository first.

```typescript
import { extendTreeRepository } from 'typeorm-pg-adjacency-list-tree'

const userRepo = extendTreeRepository(dataSource.getRepository(User)).extend({
  async getByName(name: string) {
    return this.find({ where: { name } })
  },
})
```

### Tree repository methods

```typescript
findTrees(options?: FindTreeOptions): Promise<Entity[]>
```

Gets complete trees for all roots in the table.

```typescript
findRoots(options?: FindTreeOptions): Promise<Entity[]>
```

Roots are entities that have no ancestors. Finds them all.

```typescript
findDescendants(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
```

Gets all children (descendants) of the given entity. Returns them all in a flat array.

```typescript
findDescendantsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>
```

Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.

```typescript
countDescendants(entity: Entity): Promise<number>
```

Gets number of descendants of the entity.

```typescript
createDescendantsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>>
```

Creates a query builder used to get descendants of the entities in a tree.

```typescript
findAncestors(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>
```

Creates a query builder used to get descendants of the entities in a tree.

```typescript
findAncestorsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>
```

Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.

```typescript
countAncestors(entity: Entity): Promise<number>
```

Gets number of ancestors of the entity.

```typescript
createAncestorsQueryBuilder(alias: string, entity: Entity): Promise<SelectQueryBuilder<Entity>>
```

Creates a query builder used to get ancestors of the entities in the tree.

