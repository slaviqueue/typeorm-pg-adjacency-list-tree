export class InvalidTreeTypeError extends Error {
  public constructor(actualTreeType: string) {
    super(`Invalid relation type ${actualTreeType}. Expected either 'descendants' or 'ancestors'.`)
  }
}
