import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Middleware refreshes the session for normal requests.
        }
      }
    }
  });
}
