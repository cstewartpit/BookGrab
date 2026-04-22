export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootKeepalive } = await import("@/lib/mam-session");
    await bootKeepalive();
  }
}
