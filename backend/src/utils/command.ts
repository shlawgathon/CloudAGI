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

const ALLOWED_COMMANDS = ["python", "python3", "pip", "pip3", "nvidia-smi", "nvcc", "bash", "sh"];

export function validateCommand(command: string[]): void {
  if (!command || command.length === 0) {
    throw new Error("Command must be a non-empty array");
  }
  const cmd = command[0];
  if (!ALLOWED_COMMANDS.includes(cmd)) {
    throw new Error(
      `Command not allowed: ${cmd}. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`
    );
  }
}
