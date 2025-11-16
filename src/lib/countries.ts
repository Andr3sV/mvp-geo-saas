// Complete list of countries with ISO codes for flag emojis
// Flag emoji is generated from ISO 3166-1 alpha-2 code

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string; // Unicode flag emoji
}

// Convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const countries: Country[] = [
  { code: 'GLOBAL', name: 'Global', flag: '🌍' },
  { code: 'US', name: 'United States', flag: getFlagEmoji('US') },
  { code: 'GB', name: 'United Kingdom', flag: getFlagEmoji('GB') },
  { code: 'CA', name: 'Canada', flag: getFlagEmoji('CA') },
  { code: 'AU', name: 'Australia', flag: getFlagEmoji('AU') },
  { code: 'DE', name: 'Germany', flag: getFlagEmoji('DE') },
  { code: 'FR', name: 'France', flag: getFlagEmoji('FR') },
  { code: 'ES', name: 'Spain', flag: getFlagEmoji('ES') },
  { code: 'IT', name: 'Italy', flag: getFlagEmoji('IT') },
  { code: 'NL', name: 'Netherlands', flag: getFlagEmoji('NL') },
  { code: 'SE', name: 'Sweden', flag: getFlagEmoji('SE') },
  { code: 'NO', name: 'Norway', flag: getFlagEmoji('NO') },
  { code: 'DK', name: 'Denmark', flag: getFlagEmoji('DK') },
  { code: 'FI', name: 'Finland', flag: getFlagEmoji('FI') },
  { code: 'PL', name: 'Poland', flag: getFlagEmoji('PL') },
  { code: 'BE', name: 'Belgium', flag: getFlagEmoji('BE') },
  { code: 'AT', name: 'Austria', flag: getFlagEmoji('AT') },
  { code: 'CH', name: 'Switzerland', flag: getFlagEmoji('CH') },
  { code: 'IE', name: 'Ireland', flag: getFlagEmoji('IE') },
  { code: 'PT', name: 'Portugal', flag: getFlagEmoji('PT') },
  { code: 'MX', name: 'Mexico', flag: getFlagEmoji('MX') },
  { code: 'BR', name: 'Brazil', flag: getFlagEmoji('BR') },
  { code: 'AR', name: 'Argentina', flag: getFlagEmoji('AR') },
  { code: 'CL', name: 'Chile', flag: getFlagEmoji('CL') },
  { code: 'CO', name: 'Colombia', flag: getFlagEmoji('CO') },
  { code: 'PE', name: 'Peru', flag: getFlagEmoji('PE') },
  { code: 'VE', name: 'Venezuela', flag: getFlagEmoji('VE') },
  { code: 'EC', name: 'Ecuador', flag: getFlagEmoji('EC') },
  { code: 'UY', name: 'Uruguay', flag: getFlagEmoji('UY') },
  { code: 'CR', name: 'Costa Rica', flag: getFlagEmoji('CR') },
  { code: 'PA', name: 'Panama', flag: getFlagEmoji('PA') },
  { code: 'JP', name: 'Japan', flag: getFlagEmoji('JP') },
  { code: 'CN', name: 'China', flag: getFlagEmoji('CN') },
  { code: 'IN', name: 'India', flag: getFlagEmoji('IN') },
  { code: 'KR', name: 'South Korea', flag: getFlagEmoji('KR') },
  { code: 'SG', name: 'Singapore', flag: getFlagEmoji('SG') },
  { code: 'HK', name: 'Hong Kong', flag: getFlagEmoji('HK') },
  { code: 'TW', name: 'Taiwan', flag: getFlagEmoji('TW') },
  { code: 'TH', name: 'Thailand', flag: getFlagEmoji('TH') },
  { code: 'MY', name: 'Malaysia', flag: getFlagEmoji('MY') },
  { code: 'ID', name: 'Indonesia', flag: getFlagEmoji('ID') },
  { code: 'PH', name: 'Philippines', flag: getFlagEmoji('PH') },
  { code: 'VN', name: 'Vietnam', flag: getFlagEmoji('VN') },
  { code: 'NZ', name: 'New Zealand', flag: getFlagEmoji('NZ') },
  { code: 'ZA', name: 'South Africa', flag: getFlagEmoji('ZA') },
  { code: 'AE', name: 'United Arab Emirates', flag: getFlagEmoji('AE') },
  { code: 'SA', name: 'Saudi Arabia', flag: getFlagEmoji('SA') },
  { code: 'IL', name: 'Israel', flag: getFlagEmoji('IL') },
  { code: 'TR', name: 'Turkey', flag: getFlagEmoji('TR') },
  { code: 'RU', name: 'Russia', flag: getFlagEmoji('RU') },
  { code: 'UA', name: 'Ukraine', flag: getFlagEmoji('UA') },
  { code: 'GR', name: 'Greece', flag: getFlagEmoji('GR') },
  { code: 'CZ', name: 'Czech Republic', flag: getFlagEmoji('CZ') },
  { code: 'RO', name: 'Romania', flag: getFlagEmoji('RO') },
  { code: 'HU', name: 'Hungary', flag: getFlagEmoji('HU') },
  { code: 'BG', name: 'Bulgaria', flag: getFlagEmoji('BG') },
  { code: 'HR', name: 'Croatia', flag: getFlagEmoji('HR') },
  { code: 'RS', name: 'Serbia', flag: getFlagEmoji('RS') },
  { code: 'SK', name: 'Slovakia', flag: getFlagEmoji('SK') },
  { code: 'SI', name: 'Slovenia', flag: getFlagEmoji('SI') },
  { code: 'LT', name: 'Lithuania', flag: getFlagEmoji('LT') },
  { code: 'LV', name: 'Latvia', flag: getFlagEmoji('LV') },
  { code: 'EE', name: 'Estonia', flag: getFlagEmoji('EE') },
  { code: 'IS', name: 'Iceland', flag: getFlagEmoji('IS') },
  { code: 'LU', name: 'Luxembourg', flag: getFlagEmoji('LU') },
  { code: 'MT', name: 'Malta', flag: getFlagEmoji('MT') },
  { code: 'CY', name: 'Cyprus', flag: getFlagEmoji('CY') },
  { code: 'EG', name: 'Egypt', flag: getFlagEmoji('EG') },
  { code: 'NG', name: 'Nigeria', flag: getFlagEmoji('NG') },
  { code: 'KE', name: 'Kenya', flag: getFlagEmoji('KE') },
  { code: 'MA', name: 'Morocco', flag: getFlagEmoji('MA') },
  { code: 'DZ', name: 'Algeria', flag: getFlagEmoji('DZ') },
  { code: 'TN', name: 'Tunisia', flag: getFlagEmoji('TN') },
  { code: 'GH', name: 'Ghana', flag: getFlagEmoji('GH') },
  { code: 'SN', name: 'Senegal', flag: getFlagEmoji('SN') },
  { code: 'CL', name: 'Chile', flag: getFlagEmoji('CL') },
  { code: 'BO', name: 'Bolivia', flag: getFlagEmoji('BO') },
  { code: 'PY', name: 'Paraguay', flag: getFlagEmoji('PY') },
  { code: 'GT', name: 'Guatemala', flag: getFlagEmoji('GT') },
  { code: 'HN', name: 'Honduras', flag: getFlagEmoji('HN') },
  { code: 'SV', name: 'El Salvador', flag: getFlagEmoji('SV') },
  { code: 'NI', name: 'Nicaragua', flag: getFlagEmoji('NI') },
  { code: 'DO', name: 'Dominican Republic', flag: getFlagEmoji('DO') },
  { code: 'CU', name: 'Cuba', flag: getFlagEmoji('CU') },
  { code: 'PR', name: 'Puerto Rico', flag: getFlagEmoji('PR') },
  { code: 'PK', name: 'Pakistan', flag: getFlagEmoji('PK') },
  { code: 'BD', name: 'Bangladesh', flag: getFlagEmoji('BD') },
  { code: 'LK', name: 'Sri Lanka', flag: getFlagEmoji('LK') },
  { code: 'NP', name: 'Nepal', flag: getFlagEmoji('NP') },
  { code: 'MM', name: 'Myanmar', flag: getFlagEmoji('MM') },
  { code: 'KH', name: 'Cambodia', flag: getFlagEmoji('KH') },
  { code: 'LA', name: 'Laos', flag: getFlagEmoji('LA') },
  { code: 'MN', name: 'Mongolia', flag: getFlagEmoji('MN') },
  { code: 'KZ', name: 'Kazakhstan', flag: getFlagEmoji('KZ') },
  { code: 'UZ', name: 'Uzbekistan', flag: getFlagEmoji('UZ') },
];

// Helper to get country by code
export function getCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return countries.find(c => c.code === 'GLOBAL');
  return countries.find(c => c.code.toLowerCase() === code.toLowerCase());
}

// Helper to search countries
export function searchCountries(query: string): Country[] {
  const lowerQuery = query.toLowerCase();
  return countries.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) || 
    c.code.toLowerCase().includes(lowerQuery)
  );
}

