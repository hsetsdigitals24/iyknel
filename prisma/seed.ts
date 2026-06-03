import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

// Sheet1 vehicles, in the order they appear in the CSV, with tonnage from row 4.
const VEHICLES = [
  { name: "Korope", tonnageKg: 700, fuelPerKm: "0.250", sortOrder: 1 },
  { name: "Toyota Hiace", tonnageKg: 1500, fuelPerKm: "0.301", sortOrder: 2 },
  { name: "Chevy", tonnageKg: 3000, fuelPerKm: "0.301", sortOrder: 3 },
  { name: "Ford Transit", tonnageKg: 3000, fuelPerKm: "0.301", sortOrder: 4 },
  { name: "Benz Truck", tonnageKg: 7500, fuelPerKm: "0.500", sortOrder: 5 },
] as const;

const BANDS = [
  { label: "2-5km", minKm: 2, maxKm: 5, sortOrder: 1 },
  { label: "6-10km", minKm: 6, maxKm: 10, sortOrder: 2 },
  { label: "11-15km", minKm: 11, maxKm: 15, sortOrder: 3 },
  { label: "15-20km", minKm: 15, maxKm: 20, sortOrder: 4 },
  { label: "25-30km", minKm: 25, maxKm: 30, sortOrder: 5 },
  { label: "35-40km", minKm: 35, maxKm: 40, sortOrder: 6 },
  { label: "40-50km", minKm: 40, maxKm: 50, sortOrder: 7 },
  { label: "50-60km", minKm: 50, maxKm: 60, sortOrder: 8 },
] as const;

// Cost matrix from Sheet1 (naira). Rows = bands (in BANDS order), columns = vehicles (in VEHICLES order).
const COST_MATRIX_NAIRA: number[][] = [
  [879.38, 2117.54, 2823.38, 2823.38, 7175.0],
  [2010.0, 4840.08, 6453.44, 6453.44, 16400.0],
  [3266.25, 7865.13, 10486.84, 10486.84, 26650.0],
  [4396.88, 10587.68, 14116.9, 14116.9, 35875.0],
  [6909.38, 16637.78, 22183.7, 22183.7, 56375.0],
  [9421.88, 22687.88, 30250.5, 30250.5, 76875.0],
  [10678.13, 25712.93, 34283.9, 34283.9, 87125.0],
  [13818.75, 33275.55, 44367.4, 44367.4, 112750.0],
];

const nairaToKobo = (n: number) => Math.round(n * 100);

const CATEGORIES = [
  { slug: "drinks", name: "Drinks & Beverages" },
  { slug: "snacks", name: "Snacks & Confectionery" },
  { slug: "pasta-grains", name: "Pasta, Rice & Grains" },
  { slug: "cooking-essentials", name: "Cooking Essentials" },
  { slug: "dairy-frozen", name: "Dairy & Frozen" },
  { slug: "personal-care", name: "Personal Care" },
  { slug: "household", name: "Household Cleaning" },
  { slug: "baby-care", name: "Baby Care" },
  { slug: "health-wellness", name: "Health & Wellness" },
  { slug: "office-stationery", name: "Office & Stationery" },
] as const;

type ProductSeed = {
  sku: string;
  name: string;
  categorySlug: string;
  priceNaira: number;
  weightGrams: number;
  stock: number;
  imageKeyword: string;
  description: string;
};

// Realistic FMCG products for the Nigerian market. Prices are local-market rough
// estimates for testing only — not authoritative.
const PRODUCTS: ProductSeed[] = [
  // Drinks & Beverages
  { sku: "DRK-COKE-50CL", name: "Coca-Cola 50cl PET", categorySlug: "drinks", priceNaira: 350, weightGrams: 550, stock: 240, imageKeyword: "soft-drink", description: "Classic Coca-Cola in a 50cl PET bottle." },
  { sku: "DRK-PEPSI-60CL", name: "Pepsi 60cl PET", categorySlug: "drinks", priceNaira: 400, weightGrams: 650, stock: 200, imageKeyword: "pepsi", description: "Pepsi Cola 60cl PET bottle." },
  { sku: "DRK-FANTA-50CL", name: "Fanta Orange 50cl", categorySlug: "drinks", priceNaira: 350, weightGrams: 550, stock: 220, imageKeyword: "fanta", description: "Fanta Orange 50cl PET." },
  { sku: "DRK-SPRITE-50CL", name: "Sprite Lemon-Lime 50cl", categorySlug: "drinks", priceNaira: 350, weightGrams: 550, stock: 180, imageKeyword: "sprite", description: "Sprite Lemon-Lime 50cl PET." },
  { sku: "DRK-EVA-75CL", name: "Eva Premium Water 75cl", categorySlug: "drinks", priceNaira: 300, weightGrams: 800, stock: 500, imageKeyword: "water-bottle", description: "Eva Premium table water 75cl." },
  { sku: "DRK-AQUA-50CL", name: "Aquafina Table Water 50cl", categorySlug: "drinks", priceNaira: 200, weightGrams: 550, stock: 600, imageKeyword: "water", description: "Aquafina table water 50cl." },
  { sku: "DRK-5ALIVE-1L", name: "Five Alive Citrus Burst 1L", categorySlug: "drinks", priceNaira: 1200, weightGrams: 1100, stock: 120, imageKeyword: "juice", description: "Five Alive Citrus Burst fruit juice 1L." },
  { sku: "DRK-CHIVITA-1L", name: "Chivita 100% Orange Juice 1L", categorySlug: "drinks", priceNaira: 1500, weightGrams: 1100, stock: 100, imageKeyword: "orange-juice", description: "Chivita 100% pure orange juice 1L." },
  { sku: "DRK-HOLLY-1L", name: "Hollandia Yoghurt Drink 1L", categorySlug: "drinks", priceNaira: 2200, weightGrams: 1100, stock: 80, imageKeyword: "yogurt-drink", description: "Hollandia ready-to-drink yoghurt 1L." },
  { sku: "DRK-MALT-33CL", name: "Maltina Original 33cl Can", categorySlug: "drinks", priceNaira: 450, weightGrams: 360, stock: 240, imageKeyword: "malt", description: "Maltina malt drink 33cl can." },
  { sku: "DRK-AMSTEL-33CL", name: "Amstel Malta 33cl Can", categorySlug: "drinks", priceNaira: 450, weightGrams: 360, stock: 200, imageKeyword: "malt-drink", description: "Amstel Malta non-alcoholic malt 33cl." },
  { sku: "DRK-LUCO-50CL", name: "Lucozade Boost 50cl", categorySlug: "drinks", priceNaira: 700, weightGrams: 550, stock: 160, imageKeyword: "energy-drink", description: "Lucozade Boost energy drink 50cl." },
  { sku: "DRK-REDBULL-25CL", name: "Red Bull Energy Drink 25cl", categorySlug: "drinks", priceNaira: 1500, weightGrams: 270, stock: 96, imageKeyword: "red-bull", description: "Red Bull energy drink 25cl can." },
  { sku: "DRK-NESCAFE-STICK", name: "Nescafé 3-in-1 Stick (20s)", categorySlug: "drinks", priceNaira: 2800, weightGrams: 360, stock: 80, imageKeyword: "coffee", description: "Nescafé 3-in-1 instant coffee, 20 sticks." },
  { sku: "DRK-LIPTON-50", name: "Lipton Yellow Label Tea 50pk", categorySlug: "drinks", priceNaira: 1800, weightGrams: 130, stock: 90, imageKeyword: "tea", description: "Lipton Yellow Label black tea, 50 bags." },

  // Snacks & Confectionery
  { sku: "SNK-CABIN-60", name: "Cabin Biscuit 60g", categorySlug: "snacks", priceNaira: 150, weightGrams: 60, stock: 400, imageKeyword: "biscuit", description: "Classic Cabin biscuit single pack." },
  { sku: "SNK-MCVITIE-250", name: "McVitie's Digestive 250g", categorySlug: "snacks", priceNaira: 1800, weightGrams: 260, stock: 90, imageKeyword: "digestive-biscuit", description: "McVitie's Digestive biscuits 250g." },
  { sku: "SNK-PRINGLES-165", name: "Pringles Original 165g", categorySlug: "snacks", priceNaira: 2500, weightGrams: 200, stock: 120, imageKeyword: "pringles", description: "Pringles Original potato crisps 165g." },
  { sku: "SNK-DORITOS-150", name: "Doritos Nacho Cheese 150g", categorySlug: "snacks", priceNaira: 2200, weightGrams: 160, stock: 80, imageKeyword: "doritos", description: "Doritos Nacho Cheese tortilla chips 150g." },
  { sku: "SNK-GALA-50", name: "Gala Sausage Roll 50g", categorySlug: "snacks", priceNaira: 150, weightGrams: 55, stock: 500, imageKeyword: "sausage-roll", description: "UAC Gala sausage roll, single pack." },
  { sku: "SNK-BELOXXI-96", name: "Beloxxi Cream Cracker 96g", categorySlug: "snacks", priceNaira: 250, weightGrams: 100, stock: 300, imageKeyword: "cracker", description: "Beloxxi cream cracker family pack 96g." },
  { sku: "SNK-OKCRK-100", name: "OK Cabin Crackers 100g", categorySlug: "snacks", priceNaira: 200, weightGrams: 105, stock: 280, imageKeyword: "crackers", description: "OK Cabin crackers single pack 100g." },
  { sku: "SNK-TWIX-50", name: "Twix Chocolate 50g", categorySlug: "snacks", priceNaira: 600, weightGrams: 55, stock: 150, imageKeyword: "chocolate-bar", description: "Twix caramel chocolate bar 50g." },
  { sku: "SNK-SNICK-50", name: "Snickers Bar 50g", categorySlug: "snacks", priceNaira: 600, weightGrams: 55, stock: 150, imageKeyword: "snickers", description: "Snickers peanut chocolate bar 50g." },
  { sku: "SNK-KITKAT-4F", name: "KitKat 4-Finger 45g", categorySlug: "snacks", priceNaira: 700, weightGrams: 50, stock: 130, imageKeyword: "kitkat", description: "KitKat 4-finger milk chocolate." },
  { sku: "SNK-TOMTOM-100", name: "Tom Tom Strong Mint (100s)", categorySlug: "snacks", priceNaira: 1500, weightGrams: 320, stock: 60, imageKeyword: "mint", description: "Cadbury Tom Tom Strong Mint, jar of 100." },
  { sku: "SNK-TREBOR-50", name: "Trebor Peppermint (50s)", categorySlug: "snacks", priceNaira: 900, weightGrams: 150, stock: 70, imageKeyword: "mints", description: "Trebor peppermint candy, 50 pieces." },
  { sku: "SNK-BOURNV-50", name: "Cadbury Bournvita Chocolate 50g", categorySlug: "snacks", priceNaira: 500, weightGrams: 55, stock: 140, imageKeyword: "chocolate", description: "Cadbury Bournvita chocolate bar 50g." },
  { sku: "SNK-GOODY-50", name: "Goody Goody Lollipop (50s)", categorySlug: "snacks", priceNaira: 1200, weightGrams: 500, stock: 80, imageKeyword: "lollipop", description: "Goody Goody mixed-flavour lollipops, 50 pcs." },
  { sku: "SNK-PCHIPS-100", name: "Plantain Chips 100g", categorySlug: "snacks", priceNaira: 400, weightGrams: 110, stock: 220, imageKeyword: "plantain-chips", description: "Crispy fried plantain chips 100g." },

  // Pasta, Rice & Grains
  { sku: "GRN-MAMA-5KG", name: "Mama Gold Rice 5kg", categorySlug: "pasta-grains", priceNaira: 9500, weightGrams: 5050, stock: 60, imageKeyword: "rice", description: "Mama Gold long-grain rice 5kg." },
  { sku: "GRN-RSTAL-10KG", name: "Royal Stallion Rice 10kg", categorySlug: "pasta-grains", priceNaira: 18500, weightGrams: 10100, stock: 40, imageKeyword: "rice-bag", description: "Royal Stallion parboiled rice 10kg bag." },
  { sku: "GRN-CAPRICE-5KG", name: "Caprice Rice 5kg", categorySlug: "pasta-grains", priceNaira: 9200, weightGrams: 5050, stock: 55, imageKeyword: "long-grain-rice", description: "Caprice premium long-grain rice 5kg." },
  { sku: "GRN-GPENNY-500", name: "Golden Penny Spaghetti 500g", categorySlug: "pasta-grains", priceNaira: 700, weightGrams: 510, stock: 220, imageKeyword: "spaghetti", description: "Golden Penny durum wheat spaghetti 500g." },
  { sku: "GRN-DANG-500", name: "Dangote Spaghetti 500g", categorySlug: "pasta-grains", priceNaira: 650, weightGrams: 510, stock: 240, imageKeyword: "pasta", description: "Dangote spaghetti 500g." },
  { sku: "GRN-POWER-500", name: "Power Pasta Macaroni 500g", categorySlug: "pasta-grains", priceNaira: 700, weightGrams: 510, stock: 200, imageKeyword: "macaroni", description: "Power Pasta elbow macaroni 500g." },
  { sku: "GRN-INDC-70", name: "Indomie Chicken Noodles 70g", categorySlug: "pasta-grains", priceNaira: 200, weightGrams: 75, stock: 600, imageKeyword: "noodles", description: "Indomie chicken-flavour instant noodles 70g." },
  { sku: "GRN-INDO-70", name: "Indomie Onion Noodles 70g", categorySlug: "pasta-grains", priceNaira: 200, weightGrams: 75, stock: 500, imageKeyword: "instant-noodles", description: "Indomie onion-flavour instant noodles 70g." },
  { sku: "GRN-HONEY-70", name: "Honeywell Wheat Noodles 70g", categorySlug: "pasta-grains", priceNaira: 220, weightGrams: 75, stock: 400, imageKeyword: "ramen", description: "Honeywell instant wheat noodles 70g." },
  { sku: "GRN-HBEANS-5KG", name: "Honey Beans (Drum) 5kg", categorySlug: "pasta-grains", priceNaira: 8500, weightGrams: 5050, stock: 40, imageKeyword: "beans", description: "Cleaned and sorted honey beans 5kg." },
  { sku: "GRN-OLOYIN-5KG", name: "Oloyin Beans 5kg", categorySlug: "pasta-grains", priceNaira: 8200, weightGrams: 5050, stock: 40, imageKeyword: "brown-beans", description: "Oloyin sweet beans 5kg." },
  { sku: "GRN-GARRI-5KG", name: "Ijebu Garri 5kg", categorySlug: "pasta-grains", priceNaira: 4500, weightGrams: 5050, stock: 70, imageKeyword: "garri", description: "Sour Ijebu garri 5kg." },
  { sku: "GRN-ELUBO-2KG", name: "Yam Flour (Elubo) 2kg", categorySlug: "pasta-grains", priceNaira: 3500, weightGrams: 2050, stock: 80, imageKeyword: "yam-flour", description: "Sieved yam flour for amala 2kg." },
  { sku: "GRN-SEMO-2KG", name: "Golden Penny Semovita 2kg", categorySlug: "pasta-grains", priceNaira: 2400, weightGrams: 2050, stock: 110, imageKeyword: "flour", description: "Golden Penny Semovita 2kg." },
  { sku: "GRN-OATS-500", name: "Quaker Oats 500g", categorySlug: "pasta-grains", priceNaira: 2200, weightGrams: 510, stock: 130, imageKeyword: "oats", description: "Quaker rolled oats 500g." },

  // Cooking Essentials
  { sku: "CKN-POWER-3L", name: "Power Oil 3L", categorySlug: "cooking-essentials", priceNaira: 7500, weightGrams: 2800, stock: 80, imageKeyword: "cooking-oil", description: "Power vegetable cooking oil 3L." },
  { sku: "CKN-KINGS-5L", name: "Kings Vegetable Oil 5L", categorySlug: "cooking-essentials", priceNaira: 12500, weightGrams: 4700, stock: 50, imageKeyword: "vegetable-oil", description: "Kings cholesterol-free vegetable oil 5L." },
  { sku: "CKN-MAMA-3L", name: "Mamador Vegetable Oil 3L", categorySlug: "cooking-essentials", priceNaira: 7800, weightGrams: 2800, stock: 70, imageKeyword: "oil", description: "Mamador soya bean cooking oil 3L." },
  { sku: "CKN-PALM-4L", name: "Pure Palm Oil 4L", categorySlug: "cooking-essentials", priceNaira: 9500, weightGrams: 3800, stock: 45, imageKeyword: "palm-oil", description: "Unrefined natural palm oil 4L." },
  { sku: "CKN-SALT-500", name: "Mr Chef Iodised Salt 500g", categorySlug: "cooking-essentials", priceNaira: 250, weightGrams: 510, stock: 400, imageKeyword: "salt", description: "Mr Chef refined iodised table salt 500g." },
  { sku: "CKN-SUG-1KG", name: "Dangote Sugar 1kg", categorySlug: "cooking-essentials", priceNaira: 1500, weightGrams: 1050, stock: 200, imageKeyword: "sugar", description: "Dangote refined granulated sugar 1kg." },
  { sku: "CKN-STLOUIS-500", name: "St Louis Sugar Cubes 500g", categorySlug: "cooking-essentials", priceNaira: 1100, weightGrams: 520, stock: 140, imageKeyword: "sugar-cubes", description: "St Louis pressed sugar cubes 500g." },
  { sku: "CKN-MAGGI-100", name: "Maggi Star Cubes (100s)", categorySlug: "cooking-essentials", priceNaira: 1500, weightGrams: 400, stock: 180, imageKeyword: "bouillon", description: "Maggi star seasoning cubes, jar of 100." },
  { sku: "CKN-KNORR-50", name: "Knorr Chicken Cubes (50s)", categorySlug: "cooking-essentials", priceNaira: 1200, weightGrams: 200, stock: 170, imageKeyword: "seasoning", description: "Knorr chicken-flavour seasoning cubes, 50 pcs." },
  { sku: "CKN-ROYCO-50", name: "Royco Beef Cubes (50s)", categorySlug: "cooking-essentials", priceNaira: 1100, weightGrams: 200, stock: 160, imageKeyword: "seasoning-cube", description: "Royco beef-flavour seasoning cubes, 50 pcs." },
  { sku: "CKN-CURRY-100", name: "Tropical Sun Curry Powder 100g", categorySlug: "cooking-essentials", priceNaira: 700, weightGrams: 110, stock: 220, imageKeyword: "curry", description: "Tropical Sun mild curry powder 100g." },
  { sku: "CKN-THYME-100", name: "Tropical Sun Thyme 100g", categorySlug: "cooking-essentials", priceNaira: 700, weightGrams: 110, stock: 220, imageKeyword: "thyme", description: "Tropical Sun dried thyme leaves 100g." },
  { sku: "CKN-PEPPER-100", name: "Black Pepper Ground 100g", categorySlug: "cooking-essentials", priceNaira: 900, weightGrams: 110, stock: 200, imageKeyword: "black-pepper", description: "Ground black pepper 100g." },
  { sku: "CKN-GINO-70", name: "Gino Tomato Paste 70g", categorySlug: "cooking-essentials", priceNaira: 250, weightGrams: 75, stock: 500, imageKeyword: "tomato-paste", description: "Gino tomato paste sachet 70g." },
  { sku: "CKN-HONEY-500", name: "Pure Honey 500ml", categorySlug: "cooking-essentials", priceNaira: 3500, weightGrams: 720, stock: 90, imageKeyword: "honey", description: "Pure natural honey 500ml jar." },

  // Dairy & Frozen
  { sku: "DRY-PEAK-400", name: "Peak Milk Powder 400g", categorySlug: "dairy-frozen", priceNaira: 4500, weightGrams: 420, stock: 130, imageKeyword: "milk", description: "Peak instant full-cream milk powder 400g." },
  { sku: "DRY-3CR-400", name: "Three Crowns Milk Powder 400g", categorySlug: "dairy-frozen", priceNaira: 4200, weightGrams: 420, stock: 120, imageKeyword: "powdered-milk", description: "Three Crowns filled milk powder 400g." },
  { sku: "DRY-COW-360", name: "Cowbell Milk Powder 360g", categorySlug: "dairy-frozen", priceNaira: 3500, weightGrams: 380, stock: 140, imageKeyword: "milk-powder", description: "Cowbell instant filled milk powder 360g." },
  { sku: "DRY-HEVAP-170", name: "Hollandia Evaporated Milk 170ml", categorySlug: "dairy-frozen", priceNaira: 500, weightGrams: 200, stock: 300, imageKeyword: "evaporated-milk", description: "Hollandia evaporated milk 170ml." },
  { sku: "DRY-PEVAP-170", name: "Peak Evaporated Milk Tin 170ml", categorySlug: "dairy-frozen", priceNaira: 550, weightGrams: 200, stock: 280, imageKeyword: "milk-can", description: "Peak evaporated milk tin 170ml." },
  { sku: "DRY-DANO-400", name: "Dano Milk Powder Tin 400g", categorySlug: "dairy-frozen", priceNaira: 4800, weightGrams: 420, stock: 110, imageKeyword: "dairy", description: "Dano cool-cow milk powder 400g tin." },
  { sku: "DRY-HYOG-500", name: "Hollandia Yoghurt 500ml", categorySlug: "dairy-frozen", priceNaira: 1500, weightGrams: 550, stock: 100, imageKeyword: "yogurt", description: "Hollandia strawberry yoghurt 500ml." },
  { sku: "DRY-FANYO-100", name: "FanYogo Yoghurt 100ml", categorySlug: "dairy-frozen", priceNaira: 300, weightGrams: 110, stock: 400, imageKeyword: "yoghurt-cup", description: "FanYogo drinkable yoghurt 100ml." },
  { sku: "DRY-FFGR-1L", name: "Farm Fresh Greek Yoghurt 1L", categorySlug: "dairy-frozen", priceNaira: 3500, weightGrams: 1100, stock: 60, imageKeyword: "greek-yogurt", description: "Farm Fresh Greek-style yoghurt 1L." },
  { sku: "DRY-BBAND-250", name: "Blue Band Margarine 250g", categorySlug: "dairy-frozen", priceNaira: 1500, weightGrams: 260, stock: 130, imageKeyword: "margarine", description: "Blue Band spread for bread 250g." },
  { sku: "DRY-CHEESE-200", name: "Cheese Slices 200g", categorySlug: "dairy-frozen", priceNaira: 2800, weightGrams: 210, stock: 80, imageKeyword: "cheese", description: "Processed cheese slices 200g." },
  { sku: "DRY-FANICE-1L", name: "FanIce Vanilla Ice Cream 1L", categorySlug: "dairy-frozen", priceNaira: 2200, weightGrams: 1100, stock: 70, imageKeyword: "ice-cream", description: "FanIce vanilla ice cream tub 1L." },
  { sku: "DRY-CHKW-1KG", name: "Frozen Chicken Wings 1kg", categorySlug: "dairy-frozen", priceNaira: 4500, weightGrams: 1050, stock: 60, imageKeyword: "chicken-wings", description: "Bulk frozen chicken wings 1kg." },
  { sku: "DRY-TITUS-1KG", name: "Frozen Titus Fish 1kg", categorySlug: "dairy-frozen", priceNaira: 5500, weightGrams: 1050, stock: 50, imageKeyword: "frozen-fish", description: "Frozen Titus (mackerel) fish 1kg." },
  { sku: "DRY-ANCH-250", name: "Anchor Butter 250g", categorySlug: "dairy-frozen", priceNaira: 3200, weightGrams: 260, stock: 70, imageKeyword: "butter", description: "Anchor pure dairy butter 250g." },

  // Personal Care
  { sku: "PC-DOVE-100", name: "Dove Soap Bar 100g", categorySlug: "personal-care", priceNaira: 800, weightGrams: 110, stock: 300, imageKeyword: "soap", description: "Dove moisturising beauty bar 100g." },
  { sku: "PC-LUX-175", name: "Lux Soap 175g", categorySlug: "personal-care", priceNaira: 700, weightGrams: 185, stock: 280, imageKeyword: "soap-bar", description: "Lux soft-touch beauty soap 175g." },
  { sku: "PC-JOY-250", name: "Joy Antiseptic Soap 250g", categorySlug: "personal-care", priceNaira: 900, weightGrams: 260, stock: 260, imageKeyword: "antiseptic-soap", description: "Joy antibacterial soap 250g." },
  { sku: "PC-DETT-175", name: "Dettol Soap 175g", categorySlug: "personal-care", priceNaira: 900, weightGrams: 185, stock: 260, imageKeyword: "hygiene-soap", description: "Dettol original antibacterial soap 175g." },
  { sku: "PC-CLOSE-140", name: "Close-Up Toothpaste 140g", categorySlug: "personal-care", priceNaira: 1200, weightGrams: 160, stock: 200, imageKeyword: "toothpaste", description: "Close-Up Red Hot toothpaste 140g." },
  { sku: "PC-ORALB-100", name: "Oral-B Toothpaste 100g", categorySlug: "personal-care", priceNaira: 1500, weightGrams: 120, stock: 180, imageKeyword: "toothpaste-tube", description: "Oral-B Pro-Health toothpaste 100g." },
  { sku: "PC-PEPSO-140", name: "Pepsodent Cavity Fighter 140g", categorySlug: "personal-care", priceNaira: 1100, weightGrams: 160, stock: 200, imageKeyword: "dental", description: "Pepsodent cavity-fighter toothpaste 140g." },
  { sku: "PC-ORALB-BR4", name: "Oral-B Toothbrush 4-pack", categorySlug: "personal-care", priceNaira: 2200, weightGrams: 120, stock: 140, imageKeyword: "toothbrush", description: "Oral-B medium toothbrush, 4-pack." },
  { sku: "PC-SUNS-400", name: "Sunsilk Shampoo 400ml", categorySlug: "personal-care", priceNaira: 2800, weightGrams: 450, stock: 130, imageKeyword: "shampoo", description: "Sunsilk soft & smooth shampoo 400ml." },
  { sku: "PC-PANT-400", name: "Pantene Shampoo 400ml", categorySlug: "personal-care", priceNaira: 3500, weightGrams: 450, stock: 110, imageKeyword: "shampoo-bottle", description: "Pantene Pro-V smooth & sleek shampoo 400ml." },
  { sku: "PC-VAS-400", name: "Vaseline Body Lotion 400ml", categorySlug: "personal-care", priceNaira: 3200, weightGrams: 450, stock: 130, imageKeyword: "lotion", description: "Vaseline intensive care body lotion 400ml." },
  { sku: "PC-NIV-400", name: "Nivea Body Lotion 400ml", categorySlug: "personal-care", priceNaira: 3500, weightGrams: 450, stock: 120, imageKeyword: "body-lotion", description: "Nivea nourishing body lotion 400ml." },
  { sku: "PC-REX-ROLL", name: "Rexona Deodorant Roll-on 50ml", categorySlug: "personal-care", priceNaira: 1800, weightGrams: 80, stock: 160, imageKeyword: "deodorant", description: "Rexona Men 48h roll-on deodorant 50ml." },
  { sku: "PC-ALW-10", name: "Always Ultra Sanitary Pads (10s)", categorySlug: "personal-care", priceNaira: 1500, weightGrams: 180, stock: 200, imageKeyword: "sanitary-pad", description: "Always Ultra Normal sanitary pads, 10 pcs." },
  { sku: "PC-GILL-5", name: "Gillette Razor Disposable (5pk)", categorySlug: "personal-care", priceNaira: 2500, weightGrams: 60, stock: 140, imageKeyword: "razor", description: "Gillette Blue II disposable razor, 5-pack." },

  // Household Cleaning
  { sku: "HH-OMO-900", name: "Omo Detergent 900g", categorySlug: "household", priceNaira: 2200, weightGrams: 920, stock: 160, imageKeyword: "detergent", description: "Omo Multi-Active detergent powder 900g." },
  { sku: "HH-ARIEL-1KG", name: "Ariel Detergent 1kg", categorySlug: "household", priceNaira: 2800, weightGrams: 1020, stock: 130, imageKeyword: "laundry-detergent", description: "Ariel concentrated detergent powder 1kg." },
  { sku: "HH-SUNL-800", name: "Sunlight Detergent 800g", categorySlug: "household", priceNaira: 1800, weightGrams: 820, stock: 150, imageKeyword: "washing-powder", description: "Sunlight 2-in-1 detergent 800g." },
  { sku: "HH-HYPO-1L", name: "Hypo Bleach 1L", categorySlug: "household", priceNaira: 900, weightGrams: 1100, stock: 200, imageKeyword: "bleach", description: "Hypo all-purpose bleach 1L." },
  { sku: "HH-JIK-750", name: "JIK Bleach 750ml", categorySlug: "household", priceNaira: 850, weightGrams: 850, stock: 220, imageKeyword: "disinfectant", description: "JIK regular thick bleach 750ml." },
  { sku: "HH-HARP-500", name: "Harpic Toilet Cleaner 500ml", categorySlug: "household", priceNaira: 1500, weightGrams: 550, stock: 160, imageKeyword: "toilet-cleaner", description: "Harpic Power Plus toilet bowl cleaner 500ml." },
  { sku: "HH-MRMUS-500", name: "Mr Muscle Glass Cleaner 500ml", categorySlug: "household", priceNaira: 1700, weightGrams: 550, stock: 130, imageKeyword: "cleaning-spray", description: "Mr Muscle streak-free glass cleaner 500ml." },
  { sku: "HH-MORN-500", name: "Morning Fresh Dish Soap 500ml", categorySlug: "household", priceNaira: 1200, weightGrams: 550, stock: 180, imageKeyword: "dish-soap", description: "Morning Fresh dishwashing liquid 500ml." },
  { sku: "HH-MAMA-750", name: "Mama Lemon Dishwash 750ml", categorySlug: "household", priceNaira: 1400, weightGrams: 800, stock: 160, imageKeyword: "dishwashing", description: "Mama Lemon dishwashing liquid 750ml." },
  { sku: "HH-PREM-10", name: "Premier Tissue Roll (10pk)", categorySlug: "household", priceNaira: 2500, weightGrams: 1400, stock: 130, imageKeyword: "toilet-paper", description: "Premier soft toilet tissue, 10-roll pack." },
  { sku: "HH-ROSE-6", name: "Rose Toilet Tissue (6pk)", categorySlug: "household", priceNaira: 1600, weightGrams: 900, stock: 160, imageKeyword: "tissue", description: "Rose 2-ply toilet tissue, 6-roll pack." },
  { sku: "HH-SBRITE-5", name: "Scotch-Brite Sponge (5pk)", categorySlug: "household", priceNaira: 900, weightGrams: 120, stock: 240, imageKeyword: "sponge", description: "Scotch-Brite scouring sponge, 5-pack." },
  { sku: "HH-MORT-600", name: "Mortein Insecticide 600ml", categorySlug: "household", priceNaira: 2500, weightGrams: 700, stock: 130, imageKeyword: "insecticide", description: "Mortein PowerGard mosquito & fly spray 600ml." },
  { sku: "HH-AIRW-300", name: "Air Wick Freshener 300ml", categorySlug: "household", priceNaira: 1800, weightGrams: 360, stock: 130, imageKeyword: "air-freshener", description: "Air Wick lavender room freshener 300ml." },
  { sku: "HH-TRASH-50", name: "Bin Liners / Trash Bag (50s)", categorySlug: "household", priceNaira: 1500, weightGrams: 400, stock: 180, imageKeyword: "trash-bag", description: "Heavy-duty bin liners, 50 pieces." },

  // Baby Care
  { sku: "BB-PAMP-MINI", name: "Pampers Mini Diaper (50s)", categorySlug: "baby-care", priceNaira: 6500, weightGrams: 1300, stock: 90, imageKeyword: "diaper", description: "Pampers Active Baby Mini diapers, 50 pcs." },
  { sku: "BB-PAMP-MED", name: "Pampers Medium Diaper (40s)", categorySlug: "baby-care", priceNaira: 7500, weightGrams: 1500, stock: 80, imageKeyword: "diapers", description: "Pampers Active Baby Medium diapers, 40 pcs." },
  { sku: "BB-HUGG-LG", name: "Huggies Large Diaper (32s)", categorySlug: "baby-care", priceNaira: 8500, weightGrams: 1500, stock: 60, imageKeyword: "baby-diaper", description: "Huggies Dry Comfort Large diapers, 32 pcs." },
  { sku: "BB-MOLF-NB", name: "Molfix Newborn Diaper (28s)", categorySlug: "baby-care", priceNaira: 4500, weightGrams: 700, stock: 110, imageKeyword: "newborn-diaper", description: "Molfix newborn diapers, 28 pcs." },
  { sku: "BB-WIPES-64", name: "Pampers Baby Wipes (64s)", categorySlug: "baby-care", priceNaira: 2200, weightGrams: 700, stock: 140, imageKeyword: "baby-wipes", description: "Pampers Sensitive baby wipes, 64 pcs." },
  { sku: "BB-CUSS-200", name: "Cussons Baby Powder 200g", categorySlug: "baby-care", priceNaira: 1500, weightGrams: 230, stock: 160, imageKeyword: "baby-powder", description: "Cussons Baby mild & gentle powder 200g." },
  { sku: "BB-JOHN-200", name: "Johnson's Baby Powder 200g", categorySlug: "baby-care", priceNaira: 1800, weightGrams: 230, stock: 150, imageKeyword: "baby-care", description: "Johnson's Baby Powder 200g." },
  { sku: "BB-JOIL-200", name: "Johnson's Baby Oil 200ml", categorySlug: "baby-care", priceNaira: 2000, weightGrams: 240, stock: 140, imageKeyword: "baby-oil", description: "Johnson's Baby Oil with vitamin E 200ml." },
  { sku: "BB-JSHM-200", name: "Johnson's Baby Shampoo 200ml", categorySlug: "baby-care", priceNaira: 1800, weightGrams: 240, stock: 140, imageKeyword: "baby-shampoo", description: "Johnson's No More Tears baby shampoo 200ml." },
  { sku: "BB-CUSL-200", name: "Cussons Baby Lotion 200ml", categorySlug: "baby-care", priceNaira: 1500, weightGrams: 240, stock: 140, imageKeyword: "baby-lotion", description: "Cussons Baby soft & smooth lotion 200ml." },
  { sku: "BB-CER-400", name: "Cerelac Wheat 400g", categorySlug: "baby-care", priceNaira: 3800, weightGrams: 420, stock: 100, imageKeyword: "baby-food", description: "Nestlé Cerelac wheat infant cereal 400g." },
  { sku: "BB-SMA-400", name: "SMA Gold Infant Formula 400g", categorySlug: "baby-care", priceNaira: 6500, weightGrams: 430, stock: 70, imageKeyword: "infant-formula", description: "SMA Gold infant formula stage 1, 400g." },
  { sku: "BB-NAN-400", name: "NAN Optipro 1 Formula 400g", categorySlug: "baby-care", priceNaira: 7500, weightGrams: 430, stock: 65, imageKeyword: "baby-formula", description: "Nestlé NAN Optipro 1 starter formula 400g." },
  { sku: "BB-HEINZ-250", name: "Heinz Baby Cereal 250g", categorySlug: "baby-care", priceNaira: 3200, weightGrams: 270, stock: 90, imageKeyword: "baby-cereal", description: "Heinz multigrain baby cereal 250g." },
  { sku: "BB-AVENT-250", name: "Avent Baby Bottle 250ml", categorySlug: "baby-care", priceNaira: 5500, weightGrams: 220, stock: 70, imageKeyword: "baby-bottle", description: "Philips Avent natural baby bottle 250ml." },

  // Health & Wellness
  { sku: "HW-PAN-100", name: "Panadol Extra (100 tabs)", categorySlug: "health-wellness", priceNaira: 3500, weightGrams: 100, stock: 200, imageKeyword: "painkiller", description: "Panadol Extra tablets, pack of 100." },
  { sku: "HW-PARA-100", name: "Paracetamol 500mg (100 tabs)", categorySlug: "health-wellness", priceNaira: 1200, weightGrams: 100, stock: 280, imageKeyword: "paracetamol", description: "Paracetamol 500mg tablets, pack of 100." },
  { sku: "HW-IBU-100", name: "Ibuprofen 200mg (100 tabs)", categorySlug: "health-wellness", priceNaira: 1800, weightGrams: 110, stock: 220, imageKeyword: "ibuprofen", description: "Ibuprofen 200mg tablets, pack of 100." },
  { sku: "HW-EMVC-100", name: "Emzor Vitamin C 100mg (100 tabs)", categorySlug: "health-wellness", priceNaira: 1500, weightGrams: 110, stock: 230, imageKeyword: "vitamin-c", description: "Emzor Vitamin C chewable tablets, 100 pcs." },
  { sku: "HW-AST-30", name: "Astymin Multivitamin (30 caps)", categorySlug: "health-wellness", priceNaira: 2500, weightGrams: 60, stock: 180, imageKeyword: "multivitamin", description: "Astymin adult multivitamin capsules, 30 pcs." },
  { sku: "HW-CENT-30", name: "Centrum Adult Multivitamin (30 tabs)", categorySlug: "health-wellness", priceNaira: 6500, weightGrams: 90, stock: 90, imageKeyword: "vitamins", description: "Centrum complete adult multivitamin, 30 tabs." },
  { sku: "HW-EYE-15", name: "Eye Mo Eye Drops 15ml", categorySlug: "health-wellness", priceNaira: 1800, weightGrams: 30, stock: 160, imageKeyword: "eye-drops", description: "Eye Mo redness-relief eye drops 15ml." },
  { sku: "HW-ROBB-25", name: "Robb Ointment 25g", categorySlug: "health-wellness", priceNaira: 800, weightGrams: 35, stock: 220, imageKeyword: "ointment", description: "Robb medicated ointment 25g." },
  { sku: "HW-ABO-25", name: "Aboniki Balm 25g", categorySlug: "health-wellness", priceNaira: 700, weightGrams: 35, stock: 220, imageKeyword: "balm", description: "Aboniki herbal balm 25g." },
  { sku: "HW-SAN-500", name: "Hand Sanitizer 500ml", categorySlug: "health-wellness", priceNaira: 1800, weightGrams: 550, stock: 180, imageKeyword: "sanitizer", description: "70% alcohol hand sanitizer gel 500ml." },
  { sku: "HW-PLAS-100", name: "Adhesive Plaster (100s)", categorySlug: "health-wellness", priceNaira: 1500, weightGrams: 120, stock: 200, imageKeyword: "bandage", description: "Assorted adhesive plasters, 100 pcs." },
  { sku: "HW-COT-50", name: "Cotton Wool 50g", categorySlug: "health-wellness", priceNaira: 600, weightGrams: 55, stock: 240, imageKeyword: "cotton", description: "Sterile absorbent cotton wool 50g." },
  { sku: "HW-MASK-50", name: "Surgical Face Mask (50s)", categorySlug: "health-wellness", priceNaira: 1500, weightGrams: 200, stock: 200, imageKeyword: "face-mask", description: "3-ply disposable face masks, 50 pcs." },
  { sku: "HW-THERM-DIG", name: "Digital Thermometer", categorySlug: "health-wellness", priceNaira: 3500, weightGrams: 100, stock: 60, imageKeyword: "thermometer", description: "Digital oral/underarm thermometer." },
  { sku: "HW-BP-MON", name: "Blood Pressure Monitor (Arm)", categorySlug: "health-wellness", priceNaira: 22000, weightGrams: 600, stock: 25, imageKeyword: "blood-pressure", description: "Automatic upper-arm blood-pressure monitor." },

  // Office & Stationery
  { sku: "OFF-BIC-50", name: "Bic Cristal Pen Blue (50pk)", categorySlug: "office-stationery", priceNaira: 4500, weightGrams: 300, stock: 100, imageKeyword: "pen", description: "Bic Cristal Original blue ballpoint pen, 50-pack." },
  { sku: "OFF-ELZ-50", name: "Eleganza Pen Black (50pk)", categorySlug: "office-stationery", priceNaira: 3500, weightGrams: 300, stock: 110, imageKeyword: "ballpoint-pen", description: "Eleganza black ballpoint pen, 50-pack." },
  { sku: "OFF-PIL-PERM", name: "Pilot Permanent Marker", categorySlug: "office-stationery", priceNaira: 700, weightGrams: 40, stock: 220, imageKeyword: "marker", description: "Pilot SCA-100 permanent black marker." },
  { sku: "OFF-HIL-4", name: "Highlighter Set (4pk)", categorySlug: "office-stationery", priceNaira: 1500, weightGrams: 90, stock: 160, imageKeyword: "highlighter", description: "Assorted neon highlighters, 4-pack." },
  { sku: "OFF-A4-500", name: "A4 Photocopy Paper (500 sheets)", categorySlug: "office-stationery", priceNaira: 6500, weightGrams: 2500, stock: 70, imageKeyword: "paper", description: "80gsm A4 white photocopy paper, 500 sheets." },
  { sku: "OFF-EXM-80", name: "Exam Notebook 80 leaves", categorySlug: "office-stationery", priceNaira: 600, weightGrams: 250, stock: 240, imageKeyword: "notebook", description: "A4 exam notebook, 80 leaves." },
  { sku: "OFF-COM-200", name: "Composition Book 200 pages", categorySlug: "office-stationery", priceNaira: 1200, weightGrams: 500, stock: 180, imageKeyword: "note-book", description: "Hardcover composition book, 200 pages." },
  { sku: "OFF-STA-STD", name: "Kangaro Stapler Standard", categorySlug: "office-stationery", priceNaira: 2200, weightGrams: 250, stock: 120, imageKeyword: "stapler", description: "Kangaro HD-10D standard stapler." },
  { sku: "OFF-STP-5K", name: "Stapler Pins No.10 (5000s)", categorySlug: "office-stationery", priceNaira: 1200, weightGrams: 250, stock: 200, imageKeyword: "staples", description: "Stapler pins No.10, box of 5000." },
  { sku: "OFF-CLIP-100", name: "Paper Clips (100s)", categorySlug: "office-stationery", priceNaira: 500, weightGrams: 90, stock: 240, imageKeyword: "paper-clip", description: "Metal paper clips 33mm, 100-pack." },
  { sku: "OFF-TAPE-5", name: "Scotch Tape (5pk)", categorySlug: "office-stationery", priceNaira: 1500, weightGrams: 200, stock: 160, imageKeyword: "tape", description: "Clear adhesive tape rolls, 5-pack." },
  { sku: "OFF-ERS-10", name: "Eraser (10pk)", categorySlug: "office-stationery", priceNaira: 500, weightGrams: 60, stock: 260, imageKeyword: "eraser", description: "Soft white eraser, 10-pack." },
  { sku: "OFF-PEN-12", name: "HB Pencil (12pk)", categorySlug: "office-stationery", priceNaira: 1200, weightGrams: 100, stock: 220, imageKeyword: "pencil", description: "Wooden HB pencil with eraser tip, 12-pack." },
  { sku: "OFF-CASIO-12", name: "Casio Calculator 12-digit", categorySlug: "office-stationery", priceNaira: 5500, weightGrams: 180, stock: 80, imageKeyword: "calculator", description: "Casio MJ-120D 12-digit desk calculator." },
  { sku: "OFF-FLD-10", name: "A4 File Folder (10pk)", categorySlug: "office-stationery", priceNaira: 2200, weightGrams: 600, stock: 130, imageKeyword: "folder", description: "Plastic A4 file folders, 10-pack." },
];

function seedSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unsplashUrl(_keyword: string): string {
  return "/placeholders/product.svg";
}

// Default carton size (units per carton) per category. null = sold by piece only.
const CARTON_SIZE_BY_CATEGORY: Record<string, number | null> = {
  drinks: 24,
  snacks: 24,
  "pasta-grains": 40,
  "cooking-essentials": 12,
  "dairy-frozen": 12,
  "personal-care": 24,
  household: 12,
  "baby-care": 6,
  "health-wellness": 12,
  "office-stationery": 12,
};

// Per-SKU overrides for the carton size (or piece-only when null).
const CARTON_SIZE_OVERRIDES: Record<string, number | null> = {
  // Big bags of rice / beans: sold per bag.
  "GRN-RSTAL-10KG": null,
  "GRN-MAMA-5KG": null,
  "GRN-CAPRICE-5KG": null,
  "GRN-HBEANS-5KG": null,
  "GRN-OLOYIN-5KG": null,
  "GRN-GARRI-5KG": null,
  // High-value single items.
  "HW-BP-MON": null,
  "HW-THERM-DIG": null,
  "OFF-CASIO-12": null,
  "BB-AVENT-250": null,
};

function unitsPerCartonFor(sku: string, categorySlug: string): number | null {
  if (Object.prototype.hasOwnProperty.call(CARTON_SIZE_OVERRIDES, sku)) {
    return CARTON_SIZE_OVERRIDES[sku];
  }
  return CARTON_SIZE_BY_CATEGORY[categorySlug] ?? null;
}

function splitStock(total: number, unitsPerCarton: number | null): {
  stockCartons: number;
  stockLoosePieces: number;
} {
  if (unitsPerCarton == null) {
    return { stockCartons: 0, stockLoosePieces: total };
  }
  // Reserve ~20% of total as loose pieces, rest as whole cartons.
  const loose = Math.min(total, Math.max(0, Math.floor(total * 0.2)));
  const cartonsAvailable = Math.floor((total - loose) / unitsPerCarton);
  const remainder = total - loose - cartonsAvailable * unitsPerCarton;
  return {
    stockCartons: cartonsAvailable,
    stockLoosePieces: loose + remainder,
  };
}

async function main() {
  console.log("Seeding vehicles…");
  for (const v of VEHICLES) {
    await db.vehicle.upsert({
      where: { name: v.name },
      update: { tonnageKg: v.tonnageKg, fuelPerKm: v.fuelPerKm, sortOrder: v.sortOrder },
      create: v,
    });
  }

  console.log("Seeding distance bands…");
  for (const b of BANDS) {
    await db.distanceBand.upsert({
      where: { label: b.label },
      update: { minKm: b.minKm, maxKm: b.maxKm, sortOrder: b.sortOrder },
      create: b,
    });
  }

  console.log("Seeding logistics cost matrix…");
  const vehicles = await db.vehicle.findMany({ orderBy: { sortOrder: "asc" } });
  const bands = await db.distanceBand.findMany({ orderBy: { sortOrder: "asc" } });
  for (let r = 0; r < bands.length; r++) {
    for (let c = 0; c < vehicles.length; c++) {
      await db.logisticsCost.upsert({
        where: {
          vehicleId_distanceBandId: { vehicleId: vehicles[c].id, distanceBandId: bands[r].id },
        },
        update: { costKobo: nairaToKobo(COST_MATRIX_NAIRA[r][c]) },
        create: {
          vehicleId: vehicles[c].id,
          distanceBandId: bands[r].id,
          costKobo: nairaToKobo(COST_MATRIX_NAIRA[r][c]),
        },
      });
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log(`Seeding admin user ${adminEmail}…`);
    const passwordHash = await hash(adminPassword, 10);
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        role: "ADMIN",
        name: "Admin",
        passwordHash,
      },
    });
  } else {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user.");
  }

  console.log("Seeding product categories…");
  const categoryIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { slug: c.slug, name: c.name },
    });
    categoryIdBySlug.set(c.slug, cat.id);
  }

  console.log(`Seeding ${PRODUCTS.length} products…`);
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`  skip ${p.sku}: unknown category ${p.categorySlug}`);
      continue;
    }
    const slug = seedSlug(p.name);
    const priceKobo = nairaToKobo(p.priceNaira);
    const images = [unsplashUrl(p.imageKeyword)];
    const unitsPerCarton = unitsPerCartonFor(p.sku, p.categorySlug);
    const { stockCartons, stockLoosePieces } = splitStock(p.stock, unitsPerCarton);

    const product = await db.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        slug,
        description: p.description,
        priceKobo,
        weightGrams: p.weightGrams,
        unitsPerCarton,
        images,
        active: true,
        categoryId,
      },
      create: {
        sku: p.sku,
        slug,
        name: p.name,
        description: p.description,
        priceKobo,
        weightGrams: p.weightGrams,
        unitsPerCarton,
        stockCartons: 0, // adjusted via the StockMovement below
        stockLoosePieces: 0,
        images,
        active: true,
        categoryId,
      },
    });

    // Idempotent initial restock: only create a movement if the seed marker
    // isn't already present, then re-sync Product.stockCartons / stockLoosePieces.
    const existing = await db.stockMovement.findFirst({
      where: { productId: product.id, reason: "RESTOCK", note: "seed:initial" },
    });
    if (!existing) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          deltaCartons: stockCartons,
          deltaPieces: stockLoosePieces,
          reason: "RESTOCK",
          note: "seed:initial",
        },
      });
      const agg = await db.stockMovement.aggregate({
        where: { productId: product.id },
        _sum: { deltaCartons: true, deltaPieces: true },
      });
      await db.product.update({
        where: { id: product.id },
        data: {
          stockCartons: agg._sum.deltaCartons ?? 0,
          stockLoosePieces: agg._sum.deltaPieces ?? 0,
        },
      });
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
