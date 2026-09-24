export function describeAction(action: string): string {
  const parts = action.split(".");
  const verb = parts[1] ?? action;
  return verb.replaceAll("_", " ");
}
