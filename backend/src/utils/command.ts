export function splitCommand(value: string): string[] {
  return (
    value
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((part) => part.replace(/^"|"$/g, ""))
      .filter(Boolean) ?? []
  );
}

export function normalizeCommand(command?: string[] | string): string[] {
  if (Array.isArray(command)) {
    return command.map((part) => part.trim()).filter(Boolean);
  }

  if (typeof command === "string") {
    return splitCommand(command.trim());
  }

  return [];
}
