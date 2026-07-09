/**
 * Kurateret opslagstabel over de mest almindelige tilsætningsstoffer i
 * nordiske produkter (NOVA-uddannelseslaget, 2026-07-09). Bevidst
 * NEUTRAL: navn + funktionskategori, ingen domme — alle stoffer på
 * listen er godkendt og løbende vurderet af EFSA. Tonen håndhæves af
 * ansvarlighedsreglerne (aldrig "farlig"; referér til navngivne
 * systemer). Ukendte koder vises som rå E-numre i UI'et.
 */

export interface AdditiveInfo {
  nameDa: string;
  nameEn: string;
  categoryDa: string;
  categoryEn: string;
}

export const ADDITIVE_INFO: Record<string, AdditiveInfo> = {
  e100: { nameDa: "Curcumin", nameEn: "Curcumin", categoryDa: "farvestof", categoryEn: "colour" },
  e101: { nameDa: "Riboflavin (B2)", nameEn: "Riboflavin (B2)", categoryDa: "farvestof", categoryEn: "colour" },
  e120: { nameDa: "Karmin", nameEn: "Carmine", categoryDa: "farvestof", categoryEn: "colour" },
  e150a: { nameDa: "Karamel", nameEn: "Plain caramel", categoryDa: "farvestof", categoryEn: "colour" },
  e160a: { nameDa: "Carotener", nameEn: "Carotenes", categoryDa: "farvestof", categoryEn: "colour" },
  e162: { nameDa: "Rødbedefarve", nameEn: "Beetroot red", categoryDa: "farvestof", categoryEn: "colour" },
  e163: { nameDa: "Anthocyaniner", nameEn: "Anthocyanins", categoryDa: "farvestof", categoryEn: "colour" },
  e200: { nameDa: "Sorbinsyre", nameEn: "Sorbic acid", categoryDa: "konserveringsmiddel", categoryEn: "preservative" },
  e202: { nameDa: "Kaliumsorbat", nameEn: "Potassium sorbate", categoryDa: "konserveringsmiddel", categoryEn: "preservative" },
  e211: { nameDa: "Natriumbenzoat", nameEn: "Sodium benzoate", categoryDa: "konserveringsmiddel", categoryEn: "preservative" },
  e250: { nameDa: "Natriumnitrit", nameEn: "Sodium nitrite", categoryDa: "konserveringsmiddel", categoryEn: "preservative" },
  e252: { nameDa: "Kaliumnitrat", nameEn: "Potassium nitrate", categoryDa: "konserveringsmiddel", categoryEn: "preservative" },
  e270: { nameDa: "Mælkesyre", nameEn: "Lactic acid", categoryDa: "surhedsregulator", categoryEn: "acidity regulator" },
  e296: { nameDa: "Æblesyre", nameEn: "Malic acid", categoryDa: "surhedsregulator", categoryEn: "acidity regulator" },
  e300: { nameDa: "Askorbinsyre (C-vitamin)", nameEn: "Ascorbic acid (vitamin C)", categoryDa: "antioxidant", categoryEn: "antioxidant" },
  e306: { nameDa: "Tocopheroler (E-vitamin)", nameEn: "Tocopherols (vitamin E)", categoryDa: "antioxidant", categoryEn: "antioxidant" },
  e322: { nameDa: "Lecithin", nameEn: "Lecithin", categoryDa: "emulgator", categoryEn: "emulsifier" },
  e330: { nameDa: "Citronsyre", nameEn: "Citric acid", categoryDa: "surhedsregulator", categoryEn: "acidity regulator" },
  e331: { nameDa: "Natriumcitrater", nameEn: "Sodium citrates", categoryDa: "surhedsregulator", categoryEn: "acidity regulator" },
  e401: { nameDa: "Natriumalginat", nameEn: "Sodium alginate", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
  e407: { nameDa: "Carrageenan", nameEn: "Carrageenan", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
  e410: { nameDa: "Johannesbrødkernemel", nameEn: "Locust bean gum", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
  e412: { nameDa: "Guargummi", nameEn: "Guar gum", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
  e415: { nameDa: "Xanthangummi", nameEn: "Xanthan gum", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
  e440: { nameDa: "Pektin", nameEn: "Pectin", categoryDa: "geleringsmiddel", categoryEn: "gelling agent" },
  e450: { nameDa: "Difosfater", nameEn: "Diphosphates", categoryDa: "stabilisator", categoryEn: "stabiliser" },
  e451: { nameDa: "Trifosfater", nameEn: "Triphosphates", categoryDa: "stabilisator", categoryEn: "stabiliser" },
  e452: { nameDa: "Polyfosfater", nameEn: "Polyphosphates", categoryDa: "stabilisator", categoryEn: "stabiliser" },
  e471: { nameDa: "Mono- og diglycerider", nameEn: "Mono- and diglycerides", categoryDa: "emulgator", categoryEn: "emulsifier" },
  e500: { nameDa: "Natriumkarbonater (natron)", nameEn: "Sodium carbonates", categoryDa: "hævemiddel", categoryEn: "raising agent" },
  e621: { nameDa: "Mononatriumglutamat", nameEn: "Monosodium glutamate", categoryDa: "smagsforstærker", categoryEn: "flavour enhancer" },
  e950: { nameDa: "Acesulfamkalium", nameEn: "Acesulfame K", categoryDa: "sødestof", categoryEn: "sweetener" },
  e951: { nameDa: "Aspartam", nameEn: "Aspartame", categoryDa: "sødestof", categoryEn: "sweetener" },
  e955: { nameDa: "Sucralose", nameEn: "Sucralose", categoryDa: "sødestof", categoryEn: "sweetener" },
  e960: { nameDa: "Steviolglycosider", nameEn: "Steviol glycosides", categoryDa: "sødestof", categoryEn: "sweetener" },
  e1442: { nameDa: "Modificeret stivelse", nameEn: "Modified starch", categoryDa: "fortykningsmiddel", categoryEn: "thickener" },
};

/** Normalisér en OFF-kode ("en:e330", "E330") og slå op. */
export function lookupAdditive(code: string): {
  code: string;
  info: AdditiveInfo | null;
} {
  const norm = code.toLowerCase().replace(/^en:/, "").trim();
  return { code: norm.toUpperCase(), info: ADDITIVE_INFO[norm] ?? null };
}
