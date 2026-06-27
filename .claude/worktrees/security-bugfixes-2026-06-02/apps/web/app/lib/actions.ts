"use server";

import { z } from "zod";
import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const SignupSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long." }),
});

export type State = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

export async function signup(prevState: State, formData: FormData) {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Account.",
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { message: json.error || "Failed to create account." };
    }
  } catch {
    return { message: "Backend unreachable. Failed to Create Account." };
  }

  // Sign in the user immediately after signup
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    // auto-login failed silently after signup
  }

  redirect("/dashboard");
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      redirectTo: "/dashboard",
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function authenticateSocial(provider: string) {
  await signIn(provider, { redirectTo: "/dashboard" });
}

export async function authenticateAdmin(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      redirectTo: "/admin",
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid admin credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const email = formData.get("email");
  if (!email) return { message: "Email is required" };

  const emailSchema = z.string().email();
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    return { message: "Invalid email address" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok && !json.success) {
      // Don't reveal if email exists for security
    }
  } catch {
    // Backend error handled silently to prevent email enumeration
  }

  return {
    message: "If an account exists, a password reset link has been sent.",
  };
}

export async function signOutAction() {
  "use server";
  await signOut();
}

export async function updateProfile(prevState: any, formData: FormData) {
  const session = await auth();
  const backendToken = session?.user?.backendToken;
  if (!backendToken) {
    return { message: "Not authenticated with backend" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
  });

  const validated = schema.safeParse({ name, email });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({ name, email }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { message: json.error || "Failed to update profile" };
    }
    revalidatePath("/dashboard/settings");
    revalidatePath("/", "layout");
    return { message: "Profile updated successfully" };
  } catch (e) {
    return { message: "Failed to update profile" };
  }
}

export async function changePassword(prevState: any, formData: FormData) {
  const session = await auth();
  const backendToken = session?.user?.backendToken;
  if (!backendToken) {
    return { message: "Not authenticated with backend" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword) {
    return { message: "New passwords do not match" };
  }

  if (newPassword.length < 6) {
    return { message: "Password must be at least 6 characters" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { message: json.error || "Failed to update password" };
    }
    return { message: "Password updated successfully" };
  } catch (e) {
    return { message: "Failed to update password" };
  }
}
