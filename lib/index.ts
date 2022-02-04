import 'reflect-metadata'
import { Column, createConnection, Entity, EntityRepository, getConnection, PrimaryGeneratedColumn } from 'typeorm'
import { Tree } from './decorator/tree'
import { TreeChildren } from './decorator/tree-children'
import { TreeParent } from './decorator/tree-parent'
import { TreeRepository } from './repository/tree-repository'

@Tree()
@Entity()
class Node {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public value!: number

  @TreeParent()
  public parent!: Node

  @TreeChildren()
  public children!: Node[]
}

@EntityRepository(Node)
class NodeRepo extends TreeRepository<Node> {}

;(async () => {
  await createConnection({
    type: 'postgres',
    username: 'postgres',
    password: 'postgres',
    entities: [Node],
    logging: true,
  })

  const repo = getConnection().getCustomRepository(NodeRepo)

  // await repo.save({ value: 1, children: [{ value: 2 }] })

  // console.log(await repo.findDescendants(9))
  console.log(await repo.findTrees())
})()
