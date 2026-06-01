export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function boolLabel(value: boolean): string {
  return value ? "Yes" : "No";
}
