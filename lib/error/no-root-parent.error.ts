export class NoRootParentError extends Error {
  public constructor(nodeId: number) {
    super(`No ancestor with parent_id = null was found for node id ${nodeId}`)
  }
}
