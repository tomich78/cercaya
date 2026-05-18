// ── Tipos de publicación ────────────────────────────────────────
export type ListingType = "product" | "service" | "property" | "vehicle";

export const LISTING_TYPES = [
  { value: "product"  as ListingType, label: "Producto",  emoji: "📦", desc: "Ropa, electrónica, hogar y más" },
  { value: "service"  as ListingType, label: "Servicio",  emoji: "🔧", desc: "Plomería, diseño, clases y más" },
  { value: "property" as ListingType, label: "Inmueble",  emoji: "🏠", desc: "Casas, deptos, terrenos y más"  },
  { value: "vehicle"  as ListingType, label: "Vehículo",  emoji: "🚗", desc: "Autos, motos, bicicletas y más" },
] as const;

// ── Categorías por tipo ──────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  "Todos", "Electrónica", "Ropa", "Hogar", "Arte", "Deportes",
  "Herramientas", "Juguetes", "Libros", "Mascotas", "Bebés",
  "Jardín", "Comida y bebida", "Farmacia", "Kiosco", "Ferretería",
];

export const SERVICE_CATEGORIES = [
  "Todos", "Plomería", "Electricidad", "Carpintería", "Pintura",
  "Limpieza", "Albañilería", "Jardinería", "Informática", "Diseño",
  "Clases particulares", "Reparaciones", "Transporte", "Cuidado personal",
  "Gastronomía", "Salud y bienestar", "Mudanzas", "Otro",
];

export const PROPERTY_TYPES = [
  "Todos", "Casa", "Departamento", "PH", "Terreno",
  "Local comercial", "Oficina", "Cochera",
];

export const VEHICLE_TYPES = [
  "Todos", "Auto", "Moto", "Camioneta", "Camión", "Bicicleta", "Scooter", "Otro",
];

// ── Array legacy (para partes del código que aún usan "categories") ──
export const categories = PRODUCT_CATEGORIES;

// ── Emojis por categoría ─────────────────────────────────────────
export const categoryEmojis: Record<string, string[]> = {
  // Productos
  "Electrónica":      ["💻","📱","🖥️","⌨️","🖱️","🎧","📷","🎮","📺","🔋"],
  "Ropa":             ["👗","👟","👔","🧥","👜","🕶️","👒","🧣","👞","🧤"],
  "Hogar":            ["🛋️","🪑","🛏️","🪴","🍳","🪞","🛁","🖼️","💡","🧹"],
  "Arte":             ["🎨","📚","🎵","🎸","🎹","📷","✏️","🎭","🎬","🧵"],
  "Deportes":         ["🚲","⚽","🎾","🏋️","🛹","🏊","⛷️","🥊","🎯","🏄"],
  "Herramientas":     ["🔧","🪛","🔨","🪚","🔩","⚙️","🪝","🔑","🗜️","🔌"],
  "Juguetes":         ["🧸","🎮","🎲","🪆","🎯","🪀","🧩","🎠","🪁","🎪"],
  "Libros":           ["📚","📖","📕","📗","📘","📙","📜","📰","🗒️","✏️"],
  "Mascotas":         ["🐶","🐱","🐠","🐦","🐹","🦜","🐰","🐢","🐾","🦮"],
  "Bebés":            ["👶","🍼","🧸","🪆","🛒","🧷","🎠","🪃","🧦","👕"],
  "Jardín":           ["🌱","🌸","🪴","🌻","🌿","🍃","🌾","🌺","🌷","🪻"],
  "Comida y bebida":  ["🍕","🍔","🥗","🍣","🥐","🍰","☕","🧃","🍱","🥙"],
  "Farmacia":         ["💊","🩺","🩹","🧴","🧪","💉","🩻","🫀","🧬","🩼"],
  "Kiosco":           ["🍬","🍫","🧁","🥤","🍿","🪄","📦","🛒","🍭","🎁"],
  "Ferretería":       ["🔨","🪚","🔧","🪛","🔩","🪤","🧲","🔌","💡","🪜"],
  // Servicios
  "Plomería":         ["🔧","🚿","🛁","🪠","💧","🔩","🪛","⚙️","🏠","🛠️"],
  "Electricidad":     ["⚡","💡","🔌","🔋","🪫","🔦","🕯️","⚙️","🛠️","🔧"],
  "Carpintería":      ["🪚","🔨","🪵","🪑","🛋️","🚪","🪟","🛏️","🪣","⚙️"],
  "Pintura":          ["🎨","🖌️","🪣","🖍️","🏠","🚪","🪟","✏️","🖼️","🛠️"],
  "Limpieza":         ["🧹","🧽","🪣","🧴","🫧","🧺","🪟","🏠","✨","🛠️"],
  "Albañilería":      ["🏗️","🧱","⚒️","🪚","🔨","🏠","🪣","⚙️","🛠️","🏢"],
  "Jardinería":       ["🌱","🪴","🌿","✂️","🔧","🌻","🪻","🌳","🌾","🍃"],
  "Informática":      ["💻","🖥️","🔧","📱","⌨️","🖱️","💾","🌐","⚙️","🛠️"],
  "Diseño":           ["🎨","🖌️","✏️","📐","📏","🖥️","📷","🖼️","✒️","🎭"],
  "Clases particulares":["📚","✏️","🎓","📐","🎸","🎹","🗣️","🧮","📝","🔬"],
  "Reparaciones":     ["🔧","🪛","🔨","⚙️","🛠️","🔌","💡","🪚","🔩","🏠"],
  "Transporte":       ["🚗","🚐","🛻","🚚","🚌","🏍️","🛵","🚲","📦","🗺️"],
  "Cuidado personal": ["✂️","💇","💅","💆","🧖","🪥","🧴","💄","🪒","✨"],
  "Gastronomía":      ["🍽️","👨‍🍳","🥗","🍕","🎂","☕","🧆","🥘","🍱","🫕"],
  "Salud y bienestar":["💆","🧘","💪","🏃","🩺","💊","🌿","🧬","🩻","❤️"],
  "Mudanzas":         ["📦","🚚","🏠","📋","🪜","🛻","🔑","🗺️","💪","✅"],
  "Otro":             ["🛠️","⚙️","🔧","🪛","🔨","🪚","📋","✅","🙌","💼"],
  // Inmuebles
  "Casa":             ["🏠","🏡","🔑","🏗️","🪟","🚪","🌳","🛋️","🏘️","🏰"],
  "Departamento":     ["🏢","🏬","🔑","🪟","🚪","🛋️","🏙️","🌆","🌇","✨"],
  "PH":               ["🏘️","🔑","🪟","🚪","🛋️","🌆","🏠","🏡","✨","🌿"],
  "Terreno":          ["🏗️","🌳","🗺️","📐","🌿","⛏️","🏞️","🌾","🌱","🏔️"],
  "Local comercial":  ["🏪","🛒","💼","🔑","🪟","🚪","🏬","✨","🏙️","📋"],
  "Oficina":          ["🏬","💼","🖥️","📋","🔑","🚪","🏙️","🪟","✨","📊"],
  "Cochera":          ["🚗","🏗️","🔑","🅿️","🚙","🛻","🏠","⚙️","🔧","🏢"],
  // Vehículos
  "Auto":             ["🚗","🚙","🏎️","🚕","🛻","🚐","🚌","🚑","🚒","🚓"],
  "Moto":             ["🏍️","🛵","🚲","🛺","🏎️","⛽","🔧","🪖","🕶️","⚡"],
  "Camioneta":        ["🛻","🚐","🚙","🚗","🔧","⛽","🏔️","🌄","🪝","🛞"],
  "Camión":           ["🚚","🚛","🚜","🏗️","📦","⛽","🔧","🛣️","🌐","🏭"],
  "Bicicleta":        ["🚲","🏔️","🚴","⛰️","🛣️","🔧","⚙️","🌿","🌳","🏞️"],
  "Scooter":          ["🛵","⚡","🔋","🏙️","🌆","🛣️","🪖","🕶️","🔧","✨"],
};

export const categoryColors: Record<string, string> = {
  // Productos
  "Electrónica":      "#dbeafe",
  "Ropa":             "#fce7f3",
  "Hogar":            "#d1fae5",
  "Arte":             "#fef3c7",
  "Deportes":         "#e0f2fe",
  "Herramientas":     "#fed7aa",
  "Juguetes":         "#fde68a",
  "Libros":           "#c7d2fe",
  "Mascotas":         "#fecdd3",
  "Bebés":            "#bae6fd",
  "Jardín":           "#bbf7d0",
  "Comida y bebida":  "#fef9c3",
  "Farmacia":         "#dcfce7",
  "Kiosco":           "#fde8d8",
  "Ferretería":       "#e2e8f0",
  // Servicios
  "Plomería":         "#dbeafe",
  "Electricidad":     "#fef3c7",
  "Carpintería":      "#fed7aa",
  "Pintura":          "#fce7f3",
  "Limpieza":         "#d1fae5",
  "Albañilería":      "#e2e8f0",
  "Jardinería":       "#bbf7d0",
  "Informática":      "#c7d2fe",
  "Diseño":           "#fce7f3",
  "Clases particulares": "#dbeafe",
  "Reparaciones":     "#fed7aa",
  "Transporte":       "#e0f2fe",
  "Cuidado personal": "#fce7f3",
  "Gastronomía":      "#fef9c3",
  "Salud y bienestar":"#d1fae5",
  "Mudanzas":         "#e0f2fe",
  "Otro":             "#f1f5f9",
  // Inmuebles
  "Casa":             "#d1fae5",
  "Departamento":     "#dbeafe",
  "PH":               "#e0f2fe",
  "Terreno":          "#bbf7d0",
  "Local comercial":  "#fef3c7",
  "Oficina":          "#c7d2fe",
  "Cochera":          "#e2e8f0",
  // Vehículos
  "Auto":             "#dbeafe",
  "Moto":             "#fce7f3",
  "Camioneta":        "#fed7aa",
  "Camión":           "#e2e8f0",
  "Bicicleta":        "#d1fae5",
  "Scooter":          "#fde8a0",
};
