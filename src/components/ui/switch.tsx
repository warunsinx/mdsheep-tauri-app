import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { clsx } from "clsx";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={clsx(
        "switch-accent group inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-neutral-300 p-0.5 shadow-inner transition-colors outline-none hover:bg-neutral-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:focus-visible:ring-offset-neutral-900",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-neutral-50"
      />
    </SwitchPrimitive.Root>
  );
}
