import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { clsx } from "clsx";

export const SLIDER_THUMB_SIZE_PX = 20;

export function Slider({ className, "aria-label": ariaLabel, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={clsx(
        "relative flex w-full touch-none select-none items-center py-2 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-neutral-200 shadow-inner dark:bg-neutral-700"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="slider-accent absolute h-full rounded-full"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={ariaLabel}
        style={{ width: SLIDER_THUMB_SIZE_PX, height: SLIDER_THUMB_SIZE_PX }}
        className="slider-thumb-accent block rounded-full border-2 bg-white shadow-md ring-offset-white transition-[transform,box-shadow] outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none dark:bg-neutral-950 dark:ring-offset-neutral-950"
      />
    </SliderPrimitive.Root>
  );
}
