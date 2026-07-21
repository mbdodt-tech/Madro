/**
 * Frida (DTU FCDB) fødevaregruppe → NOVA-klassifikation.
 *
 * Frida er en fødevaresammensætnings-database og bærer ikke selv NOVA, men
 * den grupperer hver vare i én af ~118 fødevaregrupper (`FoodGroupID`). Rå og
 * basale fødevarer (frugt, grønt, kød, fisk, korn) er per definition NOVA 1;
 * ultraforarbejdede Frida-varer (slik, chips, fastfood) er NOVA 4. Vi mapper
 * gruppen — en stabil, revisérbar klassifikation — frem for at gætte på
 * varenavne.
 *
 * NOVA-rammen (Monteiro): 1 = uforarbejdet/minimalt forarbejdet, 2 =
 * forarbejdede kulinariske ingredienser (olie, sukker, salt, smør), 3 =
 * forarbejdede fødevarer, 4 = ultraforarbejdede. Kvalitetsbuen (novaShare)
 * tæller 1-3 som ikke-ultraforarbejdet mod 4.
 *
 * Genuint blandede grupper — hvor gruppen rummer både minimalt forarbejdede
 * og ultraforarbejdede varer (fx syrnede mælkeprodukter: naturel yoghurt vs.
 * sødet frugtyoghurt; vand vs. sodavand) — lades bevidst `null`. Så holder vi
 * måleren ærlig frem for at fejlmærke en hel gruppe. Uden dette straffes de
 * brugere, der spiser mest uforarbejdet, med en tom måler (audit 2026-07-20,
 * DESIGN-1) — men vi undgår også den modsatte løgn, hvor en fastfood-burger
 * tælles som ikke-ultraforarbejdet.
 *
 * Hold i sync med scripts/gen_frida_nova.mjs (backfill-migrationen importerer
 * `fridaNovaGroup` herfra, så de kan ikke drive fra hinanden).
 */
export const FRIDA_GROUP_NOVA: Record<number, 1 | 2 | 3 | 4 | null> = {
  // ---- NOVA 1: uforarbejdet / minimalt forarbejdet ----
  28: 1, // Grain and groats (havregryn m.fl.)
  30: 1, // Flour and bran
  40: 1, // Leaf and stem vegetables
  39: 1, // Root and tuber vegetables
  41: 1, // Fruit-Vegetables
  43: 1, // Mushrooms
  44: 1, // Herbs
  192: 1, // Frozen vegetables
  49: 1, // Pome fruit
  50: 1, // Stone fruit
  51: 1, // Soft fruit
  52: 1, // Tropical or subtropical fruit
  193: 1, // Frozen fruits and berries
  184: 1, // Dried fruit and berry products
  53: 1, // Nuts
  177: 1, // High-fat seeds
  171: 1, // Fresh legumes
  172: 1, // Frozen legumes
  173: 1, // Dried pulses
  58: 1, // Beef
  59: 1, // Veal
  60: 1, // Pork
  61: 1, // Sheep and lamb
  57: 1, // Other meat and fresh meat products
  63: 1, // Game
  66: 1, // Offal and other organs (rå)
  81: 1, // Chicken
  82: 1, // Turkey
  83: 1, // Game birds
  84: 1, // Duck and goose
  70: 1, // Lean fish
  72: 1, // Somewhat oily fish
  73: 1, // Oily fish
  69: 1, // Marine mammals
  76: 1, // Shellfish and their products
  77: 1, // Mollusks and their products
  87: 1, // Fresh eggs
  88: 1, // Liquid egg (pasteuriseret)
  89: 1, // Dried egg
  4: 1, // Unfermented milk products (sødmælk, letmælk …)
  103: 1, // Honey
  120: 1, // Spices
  187: 1, // Seaweed and seaweed products
  117: 1, // Drinking water

  // ---- NOVA 2: forarbejdede kulinariske ingredienser ----
  93: 2, // Animal fats
  94: 2, // Vegetable fats (olier)
  96: 2, // Butter
  102: 2, // Sugar
  121: 2, // Salt
  122: 2, // Yeast and baking powder

  // ---- NOVA 3: forarbejdede fødevarer ----
  31: 3, // Bread
  35: 3, // Pasta
  36: 3, // Starch products
  46: 3, // Canned vegetable products
  55: 3, // Canned fruit products (i lage/sukker)
  174: 3, // Canned legumes
  185: 3, // Marmelade, jelly etc.
  13: 3, // Firm rennet cheese
  15: 3, // Semi-firm rennet cheese
  14: 3, // Soft rennet cheese
  12: 3, // Soft sour milk cheese
  16: 3, // Whey cheese
  8: 3, // Preserved milk and other milk products
  64: 3, // Boiled, smoked, cured or dried meat
  79: 3, // Fish products (røget/marineret/konserves/paneret)
  78: 3, // Offal and fish eggs (konserves/røget dominerer)
  186: 3, // Fruit juice and smoothies
  45: 3, // Vegetable juices
  107: 3, // Coffee, tea and cocoa
  112: 3, // Beer and other malt beverages
  113: 3, // Wines
  194: 3, // Cider
  114: 3, // Liqueur wines (hedvine)
  125: 3, // Vinegar

  // ---- NOVA 4: ultraforarbejdet ----
  32: 4, // Biscuits and cookies
  33: 4, // Cakes
  34: 4, // Breakfast products (cornflakes, frosted …)
  104: 4, // Chocolate etc.
  182: 4, // Candy
  101: 4, // Other sweet products
  143: 4, // Potato chip and snacks
  179: 4, // Pizza
  128: 4, // Ready meals
  131: 4, // Sandwich, burger, hotdog etc. (fastfood)
  21: 4, // Dairy ice cream
  23: 4, // Sorbet and ice lolly
  199: 4, // Plant-based ice cream
  132: 4, // Desserts
  17: 4, // Processed cheese (smelteost)
  95: 4, // Margarines
  65: 4, // Cold cuts (pålægsvarer: salami, spegepølse, leverpostej)
  97: 4, // Mayonnaises, remoulade etc.
  98: 4, // Dressings
  130: 4, // Mayonnaise-Based Salad Spreads
  181: 4, // Condiments (ketchup, pesto, sennep)
  133: 4, // Sauce and powdered sauce
  124: 4, // Bouillon, extracts and the like
  169: 4, // Plant-based alternatives to meat
  168: 4, // Plant-based alternatives to dairy products
  200: 4, // Plant-based mayonnaise, remoulade and sauces
  178: 4, // Nut products (marcipan, nougat, nøddepasta)
  106: 4, // Other beverages (energidrik, iste, læskedrik)
  54: 4, // Berry juices (saft, koncentreret, sødet)
  115: 4, // Liqueurs

  // ---- NULL: bevidst uklassificeret (blandet/tvetydig gruppe) ----
  6: null, // Breast milk and infant formula (modermælk vs. erstatning)
  5: null, // Fermented milk products (naturel vs. frugtyoghurt)
  90: null, // Egg products (kogt æg vs. industri-røræg)
  111: null, // Water and carbonated drinks (vand vs. sodavand)
  116: null, // Spirits (NOVA udefineret for destillat)
  127: null, // Other composite foods
  135: null, // Infant food
  175: null, // Other legume products
  188: null, // Other vegetable products
  183: null, // Other aquatic animal products
  215: null, // Whey and lactose
  189: null, // High-fat seeds products
  191: null, // Prepared legumes
  180: null, // Soup and soup products (hjemmelavet vs. pulver)
};

/**
 * NOVA-gruppe for en Frida-fødevaregruppe. Returnerer `null` for både ukendte
 * og bevidst uklassificerede grupper — kalderen skal behandle `null` som
 * "ingen NOVA" (varen indgår ikke i kvalitetsbuen), aldrig som en score.
 */
export function fridaNovaGroup(
  foodGroupId: number | string | null | undefined,
): 1 | 2 | 3 | 4 | null {
  if (foodGroupId == null || foodGroupId === "") return null;
  const id = Number(foodGroupId);
  if (!Number.isInteger(id)) return null;
  return FRIDA_GROUP_NOVA[id] ?? null;
}
