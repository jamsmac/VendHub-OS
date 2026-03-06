// VendHub Menu Data - extracted from real order data
// Prices in UZS (Uzbek Som)

export interface ProductOption {
  id: string;
  name: string;
  nameRu: string;
  priceModifier: number;
}

export interface Product {
  id: string;
  name: string;
  nameRu: string;
  basePrice: number;
  category:
    | "coffee"
    | "ice_coffee"
    | "specialty"
    | "drinks"
    | "energy"
    | "snacks";
  description?: string;
  image?: string;
  options: ProductOption[];
}

export interface VendingMachineLocation {
  id: string;
  machineCode: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: "coffee" | "snacks" | "drinks" | "combo";
  status: "active" | "inactive" | "maintenance";
  is24h: boolean;
  groupId?: string;
}

export interface MachineGroup {
  id: string;
  name: string;
  description?: string;
  machines: string[];
}

// Coffee Products with Options
export const coffeeProducts: Product[] = [
  {
    id: "espresso",
    name: "Espresso",
    nameRu: "Эспрессо",
    basePrice: 20000,
    category: "coffee",
    description: "Классический итальянский эспрессо",
    options: [
      {
        id: "with_sugar",
        name: "With Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "without_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
    ],
  },
  {
    id: "americano",
    name: "Americano",
    nameRu: "Американо",
    basePrice: 20000,
    category: "coffee",
    description: "Классический черный кофе",
    options: [
      {
        id: "hot_sugar",
        name: "Hot with Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "hot_no_sugar",
        name: "Hot without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "hot_vanilla",
        name: "Hot with Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_caramel",
        name: "Hot with Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_coconut",
        name: "Hot with Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    nameRu: "Капучино",
    basePrice: 20000,
    category: "coffee",
    description: "Кофе с молочной пенкой",
    options: [
      {
        id: "hot_sugar",
        name: "Hot with Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "hot_no_sugar",
        name: "Hot without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "hot_vanilla",
        name: "Hot with Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_caramel",
        name: "Hot with Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_coconut",
        name: "Hot with Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "latte",
    name: "Latte",
    nameRu: "Латте",
    basePrice: 20000,
    category: "coffee",
    description: "Кофе с большим количеством молока",
    options: [
      {
        id: "hot_sugar",
        name: "Hot with Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "hot_no_sugar",
        name: "Hot without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "hot_vanilla",
        name: "Hot with Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_caramel",
        name: "Hot with Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "hot_coconut",
        name: "Hot with Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "flat_white",
    name: "Flat White",
    nameRu: "Флэт Уайт",
    basePrice: 25000,
    category: "coffee",
    description: "Двойной эспрессо с молоком",
    options: [
      {
        id: "with_sugar",
        name: "With Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "without_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
    ],
  },
  {
    id: "mocha",
    name: "Mocha",
    nameRu: "Мокка",
    basePrice: 22000,
    category: "coffee",
    description: "Кофе с шоколадом и молоком",
    options: [
      {
        id: "with_sugar",
        name: "With Sugar",
        nameRu: "С сахаром",
        priceModifier: 0,
      },
      {
        id: "without_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
    ],
  },
  {
    id: "hot_chocolate",
    name: "Hot Chocolate",
    nameRu: "Горячий шоколад",
    basePrice: 15000,
    category: "coffee",
    description: "Горячий шоколадный напиток",
    options: [
      {
        id: "standard",
        name: "Standard",
        nameRu: "Стандартный",
        priceModifier: 0,
      },
    ],
  },
];

// Ice Coffee Products
export const iceCoffeeProducts: Product[] = [
  {
    id: "ice_americano",
    name: "ICE Americano",
    nameRu: "Айс Американо",
    basePrice: 20000,
    category: "ice_coffee",
    description: "Холодный американо со льдом",
    options: [
      {
        id: "ice_no_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "ice_vanilla",
        name: "With Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_caramel",
        name: "With Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_coconut",
        name: "With Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "ice_cappuccino",
    name: "ICE Cappuccino",
    nameRu: "Айс Капучино",
    basePrice: 22000,
    category: "ice_coffee",
    description: "Холодный капучино со льдом",
    options: [
      {
        id: "ice_no_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "ice_vanilla",
        name: "With Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_caramel",
        name: "With Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_coconut",
        name: "With Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "ice_latte",
    name: "ICE Latte",
    nameRu: "Айс Латте",
    basePrice: 22000,
    category: "ice_coffee",
    description: "Холодный латте со льдом",
    options: [
      {
        id: "ice_no_sugar",
        name: "Without Sugar",
        nameRu: "Без сахара",
        priceModifier: 0,
      },
      {
        id: "ice_vanilla",
        name: "With Vanilla",
        nameRu: "С ванильным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_caramel",
        name: "With Caramel",
        nameRu: "С карамельным сиропом",
        priceModifier: 2000,
      },
      {
        id: "ice_coconut",
        name: "With Coconut",
        nameRu: "С кокосовым сиропом",
        priceModifier: 2000,
      },
    ],
  },
  {
    id: "ice_matcha_latte",
    name: "ICE Matcha Latte",
    nameRu: "Айс Матча Латте",
    basePrice: 30000,
    category: "ice_coffee",
    description: "Холодный матча латте со льдом",
    options: [
      {
        id: "standard",
        name: "Standard",
        nameRu: "Стандартный",
        priceModifier: 0,
      },
    ],
  },
  {
    id: "matcha_latte",
    name: "Matcha Latte",
    nameRu: "Матча Латте",
    basePrice: 30000,
    category: "specialty",
    description: "Горячий матча латте",
    options: [
      {
        id: "standard",
        name: "Standard",
        nameRu: "Стандартный",
        priceModifier: 0,
      },
    ],
  },
];

// Energy Drinks
export const energyDrinks: Product[] = [
  {
    id: "red_bull",
    name: "Red Bull",
    nameRu: "Red Bull",
    basePrice: 20000,
    category: "energy",
    options: [
      { id: "can_250", name: "250ml", nameRu: "250мл", priceModifier: 0 },
    ],
  },
  {
    id: "red_bull_330",
    name: "Red Bull 330ml",
    nameRu: "Red Bull 330мл",
    basePrice: 32000,
    category: "energy",
    options: [
      { id: "can_330", name: "330ml", nameRu: "330мл", priceModifier: 0 },
    ],
  },
  {
    id: "flash_up",
    name: "Flash Up Energy",
    nameRu: "Flash Up Energy",
    basePrice: 11000,
    category: "energy",
    options: [
      { id: "can_450", name: "450ml", nameRu: "450мл", priceModifier: 0 },
    ],
  },
  {
    id: "flash_up_bubble",
    name: "Flash Up Bubble Gum",
    nameRu: "Flash Up Жвачка",
    basePrice: 11000,
    category: "energy",
    options: [
      { id: "can_450", name: "450ml", nameRu: "450мл", priceModifier: 0 },
    ],
  },
  {
    id: "lit_energy",
    name: "Lit Energy",
    nameRu: "Lit Energy",
    basePrice: 17000,
    category: "energy",
    options: [
      { id: "can_450", name: "450ml", nameRu: "450мл", priceModifier: 0 },
    ],
  },
  {
    id: "lit_energy_mango",
    name: "Lit Energy Mango",
    nameRu: "Lit Energy Манго",
    basePrice: 17000,
    category: "energy",
    options: [
      { id: "can_450", name: "450ml", nameRu: "450мл", priceModifier: 0 },
    ],
  },
  {
    id: "gorilla",
    name: "Gorilla",
    nameRu: "Gorilla",
    basePrice: 12000,
    category: "energy",
    options: [{ id: "can", name: "Can", nameRu: "Банка", priceModifier: 0 }],
  },
  {
    id: "adrenaline_rush",
    name: "Adrenaline Rush",
    nameRu: "Adrenaline Rush",
    basePrice: 15000,
    category: "energy",
    options: [
      { id: "can_250", name: "250ml", nameRu: "250мл", priceModifier: 0 },
    ],
  },
];

// Soft Drinks
export const softDrinks: Product[] = [
  {
    id: "coca_cola",
    name: "Coca-Cola",
    nameRu: "Кока-Кола",
    basePrice: 10000,
    category: "drinks",
    options: [
      { id: "can_250", name: "250ml", nameRu: "250мл", priceModifier: 0 },
      { id: "bottle_500", name: "500ml", nameRu: "500мл", priceModifier: 5000 },
    ],
  },
  {
    id: "pepsi",
    name: "Pepsi",
    nameRu: "Пепси",
    basePrice: 8000,
    category: "drinks",
    options: [
      { id: "can_250", name: "250ml", nameRu: "250мл", priceModifier: 0 },
      { id: "bottle_500", name: "500ml", nameRu: "500мл", priceModifier: 2000 },
    ],
  },
  {
    id: "fanta",
    name: "Fanta",
    nameRu: "Фанта",
    basePrice: 8000,
    category: "drinks",
    options: [
      { id: "can_250", name: "250ml", nameRu: "250мл", priceModifier: 0 },
      { id: "bottle_500", name: "500ml", nameRu: "500мл", priceModifier: 2000 },
    ],
  },
  {
    id: "sprite",
    name: "Sprite",
    nameRu: "Спрайт",
    basePrice: 8000,
    category: "drinks",
    options: [
      { id: "bottle_500", name: "500ml", nameRu: "500мл", priceModifier: 0 },
    ],
  },
  {
    id: "laimon_fresh",
    name: "Laimon Fresh",
    nameRu: "Лаймон Фреш",
    basePrice: 10000,
    category: "drinks",
    options: [
      { id: "can_330", name: "330ml", nameRu: "330мл", priceModifier: 0 },
    ],
  },
  {
    id: "laimon_fresh_mango",
    name: "Laimon Fresh Mango",
    nameRu: "Лаймон Фреш Манго",
    basePrice: 10000,
    category: "drinks",
    options: [
      { id: "can_330", name: "330ml", nameRu: "330мл", priceModifier: 0 },
    ],
  },
  {
    id: "moxito_fresh",
    name: "Moxito Fresh",
    nameRu: "Мохито Фреш",
    basePrice: 14000,
    category: "drinks",
    options: [
      { id: "can_500", name: "500ml", nameRu: "500мл", priceModifier: 0 },
    ],
  },
  {
    id: "moxito_strawberry",
    name: "Moxito Strawberry",
    nameRu: "Мохито Клубничный",
    basePrice: 14000,
    category: "drinks",
    options: [
      { id: "can_500", name: "500ml", nameRu: "500мл", priceModifier: 0 },
    ],
  },
  {
    id: "ice_tea",
    name: "Ice Tea",
    nameRu: "Холодный чай",
    basePrice: 8000,
    category: "drinks",
    options: [
      { id: "bottle", name: "Bottle", nameRu: "Бутылка", priceModifier: 0 },
    ],
  },
  {
    id: "fuse_tea",
    name: "Fuse Tea",
    nameRu: "Fuse Tea",
    basePrice: 8000,
    category: "drinks",
    options: [
      { id: "bottle", name: "Bottle", nameRu: "Бутылка", priceModifier: 0 },
    ],
  },
  {
    id: "borjomi",
    name: "Borjomi",
    nameRu: "Боржоми",
    basePrice: 12000,
    category: "drinks",
    options: [
      { id: "can_330", name: "330ml", nameRu: "330мл", priceModifier: 0 },
    ],
  },
];

// Vending Machine Locations (from real data)
export const vendingMachines: VendingMachineLocation[] = [
  {
    id: "vm_001",
    machineCode: "3be8c71e0000",
    name: "American Hospital",
    address: "American Hospital, Ташкент",
    latitude: 41.2995,
    longitude: 69.2401,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "hospitals",
  },
  {
    id: "vm_002",
    machineCode: "8da1181f0000",
    name: "4 корпус кардиология",
    address: "4 корпус кардиология, Ташкент",
    latitude: 41.305,
    longitude: 69.245,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "hospitals",
  },
  {
    id: "vm_003",
    machineCode: "1dce181f0000",
    name: "Naimix",
    address: "Naimix, Ташкент",
    latitude: 41.3111,
    longitude: 69.2797,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
  {
    id: "vm_004",
    machineCode: "a5aa181f0000",
    name: "Zemfira",
    address: "Zemfira, Ташкент",
    latitude: 41.32,
    longitude: 69.26,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
  {
    id: "vm_005",
    machineCode: "17b7181f0000",
    name: "1 корпус кардиология",
    address: "1 корпус кардиология, Ташкент",
    latitude: 41.3055,
    longitude: 69.2455,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "hospitals",
  },
  {
    id: "vm_006",
    machineCode: "3266181f0000",
    name: "Остановка 198 школа",
    address: "Остановка 198 школа, Ташкент",
    latitude: 41.3264,
    longitude: 69.2275,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "public",
  },
  {
    id: "vm_007",
    machineCode: "5b7b181f0000",
    name: "КПП Кардиология",
    address: "КПП Кардиология, Ташкент",
    latitude: 41.3048,
    longitude: 69.2448,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "hospitals",
  },
  {
    id: "vm_008",
    machineCode: "2c67181f0000",
    name: "Ipak Bankomat",
    address: "Ipak Bankomat, Ташкент",
    latitude: 41.315,
    longitude: 69.27,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
  {
    id: "vm_009",
    machineCode: "6620191f0000",
    name: "2 корпус кардиология",
    address: "2 корпус кардиология, Ташкент",
    latitude: 41.3052,
    longitude: 69.2452,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "hospitals",
  },
  {
    id: "vm_010",
    machineCode: "24a8181f0000",
    name: "Istanbul City",
    address: "Istanbul City, Ташкент",
    latitude: 41.318,
    longitude: 69.265,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
  {
    id: "vm_011",
    machineCode: "a7ca181f0000",
    name: "Кудрат Первушка",
    address: "Кудрат Первушка, Ташкент",
    latitude: 41.31,
    longitude: 69.25,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "public",
  },
  {
    id: "vm_012",
    machineCode: "72ac181f0000",
    name: "ГУВД Остановка",
    address: "ГУВД Остановка, Ташкент",
    latitude: 41.312,
    longitude: 69.258,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "public",
  },
  {
    id: "vm_013",
    machineCode: "c7a6181f0000",
    name: "Фидокор",
    address: "Фидокор, Ташкент",
    latitude: 41.309,
    longitude: 69.262,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
  {
    id: "vm_014",
    machineCode: "4f9c181f0000",
    name: "Nukus Pepsi Market",
    address: "Nukus Pepsi Market",
    latitude: 42.46,
    longitude: 59.6,
    type: "drinks",
    status: "active",
    is24h: true,
    groupId: "retail",
  },
  {
    id: "vm_015",
    machineCode: "9457181f0000",
    name: "Пеликан",
    address: "Пеликан, Ташкент",
    latitude: 41.314,
    longitude: 69.256,
    type: "coffee",
    status: "active",
    is24h: true,
    groupId: "business",
  },
];

// Machine Groups
export const machineGroups: MachineGroup[] = [
  {
    id: "hospitals",
    name: "Больницы",
    description: "Автоматы в медицинских учреждениях",
    machines: ["vm_001", "vm_002", "vm_005", "vm_007", "vm_009"],
  },
  {
    id: "business",
    name: "Бизнес-центры",
    description: "Автоматы в офисных зданиях",
    machines: ["vm_003", "vm_004", "vm_008", "vm_010", "vm_013", "vm_015"],
  },
  {
    id: "public",
    name: "Общественные места",
    description: "Автоматы на остановках и в парках",
    machines: ["vm_006", "vm_011", "vm_012"],
  },
  {
    id: "retail",
    name: "Торговые точки",
    description: "Автоматы в магазинах",
    machines: ["vm_014"],
  },
];

// All products combined
export const allProducts: Product[] = [
  ...coffeeProducts,
  ...iceCoffeeProducts,
  ...energyDrinks,
  ...softDrinks,
];

// Helper functions
export function getProductById(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}

export function getProductsByCategory(
  category: Product["category"],
): Product[] {
  return allProducts.filter((p) => p.category === category);
}

export function getMachineById(id: string): VendingMachineLocation | undefined {
  return vendingMachines.find((m) => m.id === id);
}

export function getMachineByCode(
  code: string,
): VendingMachineLocation | undefined {
  return vendingMachines.find((m) => m.machineCode === code);
}

export function getMachinesByGroup(groupId: string): VendingMachineLocation[] {
  return vendingMachines.filter((m) => m.groupId === groupId);
}

export function getGroupById(id: string): MachineGroup | undefined {
  return machineGroups.find((g) => g.id === id);
}
