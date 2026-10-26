"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconLogOut, IconSpinner } from "@/components/ui/icons";
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/styles";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton({
  variant = "ghost",
  size = "md",
  fullWidth = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      aria-busy={pending || undefined}
      className={buttonClass({ variant, size, fullWidth })}
    >
      {pending ? <IconSpinner size={18} /> : <IconLogOut size={19} />}
      <span className="text-[14px] font-medium">Sair</span>
    </button>
  );
}
