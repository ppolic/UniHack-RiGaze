import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { AppLanguage, translations } from '../i18n/translations';

let currentLanguage: AppLanguage = 'ro';
const listeners = new Set<() => void>();
const storageKey = 'begreen.language';

function restoreLanguage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'ro' || saved === 'en') currentLanguage = saved;
  } catch { /* Storage may be unavailable; retain the shared in-memory preference. */ }
}

const EXACT_BACKEND_TRANSLATIONS: Array<{
  matches: string[];
  ro: string;
  en: string;
}> = [
  // Rewards titles & descriptions (DB seed & fallback)
  {
    matches: [
      'Besplatna karta za javni prijevoz',
      'Bilet gratuit pentru transportul public',
      'Free public transit ticket',
    ],
    ro: 'Bilet gratuit pentru transportul public',
    en: 'Free public transit ticket',
  },
  {
    matches: [
      'Jednokratna karta',
      'Bilet pentru o singură călătorie',
      'Single-ride ticket',
    ],
    ro: 'Bilet pentru o singură călătorie',
    en: 'Single-ride ticket',
  },
  {
    matches: ['Popust na kavu', 'Reducere la cafea', 'Coffee discount'],
    ro: 'Reducere la cafea',
    en: 'Coffee discount',
  },
  {
    matches: [
      '10% popusta kod partnera',
      '10% reducere la parteneri',
      '10% discount at partner locations',
    ],
    ro: '10% reducere la parteneri',
    en: '10% discount at partner locations',
  },
  {
    matches: [
      'Besplatna vožnja romobilom',
      'Cursă gratuită cu trotineta electrică',
      'Free e-scooter ride',
    ],
    ro: 'Cursă gratuită cu trotineta electrică',
    en: 'Free e-scooter ride',
  },
  {
    matches: ['30 minuta', '30 de minute', '30 minutes'],
    ro: '30 de minute',
    en: '30 minutes',
  },
  {
    matches: [
      'STPT Dnevna karta (Tramvaj / Bus / Vaporetto)',
      'Abonament de o zi STPT (Tramvai / Autobuz / Vaporetto)',
      'STPT Day Pass (Tram / Bus / Vaporetto)',
    ],
    ro: 'Abonament de o zi STPT (Tramvai / Autobuz / Vaporetto)',
    en: 'STPT Day Pass (Tram / Bus / Vaporetto)',
  },
  {
    matches: [
      'Cjelodnevna vožnja svim linijama javnog prijevoza u Timișoari (kod: STPT-ECO-2026)',
      'Călătorii nelimitate timp de o zi pe toate liniile de transport public din Timișoara (cod: STPT-ECO-2026)',
      'All-day unlimited rides on all public transit lines in Timișoara (code: STPT-ECO-2026)',
    ],
    ro: 'Călătorii nelimitate timp de o zi pe toate liniile de transport public din Timișoara (cod: STPT-ECO-2026)',
    en: 'All-day unlimited rides on all public transit lines in Timișoara (code: STPT-ECO-2026)',
  },
  {
    matches: [
      'VeloTM – 3 besplatna otključavanja bicikla',
      'VeloTM – 3 deblocări gratuite de bicicletă',
      'VeloTM – 3 free bike unlocks',
    ],
    ro: 'VeloTM – 3 deblocări gratuite de bicicletă',
    en: 'VeloTM – 3 free bike unlocks',
  },
  {
    matches: [
      'Voucher za sustav javnih bicikala VeloTM (kod: VELOTM-FREE3)',
      'Voucher pentru sistemul public de biciclete VeloTM (cod: VELOTM-FREE3)',
      'Voucher for the VeloTM public bike-sharing system (code: VELOTM-FREE3)',
    ],
    ro: 'Voucher pentru sistemul public de biciclete VeloTM (cod: VELOTM-FREE3)',
    en: 'Voucher for the VeloTM public bike-sharing system (code: VELOTM-FREE3)',
  },
  {
    matches: [
      'Tucano Coffee Iulius Town – Besplatna kava',
      'Tucano Coffee Iulius Town – Cafea gratuită',
      'Tucano Coffee Iulius Town – Free coffee',
    ],
    ro: 'Tucano Coffee Iulius Town – Cafea gratuită',
    en: 'Tucano Coffee Iulius Town – Free coffee',
  },
  {
    matches: [
      'Besplatna specialty kava za dolazak biciklom, pješke ili JPP-om (kod: TUCANO-GREEN)',
      'Cafea de specialitate gratuită pentru sosirea cu bicicleta, pe jos sau cu transportul public (cod: TUCANO-GREEN)',
      'Free specialty coffee when arriving by bike, on foot, or by public transit (code: TUCANO-GREEN)',
    ],
    ro: 'Cafea de specialitate gratuită pentru sosirea cu bicicleta, pe jos sau cu transportul public (cod: TUCANO-GREEN)',
    en: 'Free specialty coffee when arriving by bike, on foot, or by public transit (code: TUCANO-GREEN)',
  },

  // Travel Options titles, segments & warnings (Backend & Social modes)
  {
    matches: ['Pješke', 'Mers pe jos', 'Walk'],
    ro: 'Mers pe jos',
    en: 'Walk',
  },
  {
    matches: [
      'Pješke / pristupačna ruta bez barijera',
      'Mers pe jos / rută accesibilă fără bariere',
      'Walk / barrier-free accessible route',
    ],
    ro: 'Mers pe jos / rută accesibilă fără bariere',
    en: 'Walk / barrier-free accessible route',
  },
  {
    matches: [
      'Pješačka ruta do odredišta',
      'Pješke do odredišta',
      'Rută pietonală până la destinație',
      'Walking route to destination',
    ],
    ro: 'Rută pietonală până la destinație',
    en: 'Walking route to destination',
  },
  {
    matches: [
      'Pristupačna pješačka ruta prilagođena osobama s invaliditetom',
      'Rută pietonală accesibilă adaptată persoanelor cu dizabilități',
      'Accessible walking route adapted for people with disabilities',
    ],
    ro: 'Rută pietonală accesibilă adaptată persoanelor cu dizabilități',
    en: 'Accessible walking route adapted for people with disabilities',
  },
  {
    matches: [
      'Vlastiti bicikl',
      'Vlastiti bicikl (designated bike lanes)',
      'Bicicletă proprie (piste de biciclete dedicate)',
      'Own bicycle (designated bike lanes)',
    ],
    ro: 'Bicicletă proprie (piste de biciclete dedicate)',
    en: 'Own bicycle (designated bike lanes)',
  },
  {
    matches: [
      'Vožnja vlastitim biciklom do odredišta',
      'Deplasare cu bicicleta proprie până la destinație',
      'Ride your own bicycle to destination',
    ],
    ro: 'Deplasare cu bicicleta proprie până la destinație',
    en: 'Ride your own bicycle to destination',
  },
  {
    matches: ['Najam bicikla', 'Închiriere bicicletă (VeloTM)', 'Bike rental (VeloTM)'],
    ro: 'Închiriere bicicletă (VeloTM)',
    en: 'Bike rental (VeloTM)',
  },
  {
    matches: [
      'Vlastiti e-romobil',
      'Vlastiti e-romobil (ograničenje < 25 km/h)',
      'Trotinetă electrică proprie (limită < 25 km/h)',
      'Own e-scooter (speed limit < 25 km/h)',
    ],
    ro: 'Trotinetă electrică proprie (limită < 25 km/h)',
    en: 'Own e-scooter (speed limit < 25 km/h)',
  },
  {
    matches: [
      'Vožnja vlastitim e-romobilom do odredišta',
      'Deplasare cu trotineta electrică proprie până la destinație',
      'Ride your own e-scooter to destination',
    ],
    ro: 'Deplasare cu trotineta electrică proprie până la destinație',
    en: 'Ride your own e-scooter to destination',
  },
  {
    matches: ['Najam e-romobila', 'Închiriere trotinetă electrică', 'E-scooter rental'],
    ro: 'Închiriere trotinetă electrică',
    en: 'E-scooter rental',
  },
  {
    matches: [
      'Javni prijevoz (autobus / tramvaj)',
      'Transport public (autobuz / tramvai)',
      'Public transit (bus / tram)',
    ],
    ro: 'Transport public (autobuz / tramvai)',
    en: 'Public transit (bus / tram)',
  },
  {
    matches: [
      'Pristupačni javni prijevoz (niskopodno vozilo)',
      'Transport public accesibil (vehicul cu podea joasă)',
      'Accessible public transit (low-floor vehicle)',
    ],
    ro: 'Transport public accesibil (vehicul cu podea joasă)',
    en: 'Accessible public transit (low-floor vehicle)',
  },
  {
    matches: [
      'Pristupačan dolazak do stanice',
      'Acces fără bariere până la stație',
      'Barrier-free access to stop',
    ],
    ro: 'Acces fără bariere până la stație',
    en: 'Barrier-free access to stop',
  },
  {
    matches: [
      'Pješke do stanice javnog prijevoza',
      'Mers pe jos până la stația de transport public',
      'Walk to public transit stop',
    ],
    ro: 'Mers pe jos până la stația de transport public',
    en: 'Walk to public transit stop',
  },
  {
    matches: [
      'Vožnja niskopodnim pristupačnim vozilom',
      'Călătorie cu vehicul accesibil cu podea joasă',
      'Ride on a low-floor accessible vehicle',
    ],
    ro: 'Călătorie cu vehicul accesibil cu podea joasă',
    en: 'Ride on a low-floor accessible vehicle',
  },
  {
    matches: [
      'Vožnja javnim prijevozom',
      'Călătorie cu transportul public',
      'Public transit ride',
    ],
    ro: 'Călătorie cu transportul public',
    en: 'Public transit ride',
  },
  {
    matches: [
      'Pristupačan put od stanice do odredišta',
      'Traseu accesibil de la stație până la destinație',
      'Accessible path from stop to destination',
    ],
    ro: 'Traseu accesibil de la stație până la destinație',
    en: 'Accessible path from stop to destination',
  },
  {
    matches: [
      'Pješke od stanice do odredišta',
      'Mers pe jos de la stație până la destinație',
      'Walk from stop to destination',
    ],
    ro: 'Mers pe jos de la stație până la destinație',
    en: 'Walk from stop to destination',
  },
  {
    matches: [
      'Kombinirano: Bicikl + Javni prijevoz',
      'Combinat: Bicicletă + Transport public',
      'Combined: Bike + Public Transit',
    ],
    ro: 'Combinat: Bicicletă + Transport public',
    en: 'Combined: Bike + Public Transit',
  },
  {
    matches: [
      'Vožnja biciklom do multimodalnog čvorišta',
      'Deplasare cu bicicleta până la nodul multimodal',
      'Bike ride to multimodal hub',
    ],
    ro: 'Deplasare cu bicicleta până la nodul multimodal',
    en: 'Bike ride to multimodal hub',
  },
  {
    matches: [
      'Nastavak javnim prijevozom do odredišta',
      'Continuare cu transportul public până la destinație',
      'Continue by public transit to destination',
    ],
    ro: 'Continuare cu transportul public până la destinație',
    en: 'Continue by public transit to destination',
  },
  {
    matches: [
      'Osobno vozilo + rezervirano invalidsko parkiralište',
      'Mașină personală + parcare rezervată persoanelor cu dizabilități',
      'Personal car + reserved accessible parking',
    ],
    ro: 'Mașină personală + parcare rezervată persoanelor cu dizabilități',
    en: 'Personal car + reserved accessible parking',
  },
  {
    matches: [
      'Osobno vozilo + preporučeno parkiralište',
      'Mașină personală + parcare recomandată',
      'Personal car + recommended parking',
    ],
    ro: 'Mașină personală + parcare recomandată',
    en: 'Personal car + recommended parking',
  },
  {
    matches: [
      'Vožnja osobnim vozilom do parkirališta',
      'Deplasare cu mașina personală până la parcare',
      'Drive personal car to parking',
    ],
    ro: 'Deplasare cu mașina personală până la parcare',
    en: 'Drive personal car to parking',
  },
  {
    matches: [
      'Pristupačan put od invalidskog parkirališta do odredišta',
      'Traseu accesibil de la parcarea adaptată până la destinație',
      'Accessible path from accessible parking to destination',
    ],
    ro: 'Traseu accesibil de la parcarea adaptată până la destinație',
    en: 'Accessible path from accessible parking to destination',
  },
  {
    matches: [
      'Pješke od parkirališta do odredišta',
      'Mers pe jos de la parcare până la destinație',
      'Walk from parking to destination',
    ],
    ro: 'Mers pe jos de la parcare până la destinație',
    en: 'Walk from parking to destination',
  },
  {
    matches: [
      'Šetnja u društvu verificiranog Walk Buddyja',
      'Mers pe jos împreună cu un partener verificat Walk Buddy',
      'Walking together with a verified Walk Buddy companion',
    ],
    ro: 'Mers pe jos împreună cu un partener verificat Walk Buddy',
    en: 'Walking together with a verified Walk Buddy companion',
  },
  {
    matches: [
      'Zajednička biciklistička vožnja u grupi (Bike Pool)',
      'Deplasare în grup cu bicicleta (Bike Pool)',
      'Group cycling ride (Bike Pool)',
    ],
    ro: 'Deplasare în grup cu bicicleta (Bike Pool)',
    en: 'Group cycling ride (Bike Pool)',
  },
  {
    matches: [
      'Verified Carpool 🚗👥',
      'Carpool verificat 🚗👥',
      'Carpool 🚗👥',
    ],
    ro: 'Carpool verificat 🚗👥',
    en: 'Verified Carpool 🚗👥',
  },
  {
    matches: [
      'Zakon: Za dob 14–15 godina obavezno je nošenje zaštitne kacige pri vožnji bicikla i e-romobila.',
      'Zakon (14–15 god.): Nošenje zaštitne kacige je obavezno za vožnju bicikla i e-romobila na kolniku i stazama.',
      'Lege (14–15 ani): Purtarea căștii de protecție este obligatorie pentru bicicletă și trotinetă pe carosabil și piste.',
      'Law (ages 14–15): Wearing a protective helmet is mandatory for bikes and e-scooters on roads and lanes.',
    ],
    ro: 'Lege (14–15 ani): Purtarea căștii de protecție este obligatorie pentru bicicletă și trotinetă pe carosabil și piste.',
    en: 'Law (ages 14–15): Wearing a protective helmet is mandatory for bikes and e-scooters on roads and lanes.',
  },
  {
    matches: [
      'Zahtjevna ruta: značajan uspon na odabranoj dionici.',
      'Traseu solicitant: urcare semnificativă pe sectorul selectat.',
      'Demanding route: significant climb on the selected section.',
    ],
    ro: 'Traseu solicitant: urcare semnificativă pe sectorul selectat.',
    en: 'Demanding route: significant climb on the selected section.',
  },
  {
    matches: [
      'Vremenski uvjeti: kiša/snijeg – smanjena vidljivost i sklizak kolnik za bicikl i romobil.',
      'Condiții meteo: ploaie/ninsoare – vizibilitate redusă și carosabil alunecos pentru bicicletă și trotinetă.',
      'Weather conditions: rain/snow – reduced visibility and slippery road for bikes and scooters.',
    ],
    ro: 'Condiții meteo: ploaie/ninsoare – vizibilitate redusă și carosabil alunecos pentru bicicletă și trotinetă.',
    en: 'Weather conditions: rain/snow – reduced visibility and slippery road for bikes and scooters.',
  },
  {
    matches: [
      'Niska temperatura (< 5°C): preporučena topla odjeća ili korištenje javnog prijevoza.',
      'Temperatură scăzută (< 5°C): se recomandă îmbrăcăminte călduroasă sau utilizarea transportului public.',
      'Low temperature (< 5°C): warm clothing or public transit is recommended.',
    ],
    ro: 'Temperatură scăzută (< 5°C): se recomandă îmbrăcăminte călduroasă sau utilizarea transportului public.',
    en: 'Low temperature (< 5°C): warm clothing or public transit is recommended.',
  },
  {
    matches: [
      'Dio rute nema označenu biciklističku stazu – potreban povećan oprez u prometu.',
      'O parte din traseu nu are pistă de biciclete marcată – atenție sporită în trafic.',
      'Part of the route has no marked bike lane – extra caution in traffic is required.',
    ],
    ro: 'O parte din traseu nu are pistă de biciclete marcată – atenție sporită în trafic.',
    en: 'Part of the route has no marked bike lane – extra caution in traffic is required.',
  },
  {
    matches: [
      'Za odabrano odredište nije pronađena ruta bez arhitektonskih barijera za invalidska kolica.',
      'Pentru destinația selectată nu a fost găsită o rută fără bariere arhitecturale pentru scaun rulant.',
      'No barrier-free wheelchair route was found for the selected destination.',
    ],
    ro: 'Pentru destinația selectată nu a fost găsită o rută fără bariere arhitecturale pentru scaun rulant.',
    en: 'No barrier-free wheelchair route was found for the selected destination.',
  },
  {
    matches: ['Vlastiti romobil', 'Trotinetă proprie', 'Own e-scooter'],
    ro: 'Trotinetă proprie',
    en: 'Own e-scooter',
  },
  {
    matches: ['Najam romobila', 'Închiriere trotinetă', 'E-scooter rental'],
    ro: 'Închiriere trotinetă',
    en: 'E-scooter rental',
  },
  {
    matches: ['Tramvaj 8 (pristupačno vozilo)', 'Tramvai 8 (vehicul accesibil)', 'Tram 8 (accessible vehicle)'],
    ro: 'Tramvai 8 (vehicul accesibil)',
    en: 'Tram 8 (accessible vehicle)',
  },
  {
    matches: ['Tramvaj 8', 'Tramvai 8', 'Tram 8'],
    ro: 'Tramvai 8',
    en: 'Tram 8',
  },
  {
    matches: ['Tramvaj 8 do odredišta', 'Tramvai 8 până la destinație', 'Tram 8 to destination'],
    ro: 'Tramvai 8 până la destinație',
    en: 'Tram 8 to destination',
  },
  {
    matches: ['Auto + invalidsko parkirno mjesto', 'Mașină + loc de parcare PMR', 'Car + accessible parking spot'],
    ro: 'Mașină + loc de parcare PMR',
    en: 'Car + accessible parking spot',
  },
  {
    matches: ['Auto + parking', 'Mașină + parcare', 'Car + parking'],
    ro: 'Mașină + parcare',
    en: 'Car + parking',
  },
  {
    matches: ['Vožnja do parkinga', 'Condus până la parcare', 'Drive to parking'],
    ro: 'Condus până la parcare',
    en: 'Drive to parking',
  },
  {
    matches: ['Pješke od parkinga', 'Mers pe jos de la parcare', 'Walk from parking'],
    ro: 'Mers pe jos de la parcare',
    en: 'Walk from parking',
  },
  {
    matches: ['Pješke do stanice', 'Mers pe jos până la stație', 'Walk to stop'],
    ro: 'Mers pe jos până la stație',
    en: 'Walk to stop',
  },
  {
    matches: ['Vožnja biciklom', 'Deplasare cu bicicleta', 'Bike ride'],
    ro: 'Deplasare cu bicicleta',
    en: 'Bike ride',
  },
  {
    matches: ['Vožnja romobilom', 'Deplasare cu trotineta', 'E-scooter ride'],
    ro: 'Deplasare cu trotineta',
    en: 'E-scooter ride',
  },
  {
    matches: [
      'Kiša: vožnja bicikla je manje ugodna i sigurna.',
      'Ploaie: mersul cu bicicleta este mai puțin confortabil și sigur.',
      'Rain: cycling is less comfortable and safe.',
    ],
    ro: 'Ploaie: mersul cu bicicleta este mai puțin confortabil și sigur.',
    en: 'Rain: cycling is less comfortable and safe.',
  },
  {
    matches: [
      'Kiša: vožnja romobila nije preporučena.',
      'Ploaie: mersul cu trotineta nu este recomandat.',
      'Rain: e-scooter riding is not recommended.',
    ],
    ro: 'Ploaie: mersul cu trotineta nu este recomandat.',
    en: 'Rain: e-scooter riding is not recommended.',
  },
  {
    matches: [
      'Snijeg: klizav kolnik, vožnja bicikla se ne preporučuje.',
      'Ninsoare: carosabil alunecos, mersul cu bicicleta nu este recomandat.',
      'Snow: slippery road, cycling is not recommended.',
    ],
    ro: 'Ninsoare: carosabil alunecos, mersul cu bicicleta nu este recomandat.',
    en: 'Snow: slippery road, cycling is not recommended.',
  },
  {
    matches: [
      'Snijeg: vožnja romobila je opasna zbog klizavog kolnika.',
      'Ninsoare: mersul cu trotineta este periculos din cauza carosabilului alunecos.',
      'Snow: e-scooter riding is dangerous due to slippery road.',
    ],
    ro: 'Ninsoare: mersul cu trotineta este periculos din cauza carosabilului alunecos.',
    en: 'Snow: e-scooter riding is dangerous due to slippery road.',
  },
  {
    matches: [
      'Niske temperature: preporučena je topla odjeća i rukavice.',
      'Temperaturi scăzute: se recomandă îmbrăcăminte călduroasă și mănuși.',
      'Low temperatures: warm clothing and gloves are recommended.',
    ],
    ro: 'Temperaturi scăzute: se recomandă îmbrăcăminte călduroasă și mănuși.',
    en: 'Low temperatures: warm clothing and gloves are recommended.',
  },
  {
    matches: [
      'Jak vjetar: otežana stabilnost na biciklu i romobilu.',
      'Vânt puternic: stabilitate redusă pe bicicletă și trotinetă.',
      'Strong wind: reduced stability on bicycles and e-scooters.',
    ],
    ro: 'Vânt puternic: stabilitate redusă pe bicicletă și trotinetă.',
    en: 'Strong wind: reduced stability on bicycles and e-scooters.',
  },
  {
    matches: [
      'Jak vjetar: otežana vožnja i smanjena stabilnost.',
      'Vânt puternic: deplasare îngreunată și stabilitate redusă.',
      'Strong wind: difficult riding and reduced stability.',
    ],
    ro: 'Vânt puternic: deplasare îngreunată și stabilitate redusă.',
    en: 'Strong wind: difficult riding and reduced stability.',
  },
  {
    matches: [
      'Kaciga je obavezna za osobe mlađe od 16 godina.',
      'Casca de protecție este obligatorie pentru persoanele sub 16 ani.',
      'A helmet is mandatory for riders under 16 years old.',
    ],
    ro: 'Casca de protecție este obligatorie pentru persoanele sub 16 ani.',
    en: 'A helmet is mandatory for riders under 16 years old.',
  },
];

const AIR_QUALITY_NOTES: Record<string, { ro: string; en: string }> = {
  'gust tranzitni promet i povišene čestice PM10/PM2.5': {
    ro: 'traficul de tranzit intens și particulele PM10/PM2.5 ridicate',
    en: 'heavy transit traffic and elevated PM10/PM2.5 particles',
  },
  'ulazni prometni pravac s povišenom razinom ispušnih plinova': {
    ro: 'artera de intrare cu nivel ridicat de gaze de eșapament',
    en: 'inbound traffic corridor with elevated exhaust emissions',
  },
  'pojačan promet kroz podvožnjak i križanje uz kampus': {
    ro: 'traficul intens prin pasaj și intersecția de lângă campus',
    en: 'heavy traffic through the underpass and campus intersection',
  },
  'pojačana koncentracija PM2.5 čestica uz željezničko i autobusno čvorište': {
    ro: 'concentrația crescută de particule PM2.5 lângă nodul feroviar și de autobuze',
    en: 'elevated PM2.5 concentration near the rail and bus hub',
  },
  'industrijska i teretna zona s nižom kvalitetom zraka': {
    ro: 'zona industrială și de marfă cu o calitate mai scăzută a aerului',
    en: 'industrial and freight zone with lower air quality',
  },
  'povišena koncentracija lebdećih čestica u zraku': {
    ro: 'concentrația crescută de particule în suspensie în aer',
    en: 'elevated concentration of airborne particulate matter',
  },
};

const AIR_QUALITY_ZONES: Record<string, { ro: string; en: string }> = {
  'RNMCA TM-1 Calea Șagului (prometni koridor)': {
    ro: 'RNMCA TM-1 Calea Șagului (coridor de trafic)',
    en: 'RNMCA TM-1 Calea Șagului (traffic corridor)',
  },
  'Čvorište Pasaj Michelangelo / Bd. Vasile Pârvan': {
    ro: 'Nodul Pasaj Michelangelo / Bd. Vasile Pârvan',
    en: 'Pasaj Michelangelo / Bd. Vasile Pârvan Junction',
  },
  'Calea Buziașului – Industrijska zona': {
    ro: 'Calea Buziașului – Zona industrială',
    en: 'Calea Buziașului – Industrial Zone',
  },
  'Gradsko područje Timișoare': {
    ro: 'Zona urbană Timișoara',
    en: 'Timișoara urban area',
  },
};

const AIR_QUALITY_MODES: Record<string, { ro: string; en: string }> = {
  hodanje: { ro: 'mersul pe jos', en: 'walking' },
  'vožnja bicikla': { ro: 'mersul cu bicicleta', en: 'cycling' },
  'vožnja romobila': { ro: 'mersul cu trotineta', en: 'e-scooter riding' },
  'aktivni dio rute': { ro: 'partea activă a traseului', en: 'the active part of the route' },
};

const REGEX_BACKEND_TRANSLATIONS: Array<{
  patterns: RegExp[];
  ro: (...args: string[]) => string;
  en: (...args: string[]) => string;
}> = [
  {
    patterns: [
      /^Vožnja vlastitim biciklom \((\d+)% po biciklističkim stazama Timișoare\)$/,
      /^Deplasare cu bicicleta proprie \((\d+)% pe pistele de biciclete din Timișoara\)$/,
      /^Ride your own bicycle \((\d+)% on Timișoara bike lanes\)$/,
    ],
    ro: (pct) => `Deplasare cu bicicleta proprie (${pct}% pe pistele de biciclete din Timișoara)`,
    en: (pct) => `Ride your own bicycle (${pct}% on Timișoara bike lanes)`,
  },
  {
    patterns: [
      /^Najam bicikla – (.+)$/,
      /^Închiriere bicicletă – (.+)$/,
      /^Bike rental – (.+)$/,
    ],
    ro: (st) => `Închiriere bicicletă – ${st}`,
    en: (st) => `Bike rental – ${st}`,
  },
  {
    patterns: [
      /^Pješke do stanice (.+) \((\d+) dostupnih bicikala\)$/,
      /^Mers pe jos până la stația (.+) \((\d+) biciclete disponibile\)$/,
      /^Walk to station (.+) \((\d+) bikes available\)$/,
    ],
    ro: (st, n) => `Mers pe jos până la stația ${st} (${n} biciclete disponibile)`,
    en: (st, n) => `Walk to station ${st} (${n} bikes available)`,
  },
  {
    patterns: [
      /^Vožnja biciklom od (.+) do odredišta$/,
      /^Deplasare cu bicicleta de la (.+) până la destinație$/,
      /^Bike ride from (.+) to destination$/,
    ],
    ro: (st) => `Deplasare cu bicicleta de la ${st} până la destinație`,
    en: (st) => `Bike ride from ${st} to destination`,
  },
  {
    patterns: [
      /^Vožnja vlastitim e-romobilom \(maks\. zakonska brzina < 25 km\/h, prosjek (\d+) km\/h\)$/,
      /^Deplasare cu trotineta electrică proprie \(viteză max\. legală < 25 km\/h, medie (\d+) km\/h\)$/,
      /^Ride your own e-scooter \(max legal speed < 25 km\/h, avg (\d+) km\/h\)$/,
    ],
    ro: (spd) => `Deplasare cu trotineta electrică proprie (viteză max. legală < 25 km/h, medie ${spd} km/h)`,
    en: (spd) => `Ride your own e-scooter (max legal speed < 25 km/h, avg ${spd} km/h)`,
  },
  {
    patterns: [
      /^Vožnja vlastitim e-romobilom \(maks\. brzina 25 km\/h, (\d+)% po stazama\)$/,
      /^Deplasare cu trotineta electrică proprie \(viteză max\. 25 km\/h, (\d+)% pe piste\)$/,
      /^Ride your own e-scooter \(max speed 25 km\/h, (\d+)% on bike lanes\)$/,
    ],
    ro: (pct) => `Deplasare cu trotineta electrică proprie (viteză max. 25 km/h, ${pct}% pe piste)`,
    en: (pct) => `Ride your own e-scooter (max speed 25 km/h, ${pct}% on bike lanes)`,
  },
  {
    patterns: [
      /^Najam e-romobila – (.+)$/,
      /^Închiriere trotinetă electrică – (.+)$/,
      /^E-scooter rental – (.+)$/,
    ],
    ro: (st) => `Închiriere trotinetă electrică – ${st}`,
    en: (st) => `E-scooter rental – ${st}`,
  },
  {
    patterns: [
      /^Pješke do lokacije (.+) \((\d+) (?:slobodnih|dostupnih) romobila\)$/,
      /^Mers pe jos până la locația (.+) \((\d+) trotinete disponibile\)$/,
      /^Walk to location (.+) \((\d+) scooters available\)$/,
    ],
    ro: (st, n) => `Mers pe jos până la locația ${st} (${n} trotinete disponibile)`,
    en: (st, n) => `Walk to location ${st} (${n} scooters available)`,
  },
  {
    patterns: [
      /^Vožnja e-romobilom \(< 25 km\/h\) od (.+) do odredišta$/,
      /^Deplasare cu trotineta electrică \(< 25 km\/h\) de la (.+) până la destinație$/,
      /^E-scooter ride \(< 25 km\/h\) from (.+) to destination$/,
    ],
    ro: (st) => `Deplasare cu trotineta electrică (< 25 km/h) de la ${st} până la destinație`,
    en: (st) => `E-scooter ride (< 25 km/h) from ${st} to destination`,
  },
  {
    patterns: [
      /^STPT (.+) \(niskopodno \/ pristupačno vozilo\)$/,
      /^STPT (.+) \(vehicul accesibil cu podea joasă\)$/,
      /^STPT (.+) \(low-floor \/ accessible vehicle\)$/,
    ],
    ro: (line) => `STPT ${line} (vehicul accesibil cu podea joasă)`,
    en: (line) => `STPT ${line} (low-floor / accessible vehicle)`,
  },
  {
    patterns: [
      /^Javni prijevoz STPT – (.+)$/,
      /^Transport public STPT – (.+)$/,
      /^STPT Public Transit – (.+)$/,
    ],
    ro: (line) => `Transport public STPT – ${line}`,
    en: (line) => `STPT Public Transit – ${line}`,
  },
  {
    patterns: [
      /^Pješke do STPT stanice (.+)$/,
      /^Mers pe jos până la stația STPT (.+)$/,
      /^Walk to STPT stop (.+)$/,
    ],
    ro: (st) => `Mers pe jos până la stația STPT ${st}`,
    en: (st) => `Walk to STPT stop ${st}`,
  },
  {
    patterns: [
      /^(.+): (.+) → (.+) \(polasci svakih 6–10 min\)$/,
      /^(.+): (.+) → (.+) \(plecări la fiecare 6–10 min\)$/,
      /^(.+): (.+) → (.+) \(departures every 6–10 min\)$/,
    ],
    ro: (line, a, b) => `${line}: ${a} → ${b} (plecări la fiecare 6–10 min)`,
    en: (line, a, b) => `${line}: ${a} → ${b} (departures every 6–10 min)`,
  },
  {
    patterns: [
      /^Pješke od stanice (.+) do odredišta$/,
      /^Mers pe jos de la stația (.+) până la destinație$/,
      /^Walk from stop (.+) to destination$/,
    ],
    ro: (st) => `Mers pe jos de la stația ${st} până la destinație`,
    en: (st) => `Walk from stop ${st} to destination`,
  },
  {
    patterns: [
      /^Green Intelligence: Bicikl \+ (.+)$/,
      /^Green Intelligence: Bicicletă \+ (.+)$/,
      /^Green Intelligence: Bike \+ (.+)$/,
    ],
    ro: (line) => `Green Intelligence: Bicicletă + ${line}`,
    en: (line) => `Green Intelligence: Bike + ${line}`,
  },
  {
    patterns: [
      /^Biciklističkom stazom do čvorišta (.+)$/,
      /^Pe pista de biciclete până la nodul (.+)$/,
      /^Along bike lane to hub (.+)$/,
    ],
    ro: (hub) => `Pe pista de biciclete până la nodul ${hub}`,
    en: (hub) => `Along bike lane to hub ${hub}`,
  },
  {
    patterns: [
      /^(.+) od (.+) do (.+) \(izbjegava dionicu bez biciklističke staze\)$/,
      /^(.+) de la (.+) la (.+) \(evită sectorul fără pistă de biciclete\)$/,
      /^(.+) from (.+) to (.+) \(avoids section without bike lane\)$/,
    ],
    ro: (line, a, b) => `${line} de la ${a} la ${b} (evită sectorul fără pistă de biciclete)`,
    en: (line, a, b) => `${line} from ${a} to ${b} (avoids section without bike lane)`,
  },
  {
    patterns: [
      /^Osobno vozilo \+ invalidsko mjesto \((.+)\)$/,
      /^Mașină personală \+ loc accesibil \((.+)\)$/,
      /^Personal car \+ accessible parking \((.+)\)$/,
    ],
    ro: (pk) => `Mașină personală + loc accesibil (${pk})`,
    en: (pk) => `Personal car + accessible parking (${pk})`,
  },
  {
    patterns: [
      /^Osobno vozilo \+ (.+)$/,
      /^Mașină personală \+ (.+)$/,
      /^Personal car \+ (.+)$/,
    ],
    ro: (pk) => `Mașină personală + ${pk}`,
    en: (pk) => `Personal car + ${pk}`,
  },
  {
    patterns: [
      /^Vožnja do parkirališta (.+) – (\d+) slobodnih invalidskih mjesta \(0 RON\/h\)$/,
      /^Condus până la parcarea (.+) – (\d+) locuri PMR libere \(0 RON\/h\)$/,
      /^Drive to parking (.+) – (\d+) free accessible spots \(0 RON\/h\)$/,
    ],
    ro: (pk, n) => `Condus până la parcarea ${pk} – ${n} locuri PMR libere (0 RON/h)`,
    en: (pk, n) => `Drive to parking ${pk} – ${n} free accessible spots (0 RON/h)`,
  },
  {
    patterns: [
      /^Vožnja do parkirališta (.+) – (\d+) slobodnih mjesta \((.+) RON\/h, (.+)\)$/,
      /^Condus până la parcarea (.+) – (\d+) locuri libere \((.+) RON\/h, (.+)\)$/,
      /^Drive to parking (.+) – (\d+) free spots \((.+) RON\/h, (.+)\)$/,
    ],
    ro: (pk, n, rate, zone) => `Condus până la parcarea ${pk} – ${n} locuri libere (${rate} RON/h, ${zone})`,
    en: (pk, n, rate, zone) => `Drive to parking ${pk} – ${n} free spots (${rate} RON/h, ${zone})`,
  },
  {
    patterns: [
      /^Vožnja do parkirališta (.+) – (\d+) rezerviranih invalidskih mjesta \(besplatno\)$/,
      /^Condus până la parcarea (.+) – (\d+) locuri rezervate PMR \(gratuit\)$/,
      /^Drive to parking (.+) – (\d+) reserved accessible spots \(free\)$/,
    ],
    ro: (pk, n) => `Condus până la parcarea ${pk} – ${n} locuri rezervate PMR (gratuit)`,
    en: (pk, n) => `Drive to parking ${pk} – ${n} reserved accessible spots (free)`,
  },
  {
    patterns: [
      /^Vožnja do parkirališta (.+) – (\d+)\/(\d+) slobodnih mjesta \((.+) RON\/h\)$/,
      /^Condus până la parcarea (.+) – (\d+)\/(\d+) locuri libere \((.+) RON\/h\)$/,
      /^Drive to parking (.+) – (\d+)\/(\d+) free spots \((.+) RON\/h\)$/,
    ],
    ro: (pk, a, t, rate) => `Condus până la parcarea ${pk} – ${a}/${t} locuri libere (${rate} RON/h)`,
    en: (pk, a, t, rate) => `Drive to parking ${pk} – ${a}/${t} free spots (${rate} RON/h)`,
  },
  {
    patterns: [
      /^Pristupačan put bez barijera \(wheelchair\) od parkirališta (.+) do odredišta$/,
      /^Traseu accesibil fără bariere \(scaun rulant\) de la parcarea (.+) până la destinație$/,
      /^Barrier-free accessible path \(wheelchair\) from parking (.+) to destination$/,
    ],
    ro: (pk) => `Traseu accesibil fără bariere (scaun rulant) de la parcarea ${pk} până la destinație`,
    en: (pk) => `Barrier-free accessible path (wheelchair) from parking ${pk} to destination`,
  },
  {
    patterns: [
      /^Pješke od parkirališta (.+) do odredišta$/,
      /^Mers pe jos de la parcarea (.+) până la destinație$/,
      /^Walk from parking (.+) to destination$/,
    ],
    ro: (pk) => `Mers pe jos de la parcarea ${pk} până la destinație`,
    en: (pk) => `Walk from parking ${pk} to destination`,
  },
  {
    patterns: [
      /^Wheelchair filtriranje: Stanica '(.+)' nema pristup za kolica – ruta je preusmjerena na najbližu niskopodnu STPT stanicu \((.+) → (.+)\)\.$/,
    ],
    ro: (skipped, s1, s2) =>
      `Filtrare scaun rulant: Stația '${skipped}' nu are acces pentru scaun rulant – traseul a fost redirecționat către cea mai apropiată stație STPT cu podea joasă (${s1} → ${s2}).`,
    en: (skipped, s1, s2) =>
      `Wheelchair filter: Stop '${skipped}' has no wheelchair access – route redirected to the nearest low-floor STPT stop (${s1} → ${s2}).`,
  },
  {
    patterns: [
      /^Wheelchair filtriranje: Najbliže parkiralište \((.+)\) nema označena invalidska mjesta – odabrano je prilagođeno parkiralište (.+)\.$/,
    ],
    ro: (p1, p2) =>
      `Filtrare scaun rulant: Cea mai apropiată parcare (${p1}) nu are locuri PMR marcate – a fost selectată parcarea adaptată ${p2}.`,
    en: (p1, p2) =>
      `Wheelchair filter: Nearest parking (${p1}) has no marked accessible spaces – selected adapted parking ${p2}.`,
  },
  {
    patterns: [
      /^Pristup u kolicima od parkirališta ima nagib (.+)%\.$/,
    ],
    ro: (slope) => `Accesul în scaun rulant de la parcare are o pantă de ${slope}%.`,
    en: (slope) => `Wheelchair access from the parking lot has a ${slope}% slope.`,
  },
  {
    patterns: [
      /^Wheelchair filtriranje: Stanica '(.+)' preskočena jer nema pristupačnu rampu – odabrana pristupačna stanica '(.+)'\.$/,
      /^Filtrare scaun rulant: Stația '(.+)' a fost omisă deoarece nu are rampă accesibilă – s-a selectat stația accesibilă '(.+)'\.$/,
      /^Wheelchair filter: Stop '(.+)' skipped due to no accessible ramp – selected accessible stop '(.+)'\.$/,
    ],
    ro: (rawSt, accSt) =>
      `Filtrare scaun rulant: Stația '${rawSt}' a fost omisă deoarece nu are rampă accesibilă – s-a selectat stația accesibilă '${accSt}'.`,
    en: (rawSt, accSt) =>
      `Wheelchair filter: Stop '${rawSt}' skipped due to no accessible ramp – selected accessible stop '${accSt}'.`,
  },
  {
    patterns: [
      /^Pristup u kolicima od parkirališta ima nagib \((.+)%\) – preporučen oprez\.$/,
      /^Accesul în scaun rulant de la parcare are o pantă de (.+)% – se recomandă atenție\.$/,
      /^Wheelchair access from the parking lot has a (.+)% slope – caution advised\.$/,
    ],
    ro: (slope) => `Accesul în scaun rulant de la parcare are o pantă de ${slope}% – se recomandă atenție.`,
    en: (slope) => `Wheelchair access from the parking lot has a ${slope}% slope – caution advised.`,
  },
  {
    patterns: [
      /^Kiša \((.+) mm\/h\): kolnik je mokar i sklizak, preporučujemo javni prijevoz ili kombiniranu rutu\.$/,
    ],
    ro: (mm) =>
      `Ploaie (${mm} mm/h): carosabilul este umed și alunecos, recomandăm transportul public sau ruta combinată.`,
    en: (mm) =>
      `Rain (${mm} mm/h): road surface is wet and slippery, we recommend public transit or a combined route.`,
  },
  {
    patterns: [
      /^Niska temperatura \((.+) °C\): nepovoljni uvjeti za vožnju bicikla ili romobila\.$/,
    ],
    ro: (t) =>
      `Temperatură scăzută (${t} °C): condiții nefavorabile pentru deplasarea cu bicicleta sau trotineta.`,
    en: (t) =>
      `Low temperature (${t} °C): unfavorable conditions for riding a bike or e-scooter.`,
  },
  {
    patterns: [
      /^Zahtjevna ruta: ukupan uspon (.+) m \(prosječni nagib (.+)%\)\.$/,
    ],
    ro: (m, grade) =>
      `Traseu solicitant: urcare totală ${m} m (pantă medie ${grade}%).`,
    en: (m, grade) =>
      `Demanding route: total climb ${m} m (average grade ${grade}%).`,
  },
  {
    patterns: [
      /^Green Intelligence: Samo (\d+)% rute ima označenu biciklističku stazu \(piste de biciclete\)\. Preporučujemo kombinaciju bicikla i STPT prijevoza\.$/,
    ],
    ro: (pct) =>
      `Green Intelligence: Doar ${pct}% din traseu are pistă de biciclete marcată (piste de biciclete). Recomandăm combinația bicicletă + transport public STPT.`,
    en: (pct) =>
      `Green Intelligence: Only ${pct}% of the route has a marked bike lane. We recommend combining bike and STPT public transit.`,
  },
  {
    patterns: [
      /^Dio rute \((\d+)%\) nema označenu biciklističku stazu – obavezno korištenje dostupnih bike lane koridora\.$/,
    ],
    ro: (pct) =>
      `O parte din traseu (${pct}%) nu are pistă de biciclete marcată – folosiți obligatoriu coridoarele velo disponibile.`,
    en: (pct) =>
      `Part of the route (${pct}%) has no marked bike lane – please use available bike lane corridors.`,
  },
  {
    patterns: [
      /^Kiša \((.+) mm\): kolnik je mokar i sklizak\. Preporučujemo STPT javni prijevoz umjesto bicikla\/romobila\.$/,
      /^Ploaie \((.+) mm\): carosabilul este umed și alunecos\. Recomandăm transportul public STPT în locul bicicletei\/trotinetei\.$/,
      /^Rain \((.+) mm\): road surface is wet and slippery\. We recommend STPT public transit instead of bike\/scooter\.$/,
    ],
    ro: (mm) =>
      `Ploaie (${mm} mm): carosabilul este umed și alunecos. Recomandăm transportul public STPT în locul bicicletei/trotinetei.`,
    en: (mm) =>
      `Rain (${mm} mm): road surface is wet and slippery. We recommend STPT public transit instead of bike/scooter.`,
  },
  {
    patterns: [
      /^Snijeg\/poledica \((.+)°C\): opasnost od proklizavanja na 2 kotača – koristite javni prijevoz\.$/,
      /^Ninsoare\/polei \((.+)°C\): pericol de derapare pe 2 roți – folosiți transportul public\.$/,
      /^Snow\/ice \((.+)°C\): risk of slipping on 2 wheels – please use public transit\.$/,
    ],
    ro: (t) => `Ninsoare/polei (${t}°C): pericol de derapare pe 2 roți – folosiți transportul public.`,
    en: (t) => `Snow/ice (${t}°C): risk of slipping on 2 wheels – please use public transit.`,
  },
  {
    patterns: [
      /^Niska temperatura \((.+)°C\): preporučena topla oprema i rukavice ili korištenje STPT tramvaja\/autobusa\.$/,
      /^Temperatură scăzută \((.+)°C\): se recomandă echipament călduros și mănuși sau utilizarea tramvaiului\/autobuzului STPT\.$/,
      /^Low temperature \((.+)°C\): warm gear and gloves or STPT tram\/bus recommended\.$/,
    ],
    ro: (t) =>
      `Temperatură scăzută (${t}°C): se recomandă echipament călduros și mănuși sau utilizarea tramvaiului/autobuzului STPT.`,
    en: (t) => `Low temperature (${t}°C): warm gear and gloves or STPT tram/bus recommended.`,
  },
  {
    patterns: [
      /^Jak vjetar \((.+) km\/h\): otežana stabilnost na biciklu i e-romobilu\.$/,
      /^Vânt puternic \((.+) km\/h\): stabilitate redusă pe bicicletă și trotinetă electrică\.$/,
      /^Strong wind \((.+) km\/h\): reduced stability on bicycles and e-scooters\.$/,
    ],
    ro: (w) => `Vânt puternic (${w} km/h): stabilitate redusă pe bicicletă și trotinetă electrică.`,
    en: (w) => `Strong wind (${w} km/h): reduced stability on bicycles and e-scooters.`,
  },
  {
    patterns: [
      /^Zahtjevna ruta: ukupan uspon iznosi (.+) m – moguć veći fizički napor\.$/,
      /^Traseu solicitant: diferența totală de nivel este de (.+) m – efort fizic sporit\.$/,
      /^Demanding route: total elevation gain is (.+) m – higher physical effort required\.$/,
    ],
    ro: (m) => `Traseu solicitant: diferența totală de nivel este de ${m} m – efort fizic sporit.`,
    en: (m) => `Demanding route: total elevation gain is ${m} m – higher physical effort required.`,
  },
  {
    patterns: [
      /^Green Intelligence: Samo (\d+)% rute ima označenu biciklističku stazu\. Preporučujemo kombiniranu rutu \(Bicikl \+ Javni prijevoz\) za sigurniji prolazak\.$/,
      /^Green Intelligence: Doar (\d+)% din traseu are pistă de biciclete marcată\. Recomandăm ruta combinată \(Bicicletă \+ Transport public\) pentru o deplasare mai sigură\.$/,
      /^Green Intelligence: Only (\d+)% of the route has a marked bike lane\. We recommend the combined route \(Bike \+ Public Transit\) for a safer trip\.$/,
    ],
    ro: (pct) =>
      `Green Intelligence: Doar ${pct}% din traseu are pistă de biciclete marcată. Recomandăm ruta combinată (Bicicletă + Transport public) pentru o deplasare mai sigură.`,
    en: (pct) =>
      `Green Intelligence: Only ${pct}% of the route has a marked bike lane. We recommend the combined route (Bike + Public Transit) for a safer trip.`,
  },
  {
    patterns: [
      /^Dio rute \((\d+)%\) nema označenu biciklističku stazu – potreban oprez na križanjima\.$/,
      /^O parte din traseu \((\d+)%\) nu are pistă de biciclete marcată – atenție la intersecții\.$/,
      /^Part of the route \((\d+)%\) has no marked bike lane – caution at intersections\.$/,
    ],
    ro: (pct) => `O parte din traseu (${pct}%) nu are pistă de biciclete marcată – atenție la intersecții.`,
    en: (pct) => `Part of the route (${pct}%) has no marked bike lane – caution at intersections.`,
  },
  {
    patterns: [
      /^Kvaliteta zraka \(EAQI (\d+), PM2\.5 (.+) µg\/m³ – (.+)\): niža kvaliteta zraka zbog (.+), pa (.+) na ovoj dionici možda neće biti najugodnije\.$/,
    ],
    ro: (aqi, pm, zone, note, modeLabel) => {
      const z = AIR_QUALITY_ZONES[zone]?.ro ?? zone;
      const n = AIR_QUALITY_NOTES[note]?.ro ?? note;
      const m = AIR_QUALITY_MODES[modeLabel]?.ro ?? modeLabel;
      return `Calitatea aerului (EAQI ${aqi}, PM2.5 ${pm} µg/m³ – ${z}): calitate mai scăzută a aerului din cauza ${n}, așa că ${m} pe acest sector ar putea fi mai puțin confortabil.`;
    },
    en: (aqi, pm, zone, note, modeLabel) => {
      const z = AIR_QUALITY_ZONES[zone]?.en ?? zone;
      const n = AIR_QUALITY_NOTES[note]?.en ?? note;
      const m = AIR_QUALITY_MODES[modeLabel]?.en ?? modeLabel;
      return `Air quality (EAQI ${aqi}, PM2.5 ${pm} µg/m³ – ${z}): lower air quality due to ${n}, so ${m} on this section may be less comfortable.`;
    },
  },
  {
    patterns: [
      /^Kvaliteta zraka \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): povišena koncentracija čestica u zraku, kretanje na otvorenom možda neće biti najugodnije\.$/,
    ],
    ro: (aqi, pm) =>
      `Calitatea aerului (EAQI ${aqi}, PM2.5 ${pm} µg/m³): concentrație ridicată de particule în aer, deplasarea în aer liber ar putea fi mai puțin confortabilă.`,
    en: (aqi, pm) =>
      `Air quality (EAQI ${aqi}, PM2.5 ${pm} µg/m³): elevated particulate concentration in the air, outdoor travel may be less comfortable.`,
  },
  {
    patterns: [
      /^Kvaliteta zraka \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): niža kvaliteta zraka uz prometnicu, pa hodanje na ovoj dionici možda neće biti najugodnije\.$/,
    ],
    ro: (aqi, pm) =>
      `Calitatea aerului (EAQI ${aqi}, PM2.5 ${pm} µg/m³): calitate mai scăzută a aerului lângă arteră, așa că mersul pe jos pe acest sector ar putea fi mai puțin confortabil.`,
    en: (aqi, pm) =>
      `Air quality (EAQI ${aqi}, PM2.5 ${pm} µg/m³): lower air quality along the road, so walking on this section may be less comfortable.`,
  },
  {
    patterns: [
      /^Kvaliteta zraka \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): niža kvaliteta zraka na dijelu rute, pa (vožnja bicikla|vožnja romobila) možda neće biti najugodnija\.$/,
    ],
    ro: (aqi, pm, modeLabel) => {
      const m = AIR_QUALITY_MODES[modeLabel]?.ro ?? modeLabel;
      return `Calitatea aerului (EAQI ${aqi}, PM2.5 ${pm} µg/m³): calitate mai scăzută a aerului pe o parte din traseu, așa că ${m} ar putea fi mai puțin confortabil.`;
    },
    en: (aqi, pm, modeLabel) => {
      const m = AIR_QUALITY_MODES[modeLabel]?.en ?? modeLabel;
      return `Air quality (EAQI ${aqi}, PM2.5 ${pm} µg/m³): lower air quality on part of the route, so ${m} may be less comfortable.`;
    },
  },
  {
    patterns: [
      /^Kvaliteta zraka \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): niža kvaliteta zraka uz prometnice – preporučen zatvoreni javni prijevoz\.$/,
      /^Calitatea aerului \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): calitate mai scăzută a aerului lângă artere – se recomandă transportul public acoperit\.$/,
      /^Air quality \(EAQI (\d+), PM2\.5 (.+) µg\/m³\): lower air quality along main roads – enclosed public transit recommended\.$/,
    ],
    ro: (aqi, pm) =>
      `Calitatea aerului (EAQI ${aqi}, PM2.5 ${pm} µg/m³): calitate mai scăzută a aerului lângă artere – se recomandă transportul public acoperit.`,
    en: (aqi, pm) =>
      `Air quality (EAQI ${aqi}, PM2.5 ${pm} µg/m³): lower air quality along main roads – enclosed public transit recommended.`,
  },
];

/** Re-render stored validation/service messages without repeating requests or submissions. */
export function translateMessage(message: string, language: AppLanguage): string {
  // Normalize any Croatian parentheticals inside Timișoara stop/parking names
  let normalized = message
    .replace('(bočni parking uz kolnik)', language === 'ro' ? '(parcare laterală la carosabil)' : '(curbside parallel parking)')
    .replace('(stari peron bez rampe)', language === 'ro' ? '(peron vechi fără rampă)' : '(old platform without ramp)')
    .replace('(visoki rubnjak / bez pristupa za kolica)', language === 'ro' ? '(bordură înaltă / fără acces pentru scaun rulant)' : '(high curb / no wheelchair access)');

  // Handle redemption transaction prefixes: "Otkup: <reward>", "Activare: <reward>", "Redemption: <reward>"
  for (const prefix of ['Otkup: ', 'Activare: ', 'Redemption: ']) {
    if (normalized.startsWith(prefix)) {
      const inner = normalized.slice(prefix.length).trim();
      const translatedInner = translateMessage(inner, language);
      return (language === 'ro' ? 'Activare: ' : 'Redemption: ') + translatedInner;
    }
  }

  for (const entry of EXACT_BACKEND_TRANSLATIONS) {
    if (entry.matches.includes(normalized)) {
      return language === 'ro' ? entry.ro : entry.en;
    }
  }

  for (const entry of REGEX_BACKEND_TRANSLATIONS) {
    for (const regex of entry.patterns) {
      const match = regex.exec(normalized);
      if (match) {
        const args = match.slice(1);
        return language === 'ro' ? entry.ro(...args) : entry.en(...args);
      }
    }
  }

  for (const source of [translations.ro.svcCarTitlePrefix, translations.en.svcCarTitlePrefix]) {
    if (normalized.startsWith(`${source} + `)) {
      return translations[language].svcCarTitlePrefix + normalized.slice(source.length);
    }
  }
  for (const key of Object.keys(translations.ro) as (keyof typeof translations.ro)[]) {
    if (translations.ro[key] === normalized || translations.en[key] === normalized) {
      const translated = translations[language][key];
      if (typeof translated === 'string') return translated;
    }
  }
  // Route services can cache our own copy with a station/parking name embedded.
  // Match only known application templates; never change route data or API enums.
  for (const key of Object.keys(translations.ro) as (keyof typeof translations.ro)[]) {
    if (!key.startsWith('svc')) continue;
    const ro = translations.ro[key];
    const en = translations.en[key];
    if (typeof ro !== 'function' || typeof en !== 'function') continue;
    const args = Array.from({ length: ro.length }, (_, index) => `BEGREEN_ARG_${index}_TOKEN`);
    if (!args.length) continue;
    for (const source of [ro, en]) {
      try {
        const sample = (source as (...values: string[]) => string)(...args);
        if (typeof sample !== 'string' || !args.every((arg) => sample.split(arg).length === 2)) continue;
        let pattern = sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        args.forEach((arg, index) => { pattern = pattern.replace(arg, `(?<arg${index}>.*?)`); });
        const match = new RegExp(`^${pattern}$`).exec(normalized);
        if (match?.groups) {
          const target = language === 'ro' ? ro : en;
          return (target as (...values: string[]) => string)(...args.map((_, index) => match.groups![`arg${index}`]));
        }
      } catch { /* Numeric or structured templates are not reversible text templates. */ }
    }
  }
  return normalized; // User-authored content and unknown server messages remain intact.
}

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function getTranslations() {
  return translations[currentLanguage];
}

export function setAppLanguage(lang: AppLanguage): void {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey, lang); } catch { /* In-memory switching still works. */ }
  }
  listeners.forEach((listener) => listener());
}

export function toggleAppLanguage(): void {
  setAppLanguage(currentLanguage === 'ro' ? 'en' : 'ro');
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) restoreLanguage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppLanguage {
  return currentLanguage;
}

export function useTranslation() {
  const language = useSyncExternalStore(subscribe, getSnapshot, () => 'ro' as AppLanguage);
  return {
    language,
    setLanguage: setAppLanguage,
    toggleLanguage: toggleAppLanguage,
    t: translations[language],
    translateMessage: (message?: string | null) => message == null ? undefined : translateMessage(message, language),
  };
}
