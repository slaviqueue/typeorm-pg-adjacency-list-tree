import { find } from 'lodash'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers'
import { Column, DataSource, Entity, LessThan, PrimaryGeneratedColumn } from 'typeorm'
import { Tree } from '../lib/decorator/tree'
import { TreeChildren } from '../lib/decorator/tree-children'
import { TreeParent } from '../lib/decorator/tree-parent'
import { extendTreeRepository, TreeRepository } from '../lib/repository/tree-repository'

@Tree()
@Entity()
class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @TreeParent()
  public parent!: Node

  @TreeChildren()
  public children!: Node[]

  @Column()
  public value!: number
}

type NodeRepository = TreeRepository<Node>

jest.setTimeout(40_000)

describe('TreeRepository', () => {
  let postgresContainer: StartedPostgreSqlContainer
  let nodeRepo: NodeRepository
  let dataSource: DataSource

  const trees = [
    {
      value: 1,
      children: [{ value: 2 }, { value: 3, children: [{ value: 4 }] }],
    },
    { value: 2 },
  ]

  beforeAll(async function () {
    postgresContainer = await new PostgreSqlContainer()
      .withExposedPorts(5432)
      .withUsername('postgres')
      .withPassword('postgres')
      .withDatabase('postgres')
      .start()

    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: postgresContainer.getMappedPort(5432),
      username: 'postgres',
      password: 'postgres',
      entities: [Node],
    })

    await dataSource.initialize()
    nodeRepo = extendTreeRepository(dataSource.getRepository(Node))

    await dataSource.manager.query('create table node (id serial primary key, value integer, parent_id integer)')
    await nodeRepo.save(trees)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await postgresContainer.stop()
  })

  describe('#findRoots()', () => {
    it('returns entities that have no ancestors', async () => {
      const roots = await nodeRepo.findRoots()

      expect(roots).toEqual([
        { id: 1, value: 1, parentId: null },
        { id: 2, value: 2, parentId: null },
      ])
    })
  })

  describe('#findTrees()', () => {
    it('returns all trees as nested entities', async () => {
      const trees = await nodeRepo.findTrees()
      expect(trees).toEqual([
        {
          id: 1,
          value: 1,
          parentId: null,
          children: [
            { id: 3, value: 2, parentId: 1 },
            { id: 4, value: 3, parentId: 1, children: [{ id: 5, value: 4, parentId: 4 }] },
          ],
        },
        { id: 2, value: 2, parentId: null },
      ])
    })
  })

  describe('#findDescendants()', () => {
    it('returns root`s children and root as a flat list', async () => {
      const root = await nodeRepo.findOneOrFail({ where: { id: 1 } })
      const descendants = await nodeRepo.findDescendants(root)

      expect(new Set(descendants)).toEqual(
        new Set([
          { id: 1, value: 1, parentId: null },
          { id: 3, value: 2, parentId: 1 },
          { id: 4, value: 3, parentId: 1 },
          { id: 5, value: 4, parentId: 4 },
        ]),
      )
    })
  })

  describe('#findDescendantsTree()', () => {
    it('returns root with children as a nested tree', async () => {
      const root = await nodeRepo.findOneOrFail({ where: { id: 1 } })
      const tree = await nodeRepo.findDescendantsTree(root)

      expect(tree).toEqual({
        id: 1,
        parentId: null,
        value: 1,
        children: [
          { id: 3, parentId: 1, value: 2 },
          { id: 4, parentId: 1, value: 3, children: [{ id: 5, parentId: 4, value: 4 }] },
        ],
      })
    })
  })

  describe('#countDescendants()', () => {
    it('returns the amount of descendants for specified entity', async () => {
      const root = await nodeRepo.findOneOrFail({ where: { id: 1 } })
      const count = await nodeRepo.countDescendants(root)

      expect(count).toEqual(4)
    })
  })

  describe('#createDescendantsQueryBuilder()', () => {
    it('creates a query builder for node descendants', async () => {
      const root = await nodeRepo.findOneOrFail({ where: { id: 1 } })
      const qb = await nodeRepo.createDescendantsQueryBuilder('node', root)
      const nodesWithIds = await qb.select('id').execute()

      expect(nodesWithIds).toEqual([{ id: 1 }, { id: 3 }, { id: 4 }, { id: 5 }])
    })
  })

  describe('#findAncestors()', () => {
    it("returns node's parents and a node as a flat list", async () => {
      const node = await nodeRepo.findOneOrFail({ where: { id: 3 } })
      const ancestors = await nodeRepo.findAncestors(node)

      expect(new Set(ancestors)).toEqual(
        new Set([
          { id: 1, value: 1, parentId: null },
          { id: 3, value: 2, parentId: 1 },
        ]),
      )
    })
  })

  describe('#findAncestorsTree()', () => {
    it("returns node's ancestors as a tree", async () => {
      const node = await nodeRepo.findOneOrFail({ where: { id: 5 } })
      const tree = await nodeRepo.findAncestorsTree(node)

      expect(tree).toEqual({
        id: 1,
        parentId: null,
        value: 1,
        children: [{ id: 4, parentId: 1, value: 3, children: [{ id: 5, parentId: 4, value: 4 }] }],
      })
    })
  })

  describe('#countAncestors()', () => {
    it('returns the amount of ancestors for specified entity', async () => {
      const node = await nodeRepo.findOneOrFail({ where: { id: 3 } })
      const count = await nodeRepo.countAncestors(node)

      expect(count).toEqual(2)
    })
  })

  describe('#createAncestorsQueryBuilder()', () => {
    it('creates a query builder for node ancestors', async () => {
      const node = await nodeRepo.findOneOrFail({ where: { id: 3 } })
      const qb = await nodeRepo.createAncestorsQueryBuilder('node', node)
      const nodesWithIds = await qb.select('id').execute()

      expect(nodesWithIds).toEqual([{ id: 1 }, { id: 3 }])
    })
  })

  describe('Suppose we want to extend the tree repo somehow', () => {
    it('should work', async () => {
      const nodeRepoWithAdditionalMethods = nodeRepo.extend({
        getWhereIdIsLessThan(n: number) {
          return this.find({ where: { id: LessThan(n) } })
        },
      })

      const nodes = await nodeRepoWithAdditionalMethods.getWhereIdIsLessThan(3)

      expect(nodes).toHaveLength(2)
      expect(find(nodes, { id: 1 })).toBeTruthy()
      expect(find(nodes, { id: 2 })).toBeTruthy()
    })
  })
})
