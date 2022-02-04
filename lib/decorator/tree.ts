import { Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import {
  childrenPropertyMetadataArgs,
  isPgAdjacencyListTree,
  parentPropertyMetadataArgs,
} from '../constant/decorator-constants'

function buildParentRelation(target: any, childrenPropertyKey: string) {
  // prettier-ignore
  return ManyToOne(() => target, (target: any) => target[childrenPropertyKey], { orphanedRowAction: 'delete' })
}

function buildChildrenRelation(target: any, parentPropertyKey: string) {
  // prettier-ignore
  return OneToMany(() => target, (target: any) => target[parentPropertyKey], { cascade: true })
}

function addParentColumns(parentPropertyTarget: any, parentPropertyKey: string) {
  JoinColumn({ name: 'parent_id' })(parentPropertyTarget, parentPropertyKey)
  Column({ type: 'integer', name: 'parent_id' })(parentPropertyTarget, 'parentId')
}

export function Tree() {
  return function (target: any) {
    Reflect.defineMetadata(isPgAdjacencyListTree, true, target)

    const [parentPropertyTarget, parentPropertyKey] = Reflect.getMetadata(parentPropertyMetadataArgs, target)
    const [childrenPropertyTarget, childrenPropertyKey] = Reflect.getMetadata(childrenPropertyMetadataArgs, target)

    addParentColumns(parentPropertyTarget, parentPropertyKey)
    buildParentRelation(target, childrenPropertyKey)(parentPropertyTarget, parentPropertyKey)
    buildChildrenRelation(target, parentPropertyKey)(childrenPropertyTarget, childrenPropertyKey)
  }
}
