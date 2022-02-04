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
  })

  afterAll(async () => {
    await postgresContainer.stop()
  })

  describe('#findRoots()', () => {
    let connection: Connection
    let nodeRepo: NodeRepository

    beforeAll(async () => {
      connection = getConnection()
      nodeRepo = connection.getCustomRepository(NodeRepository)

      await connection.manager.query('create table node (id serial primary key, value integer, parent_id integer)')
      await nodeRepo.save([
        {
          value: 1,
          children: [{ value: 2 }, { value: 3, children: [{ value: 4 }] }],
        },
        { value: 2 },
      ])
    })

    afterAll(async () => {
      await connection.close()
    })

    it('returns entities that have no ancestors', async () => {
      const roots = await nodeRepo.findRoots()
      console.log(roots)
      expect(roots.length).toBe(2)
    })
  })
})
