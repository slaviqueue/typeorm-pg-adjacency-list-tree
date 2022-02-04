import { childrenPropertyMetadataArgs } from '../constant/decorator-constants'

export function TreeChildren() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(childrenPropertyMetadataArgs, [target, propertyKey], target.constructor)
  }
}
