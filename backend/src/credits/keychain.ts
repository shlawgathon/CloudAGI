// ---------------------------------------------------------------------------
// macOS Keychain helper — uses the `security` CLI via Bun.spawn()
// All functions return null on any failure (never throw).
// ---------------------------------------------------------------------------

/**
 * Read a generic password from the macOS Keychain.
 *
 * @param service  - Keychain service name (required)
 * @param account  - Keychain account name (optional)
 * @returns The password string, or null if not found / on error
 */
export async function readKeychain(
  service: string,
  account?: string,
): Promise<string | null> {
  try {
    const args = [
      "find-generic-password",
      "-s",
      service,
      ...(account ? ["-a", account] : []),
      "-w",
    ];

    const proc = Bun.spawn(["security", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
    ]);

    if (exitCode !== 0) {
      return null;
    }

    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Convenience alias — reads a keychain entry by service name only.
 */
export async function readKeychainPassword(
  service: string,
): Promise<string | null> {
  return readKeychain(service);
}
