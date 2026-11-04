const countryRows = [
  ["SA", "966", "Saudi Arabia", "السعودية"],
  ["JO", "962", "Jordan", "الأردن"],
  ["AE", "971", "United Arab Emirates", "الإمارات"],
  ["KW", "965", "Kuwait", "الكويت"],
  ["QA", "974", "Qatar", "قطر"],
  ["BH", "973", "Bahrain", "البحرين"],
  ["OM", "968", "Oman", "عُمان"],
  ["EG", "20", "Egypt", "مصر"],
  ["IQ", "964", "Iraq", "العراق"],
  ["SY", "963", "Syria", "سوريا"],
  ["LB", "961", "Lebanon", "لبنان"],
  ["PS", "970", "Palestine", "فلسطين"],
  ["YE", "967", "Yemen", "اليمن"],
  ["LY", "218", "Libya", "ليبيا"],
  ["TN", "216", "Tunisia", "تونس"],
  ["DZ", "213", "Algeria", "الجزائر"],
  ["MA", "212", "Morocco", "المغرب"],
  ["SD", "249", "Sudan", "السودان"],
  ["MR", "222", "Mauritania", "موريتانيا"],
  ["SO", "252", "Somalia", "الصومال"],
  ["DJ", "253", "Djibouti", "جيبوتي"],
  ["KM", "269", "Comoros", "جزر القمر"],
  ["US", "1", "United States", "الولايات المتحدة"],
  ["CA", "1", "Canada", "كندا"],
  ["GB", "44", "United Kingdom", "المملكة المتحدة"],
  ["IE", "353", "Ireland", "أيرلندا"],
  ["FR", "33", "France", "فرنسا"],
  ["DE", "49", "Germany", "ألمانيا"],
  ["IT", "39", "Italy", "إيطاليا"],
  ["ES", "34", "Spain", "إسبانيا"],
  ["PT", "351", "Portugal", "البرتغال"],
  ["NL", "31", "Netherlands", "هولندا"],
  ["BE", "32", "Belgium", "بلجيكا"],
  ["LU", "352", "Luxembourg", "لوكسمبورغ"],
  ["CH", "41", "Switzerland", "سويسرا"],
  ["AT", "43", "Austria", "النمسا"],
  ["SE", "46", "Sweden", "السويد"],
  ["NO", "47", "Norway", "النرويج"],
  ["DK", "45", "Denmark", "الدنمارك"],
  ["FI", "358", "Finland", "فنلندا"],
  ["IS", "354", "Iceland", "آيسلندا"],
  ["GR", "30", "Greece", "اليونان"],
  ["CY", "357", "Cyprus", "قبرص"],
  ["MT", "356", "Malta", "مالطا"],
  ["PL", "48", "Poland", "بولندا"],
  ["CZ", "420", "Czechia", "التشيك"],
  ["SK", "421", "Slovakia", "سلوفاكيا"],
  ["HU", "36", "Hungary", "المجر"],
  ["RO", "40", "Romania", "رومانيا"],
  ["BG", "359", "Bulgaria", "بلغاريا"],
  ["HR", "385", "Croatia", "كرواتيا"],
  ["SI", "386", "Slovenia", "سلوفينيا"],
  ["RS", "381", "Serbia", "صربيا"],
  ["BA", "387", "Bosnia and Herzegovina", "البوسنة والهرسك"],
  ["ME", "382", "Montenegro", "الجبل الأسود"],
  ["MK", "389", "North Macedonia", "مقدونيا الشمالية"],
  ["AL", "355", "Albania", "ألبانيا"],
  ["UA", "380", "Ukraine", "أوكرانيا"],
  ["TR", "90", "Turkey", "تركيا"],
  ["RU", "7", "Russia", "روسيا"],
  ["KZ", "7", "Kazakhstan", "كازاخستان"],
  ["GE", "995", "Georgia", "جورجيا"],
  ["AM", "374", "Armenia", "أرمينيا"],
  ["AZ", "994", "Azerbaijan", "أذربيجان"],
  ["IL", "972", "Israel", "إسرائيل"],
  ["IR", "98", "Iran", "إيران"],
  ["AF", "93", "Afghanistan", "أفغانستان"],
  ["PK", "92", "Pakistan", "باكستان"],
  ["IN", "91", "India", "الهند"],
  ["BD", "880", "Bangladesh", "بنغلاديش"],
  ["LK", "94", "Sri Lanka", "سريلانكا"],
  ["NP", "977", "Nepal", "نيبال"],
  ["CN", "86", "China", "الصين"],
  ["JP", "81", "Japan", "اليابان"],
  ["KR", "82", "South Korea", "كوريا الجنوبية"],
  ["TW", "886", "Taiwan", "تايوان"],
  ["HK", "852", "Hong Kong", "هونغ كونغ"],
  ["MO", "853", "Macao", "ماكاو"],
  ["SG", "65", "Singapore", "سنغافورة"],
  ["MY", "60", "Malaysia", "ماليزيا"],
  ["ID", "62", "Indonesia", "إندونيسيا"],
  ["TH", "66", "Thailand", "تايلاند"],
  ["VN", "84", "Vietnam", "فيتنام"],
  ["PH", "63", "Philippines", "الفلبين"],
  ["AU", "61", "Australia", "أستراليا"],
  ["NZ", "64", "New Zealand", "نيوزيلندا"],
  ["ZA", "27", "South Africa", "جنوب أفريقيا"],
  ["NG", "234", "Nigeria", "نيجيريا"],
  ["KE", "254", "Kenya", "كينيا"],
  ["ET", "251", "Ethiopia", "إثيوبيا"],
  ["ER", "291", "Eritrea", "إريتريا"],
  ["GH", "233", "Ghana", "غانا"],
  ["TZ", "255", "Tanzania", "تنزانيا"],
  ["UG", "256", "Uganda", "أوغندا"],
  ["BR", "55", "Brazil", "البرازيل"],
  ["MX", "52", "Mexico", "المكسيك"],
  ["AR", "54", "Argentina", "الأرجنتين"],
  ["CL", "56", "Chile", "تشيلي"],
  ["CO", "57", "Colombia", "كولومبيا"],
  ["PE", "51", "Peru", "بيرو"],
  ["VE", "58", "Venezuela", "فنزويلا"],
  ["UY", "598", "Uruguay", "الأوروغواي"],
  ["EC", "593", "Ecuador", "الإكوادور"],
  ["AW", "297", "Aruba", "أروبا"],
  ["CU", "53", "Cuba", "كوبا"],
  ["JM", "1", "Jamaica", "جامايكا"],
  ["DO", "1", "Dominican Republic", "جمهورية الدومينيكان"],
  ["PA", "507", "Panama", "بنما"],
  ["CR", "506", "Costa Rica", "كوستاريكا"],
  ["GT", "502", "Guatemala", "غواتيمالا"],
  ["UZ", "998", "Uzbekistan", "أوزبكستان"],
  ["TM", "993", "Turkmenistan", "تركمانستان"],
  ["KG", "996", "Kyrgyzstan", "قيرغيزستان"],
  ["TJ", "992", "Tajikistan", "طاجيكستان"],
  ["MN", "976", "Mongolia", "منغوليا"],
  ["KH", "855", "Cambodia", "كمبوديا"],
  ["LA", "856", "Laos", "لاوس"],
  ["MM", "95", "Myanmar", "ميانمار"],
  ["BN", "673", "Brunei", "بروناي"],
  ["MV", "960", "Maldives", "المالديف"],
  ["BT", "975", "Bhutan", "بوتان"],
  ["EE", "372", "Estonia", "إستونيا"],
  ["LV", "371", "Latvia", "لاتفيا"],
  ["LT", "370", "Lithuania", "ليتوانيا"],
  ["BY", "375", "Belarus", "بيلاروس"],
  ["MD", "373", "Moldova", "مولدوفا"],
  ["AD", "376", "Andorra", "أندورا"],
  ["MC", "377", "Monaco", "موناكو"],
  ["SM", "378", "San Marino", "سان مارينو"],
  ["LI", "423", "Liechtenstein", "ليختنشتاين"],
  ["XK", "383", "Kosovo", "كوسوفو"],
  ["AO", "244", "Angola", "أنغولا"],
  ["CM", "237", "Cameroon", "الكاميرون"],
  ["CI", "225", "Côte d'Ivoire", "ساحل العاج"],
  ["SN", "221", "Senegal", "السنغال"],
  ["ML", "223", "Mali", "مالي"],
  ["NE", "227", "Niger", "النيجر"],
  ["TD", "235", "Chad", "تشاد"],
  ["RW", "250", "Rwanda", "رواندا"],
  ["ZM", "260", "Zambia", "زامبيا"],
  ["ZW", "263", "Zimbabwe", "زيمبابوي"],
  ["NA", "264", "Namibia", "ناميبيا"],
  ["BW", "267", "Botswana", "بوتسوانا"],
  ["MU", "230", "Mauritius", "موريشيوس"],
  ["MG", "261", "Madagascar", "مدغشقر"],
  ["MZ", "258", "Mozambique", "موزمبيق"],
  ["SS", "211", "South Sudan", "جنوب السودان"],
] as const;

export type Country = {
  iso: string;
  dial: string;
  en: string;
  ar: string;
};

export const countries: Country[] = countryRows.map(([iso, dial, en, ar]) => ({ iso, dial, en, ar }));

const specificPatterns: Record<string, RegExp> = {
  SA: /^5\d{8}$/,
  JO: /^7\d{8}$/,
  AE: /^5\d{8}$/,
  KW: /^[569]\d{7}$/,
  QA: /^[3567]\d{7}$/,
  BH: /^[36]\d{7}$/,
  OM: /^[79]\d{7}$/,
  EG: /^1\d{9}$/,
  LB: /^[37]\d{6,7}$/,
  PS: /^5\d{8}$/,
  US: /^[2-9]\d{9}$/,
  CA: /^[2-9]\d{9}$/,
  GB: /^7\d{9}$/,
};

export function findCountry(iso: string) {
  return countries.find((country) => country.iso === iso.toUpperCase());
}

export function countryFromPhone(phone: string | null, iso: string | null) {
  const selected = iso ? findCountry(iso) : undefined;

  if (selected) {
    return selected;
  }

  const value = phone?.replace(/\s/g, "") ?? "";
  const matches = countries.filter((country) => value.startsWith(`+${country.dial}`));
  matches.sort((left, right) => right.dial.length - left.dial.length);
  const longest = matches[0]?.dial.length ?? 0;

  return matches.find((country) => country.dial.length === longest) ?? findCountry("SA")!;
}

export function nationalFromPhone(phone: string | null, country: Country) {
  if (!phone) {
    return "";
  }

  const prefix = `+${country.dial}`;
  return phone.startsWith(prefix) ? phone.slice(prefix.length) : phone.replace(/\D/g, "");
}

export function normalizeNationalNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^0+/, "");
}

export function isValidNationalNumber(iso: string, value: string) {
  const country = findCountry(iso);

  if (!country) {
    return false;
  }

  const national = normalizeNationalNumber(value);
  const pattern = specificPatterns[country.iso];

  if (pattern) {
    return pattern.test(national);
  }

  if (country.dial === "1") {
    return /^[2-9]\d{9}$/.test(national);
  }

  return /^\d{6,14}$/.test(national);
}
