import * as React from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof RadixSlider.Root> {}

export const Slider = React.forwardRef<
  React.ElementRef<typeof RadixSlider.Root>,
  SliderProps
>(({ className, ...props }, ref) => (
  <RadixSlider.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <RadixSlider.Range className="absolute h-full bg-indigo-600" />
    </RadixSlider.Track>
    <RadixSlider.Thumb className="block h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50" />
  </RadixSlider.Root>
));
Slider.displayName = "Slider";

export default Slider;
