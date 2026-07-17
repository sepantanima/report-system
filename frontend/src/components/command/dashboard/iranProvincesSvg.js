/**
 * نقشه شماتیک استان‌های ایران (SVG) — بدون وابستگی GeoJSON خارجی.
 * نام‌ها با StateName رایج در DB هم‌تراز شده‌اند.
 *
 * هر استان: { id, name, aliases[], d } مسیر SVG در viewBox 0 0 1000 900
 */
export const IRAN_PROVINCES_SVG = [
  { id: "آذربایجان غربی", name: "آذربایجان غربی", aliases: ["West Azerbaijan", "Azarbayjan-e Gharbi"], d: "M120,80 L200,70 L220,140 L160,180 L110,150 Z" },
  { id: "آذربایجان شرقی", name: "آذربایجان شرقی", aliases: ["East Azerbaijan", "Azarbayjan-e Sharqi"], d: "M200,70 L290,60 L310,130 L250,160 L220,140 Z" },
  { id: "اردبیل", name: "اردبیل", aliases: ["Ardebil", "Ardabil"], d: "M290,60 L360,80 L350,140 L310,130 Z" },
  { id: "گیلان", name: "گیلان", aliases: ["Gilan"], d: "M350,140 L430,130 L440,190 L370,200 Z" },
  { id: "مازندران", name: "مازندران", aliases: ["Mazandaran"], d: "M430,130 L560,120 L570,180 L440,190 Z" },
  { id: "گلستان", name: "گلستان", aliases: ["Golestan"], d: "M560,120 L660,130 L650,190 L570,180 Z" },
  { id: "خراسان شمالی", name: "خراسان شمالی", aliases: ["North Khorasan"], d: "M660,130 L760,140 L740,210 L650,190 Z" },
  { id: "خراسان رضوی", name: "خراسان رضوی", aliases: ["Razavi Khorasan", "Khorasan-e Razavi"], d: "M740,210 L860,200 L870,340 L760,350 L720,260 Z" },
  { id: "خراسان جنوبی", name: "خراسان جنوبی", aliases: ["South Khorasan"], d: "M760,350 L870,340 L880,460 L770,470 Z" },
  { id: "زنجان", name: "زنجان", aliases: ["Zanjan"], d: "M250,160 L330,170 L340,230 L270,240 Z" },
  { id: "قزوین", name: "قزوین", aliases: ["Qazvin"], d: "M330,170 L400,175 L405,230 L340,230 Z" },
  { id: "البرز", name: "البرز", aliases: ["Alborz"], d: "M400,175 L460,170 L465,215 L405,230 Z" },
  { id: "تهران", name: "تهران", aliases: ["Tehran"], d: "M460,170 L530,165 L535,230 L465,215 Z" },
  { id: "سمنان", name: "سمنان", aliases: ["Semnan"], d: "M530,165 L660,180 L650,280 L535,230 Z" },
  { id: "همدان", name: "همدان", aliases: ["Hamadan", "Hamedan"], d: "M270,240 L340,235 L350,300 L280,310 Z" },
  { id: "مرکزی", name: "مرکزی", aliases: ["Markazi"], d: "M340,235 L420,240 L425,310 L350,300 Z" },
  { id: "قم", name: "قم", aliases: ["Qom"], d: "M420,240 L470,245 L475,290 L425,310 Z" },
  { id: "اصفهان", name: "اصفهان", aliases: ["Esfahan", "Isfahan"], d: "M425,310 L560,300 L580,450 L430,460 Z" },
  { id: "یزد", name: "یزد", aliases: ["Yazd"], d: "M560,300 L700,310 L710,430 L580,450 Z" },
  { id: "کردستان", name: "کردستان", aliases: ["Kordestan", "Kurdistan"], d: "M160,180 L250,175 L270,250 L180,270 Z" },
  { id: "کرمانشاه", name: "کرمانشاه", aliases: ["Kermanshah"], d: "M140,250 L220,260 L230,340 L150,350 Z" },
  { id: "ایلام", name: "ایلام", aliases: ["Ilam"], d: "M150,350 L230,340 L240,420 L160,430 Z" },
  { id: "لرستان", name: "لرستان", aliases: ["Lorestan"], d: "M230,340 L320,330 L330,410 L240,420 Z" },
  { id: "خوزستان", name: "خوزستان", aliases: ["Khuzestan"], d: "M240,420 L350,430 L360,560 L220,550 Z" },
  { id: "چهارمحال و بختیاری", name: "چهارمحال و بختیاری", aliases: ["Chahar Mahall and Bakhtiari", "Chaharmahal and Bakhtiari", "چهار محال و بختیاری"], d: "M330,410 L400,400 L410,470 L350,480 Z" },
  { id: "کهگیلویه و بویراحمد", name: "کهگیلویه و بویراحمد", aliases: ["Kohgiluyeh and Buyer Ahmad", "Kohgiluyeh and Boyerahmad"], d: "M350,480 L430,470 L440,540 L360,550 Z" },
  { id: "بوشهر", name: "بوشهر", aliases: ["Bushehr"], d: "M360,560 L450,550 L460,640 L350,650 Z" },
  { id: "فارس", name: "فارس", aliases: ["Fars"], d: "M430,460 L560,450 L580,600 L440,610 Z" },
  { id: "کرمان", name: "کرمان", aliases: ["Kerman"], d: "M580,450 L730,440 L760,620 L600,630 Z" },
  { id: "سیستان و بلوچستان", name: "سیستان و بلوچستان", aliases: ["Sistan and Baluchestan", "Sistan & Baluchestan"], d: "M760,470 L920,460 L940,700 L780,710 Z" },
  { id: "هرمزگان", name: "هرمزگان", aliases: ["Hormozgan"], d: "M580,630 L760,620 L780,740 L600,750 Z" },
];

export function normalizeProvinceName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}

export function findProvinceMeta(name) {
  const n = normalizeProvinceName(name);
  if (!n) return null;
  return (
    IRAN_PROVINCES_SVG.find((p) => normalizeProvinceName(p.name) === n)
    || IRAN_PROVINCES_SVG.find((p) => p.aliases.some((a) => normalizeProvinceName(a) === n))
    || IRAN_PROVINCES_SVG.find((p) => n.includes(normalizeProvinceName(p.name)) || normalizeProvinceName(p.name).includes(n))
    || null
  );
}

export function matchHeatToProvince(heatRow, provinceMeta) {
  const names = [provinceMeta.name, ...provinceMeta.aliases].map(normalizeProvinceName);
  const heatName = normalizeProvinceName(heatRow?.name || heatRow?.id);
  return names.some((n) => n === heatName || heatName.includes(n) || n.includes(heatName));
}
