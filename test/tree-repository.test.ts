import { map, omit } from 'lodash'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers'
import {
  Column,
  Connection,
  createConnection,
  Entity,
  EntityRepository,
  getConnection,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Tree } from '../lib/decorator/tree'
import { TreeChildren } from '../lib/decorator/tree-children'
import { TreeParent } from '../lib/decorator/tree-parent'
import { TreeRepository } from '../lib/repository/tree-repository'

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

@EntityRepository(Node)
class NodeRepository extends TreeRepository<Node> {}

describe('TreeRepository', () => {
  let postgresContainer: StartedPostgreSqlContainer
  let nodeRepo: NodeRepository
  let connection: Connection

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

    await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: postgresContainer.getMappedPort(5432),
      username: 'postgres',
      password: 'postgres',
      entities: [Node],
    })

    connection = getConnection()
    nodeRepo = connection.getCustomRepository(NodeRepository)

    await connection.manager.query('create table node (id serial primary key, value integer, parent_id integer)')
    await nodeRepo.save(trees)
  })

  afterAll(async () => {
    await connection.close()
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
})
