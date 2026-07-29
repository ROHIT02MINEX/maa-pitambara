import type { Occupation, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      occupation: Occupation | null;
      phone: string | null;
      profileComplete: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    occupation?: Occupation | null;
    phone?: string | null;
    disabled?: boolean;
  }
}

// Auth.js v5 re-exports the JWT type from `@auth/core/jwt`; both module
// specifiers are augmented so the extra claims stay typed either way.
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    occupation?: Occupation | null;
    phone?: string | null;
    profileComplete?: boolean;
    /** Epoch ms of the last database refresh of this token. */
    refreshedAt?: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    occupation?: Occupation | null;
    phone?: string | null;
    profileComplete?: boolean;
    /** Epoch ms of the last database refresh of this token. */
    refreshedAt?: number;
  }
}

export {};
