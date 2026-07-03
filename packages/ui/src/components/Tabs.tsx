import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  /** Oversat aria-label for fanelisten. */
  listLabel: string;
  className?: string;
}

export function Tabs({ items, defaultValue, listLabel, className }: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      className={className}
    >
      <RadixTabs.List
        aria-label={listLabel}
        className="inline-flex gap-0.5 rounded-pill border border-hairline bg-surface p-0.5"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "rounded-pill px-4 py-1.5 text-small font-medium text-secondary transition-colors",
              "hover:bg-brand-tint hover:text-brand",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "data-[state=active]:bg-brand data-[state=active]:text-on-brand",
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
