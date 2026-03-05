export type MachineType = "coffee" | "snack" | "cold";

export const MACHINE_TYPE_META: Record<
  MachineType,
  { emoji: string; imageSrc: string }
> = {
  coffee: {
    emoji: "\u2615",
    imageSrc: "/images/machines/coffee-machine.webp",
  },
  snack: {
    emoji: "\uD83C\uDF6A",
    imageSrc: "/images/machines/tcn-csc-8c-v49-hero.jpg",
  },
  cold: {
    emoji: "\uD83E\uDDCA",
    imageSrc: "/images/machines/js-001-a01-hero.jpg",
  },
};
