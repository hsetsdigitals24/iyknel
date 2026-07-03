import {
  Beef,
  Candy,
  Coffee,
  Cookie,
  CookingPot,
  CupSoda,
  Droplet,
  Home,
  Milk,
  Package,
  Soup,
  SprayCan,
  Wheat,
  type LucideIcon,
} from "lucide-react";

// Ordered keyword → icon table. The first keyword found (via substring match)
// on the lowercased category name/slug wins, so put more specific keywords
// before generic ones. Categories are dynamic admin data, so anything that
// doesn't match falls back to a neutral package icon.
const ICON_RULES: ReadonlyArray<readonly [readonly string[], LucideIcon]> = [
  [["oil"], Droplet],
  [["butter", "margarine", "creamer", "dairy", "milk", "cheese"], Milk],
  [["sugar"], Candy],
  [["insecticide", "pest", "spray", "aerosol"], SprayCan],
  [["clean", "deterg", "soap", "toiletr", "wash", "home", "household", "use"], Home],
  [["ball food", "meat", "fish", "protein", "sausage"], Beef],
  [["can", "tin", "tomato", "paste", "sauce", "salt", "seasoning"], Soup],
  [["snack", "biscuit", "cookie", "chocolate", "sweet", "candy"], Cookie],
  [["tea", "coffee"], Coffee],
  [["beverage", "drink", "juice", "water", "soda", "malt"], CupSoda],
  [
    [
      "rice",
      "grain",
      "cereal",
      "flour",
      "yeast",
      "baking",
      "bake",
      "pasta",
      "noodle",
      "wheat",
      "semo",
      "garri",
    ],
    Wheat,
  ],
  [["cook", "pot", "kitchen"], CookingPot],
];

export function categoryIcon(input: {
  name: string;
  slug?: string | null;
}): LucideIcon {
  const haystack = `${input.name} ${input.slug ?? ""}`.toLowerCase();
  for (const [keywords, Icon] of ICON_RULES) {
    if (keywords.some((k) => haystack.includes(k))) return Icon;
  }
  return Package;
}
