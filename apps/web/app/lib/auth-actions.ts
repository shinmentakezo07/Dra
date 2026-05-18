"use server";

import { signOut } from "@/auth";
import { getSDK } from "@/lib/api/sdk";

export async function signOutAction() {
  try {
    const sdk = getSDK();
    await sdk.auth.logout();
  } catch {
    // Backend logout failure — still clear local session
  }
  await signOut();
}
