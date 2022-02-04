import { parentPropertyMetadataArgs } from '../constant/decorator-constants'

export function TreeParent() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(parentPropertyMetadataArgs, [target, propertyKey], target.constructor)
  }
}
