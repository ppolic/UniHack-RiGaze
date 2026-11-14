export type AppLanguage = 'ro' | 'en';

export const translations = {
  ro: {
    // Navigation / Tabs
    dashboardHeaderTitle: 'Green Intelligence – Panou Oraș',
    backLabel: 'Înapoi',
    tabMap: 'Hartă și Rute',
    tabHistory: 'Istoric',
    tabRewards: 'Recompense',
    tabProfile: 'Profil',

    // Common
    close: 'Închide',
    cancel: 'Anulează',
    save: 'Salvează',
    reset: 'Reset',
    all: 'Toate',
    points: 'puncte',
    ptsShort: 'pct.',
    free: 'Gratuit',
    loading: 'Se încarcă...',
    retry: 'Încearcă din nou',
    selected: '✓ Selectat',
    recommended: 'Cel mai verde',
    demoMode: 'MOD DEMO',

    // MapScreen
    searchPlaceholder: 'Caută adresă, stradă sau stație pentru Destinație (B)...',
    chooseDestinationTitle: 'Alege destinația ta',
    chooseDestinationSub: 'Apasă pe hartă sau caută o adresă (A este mereu locația ta)',
    originLabel: 'Plecare (A)',
    destLabel: 'Destinație (B)',
    myLocation: 'Locația mea',
    locatingGps: 'Caut GPS...',
    destination: 'Destinație',
    panelPromptEmpty: 'Apasă pe hartă sau scrie o destinație pentru calculul eco-rutei',
    panelEmptyBody:
      'Alege destinația (punctul B) apăsând pe hartă sau folosind bara de căutare de sus pentru a afișa cele mai bune eco-opțiuni din locația ta curentă.',
    calculatingRoutes: 'Calculez cele mai bune eco-opțiuni...',
    tooCloseWarning: (meters: number, minMeters: number) =>
      `⚠️ Destinația este prea aproape de locația ta (${meters} m). Alege un punct B la cel puțin ${minMeters} m pentru a porni cursa.`,
    startTripBtn: (mins: number, pts: number) =>
      `🚀 Pornește (${mins} min • +${pts} puncte)`,
    finishTripBtn: (pts: number) => `🏁 Finalizează cursa (+${pts})`,
    cancelNavBtn: '✕ Oprește',
    gpsLive: 'GPS LIVE',
    autoFinishLabel: (radius: number) =>
      `FINALIZARE AUTOMATĂ ÎN RAZA DE ${radius} m DE DESTINAȚIE`,
    remainingToB: 'Rămas până la B',
    estimate: 'Estimare',
    progress: 'Progres',
    travelOptionsTitle: 'Opțiuni de călătorie A ➔ B',
    travelOptionsDefaultSub: 'Clasate după sustenabilitate (CO₂ & puncte)',
    optionsExpand: 'Opțiuni ⌃',
    optionsCollapse: 'Coboară ⌄',
    followRouteTo: (destName: string) =>
      `Urmează ruta marcată către: ${destName}`,
    chooseDestinationA11y:
      'Alege destinația. Punctul de plecare A este întotdeauna locația ta GPS.',
    refreshOriginA11y: (originText: string) =>
      `Actualizează locația GPS curentă (Plecare A): ${originText}`,
    changeDestA11y: (destName: string) =>
      `Schimbă Destinația (B): ${destName}`,
    openSettingsA11y: 'Deschide setările profilului și modului API',
    openRewardsA11y: (pts: number) =>
      `Deschide eco-recompensele, ai ${pts} puncte`,
    openDashboardA11y: 'Deschide panoul eco al orașului',
    searchInputA11y: 'Caută adresă, stradă sau stație pentru destinația B',
    clearSearchA11y: 'Șterge și închide căutarea adresei',
    expandOptionsA11y: 'Deschide opțiunile de călătorie',
    collapseOptionsA11y: 'Restrânge opțiunile de călătorie',
    routePresetCenter: 'Centru ➔ UPT Politehnica',

    // Header Badges & Profiles
    profileStudentBadge: '🎓 Student',
    profileAccessBadge: '♿ Accesibil',
    profileTeenBadge: '🪖 14-15 ani',
    profileChildBadge: '🧒 Copil',
    demoProfileStudent: '🎓 Student (18+)',
    demoProfileAccess: '♿ Scaun rulant (Podea joasă)',
    demoProfileTeen: '🪖 Adolescent (14–15 ani)',
    demoProfileChild: '🧒 Copil (<14 ani)',

    // Weather short
    weatherRain: 'Ploaie',
    weatherSnow: 'Zăpadă',
    weatherCold: 'Frig',
    weatherWindy: 'Vânt',
    weatherClear: 'Senin',

    // Autocomplete & Settings & GPS Errors
    searchingAddresses: 'Caut adrese și locații din Timișoara...',
    localPoisHeader: '📍 Stații, parcări & locații populare',
    osmAddressesHeader: '🗺️ Adrese și străzi Timișoara',
    noSearchResults: (q: string) =>
      `Nu există rezultate pentru „${q}”. Încearcă o stradă sau o piață.`,
    setAsDestBadge: '🏁 Destinație B',
    gpsDeniedMsg:
      'Accesul GPS este refuzat. Folosesc ultima locație cunoscută.',
    gpsUnavailableMsg: 'Semnalul GPS este temporar indisponibil.',
    gpsNeedDestAlertTitle: 'Alege destinația',
    gpsNeedDestAlertBody:
      'Apasă pe hartă sau caută o adresă pentru destinația B înainte de a porni.',
    gpsTooCloseAlertTitle: 'Destinație prea aproape',
    gpsTooCloseAlertBody: (meters: number, minMeters: number) =>
      `Te afli deja la ${meters} m de destinație. Pentru a preveni abuzurile, destinația trebuie să fie la cel puțin ${minMeters} m.`,
    gpsPermNeededTitle: 'Permisiune locație necesară',
    gpsPermNeededBody:
      'Activează GPS-ul/locația pentru urmărirea cursei în timp real și colectarea eco-punctelor.',
    navArrivedMsg: 'Ai ajuns la destinație! 🎉',
    navWaitingGpsMsg:
      'Aștept semnalul GPS... Finalizarea înainte de sosire nu acordă eco-puncte.',
    navTrackingErrorMsg:
      'Nu se poate urmări semnalul GPS pe acest dispozitiv.',
    checkingBackendMsg: 'Verific conexiunea cu backend-ul...',

    // Textual Map Alternative (EN 301 549)
    textAltTitle: '📜 Alternativă textuală a hărții (EN 301 549)',
    textAltSub:
      'Navigare accesibilă fără hartă vizuală (Legea 232/2022 Art. 1(4)(d)). Caută sus sau alege punctul B mai jos.',
    showMapBtn: '🗺️ Afișează harta',
    statementSettingsBtn: '♿ Declarație / Setări',
    routeStepsTitle: '🧭 Pașii rutei curente',
    notSelectedPrompt: 'Neselectat — alege o locație mai jos sau în căutare',
    poisTitle: '📍 Stații, parcări PMR și destinații în Timișoara',
    chooseAsDestB: '🏁 Alege ca destinație (B)',
    accessibleChip: '♿ Accesibil',
    pmrParkingChip: '♿ Parcare PMR',
    lowFloorTag: '• ♿ Acces podea joasă',
    pmrSpacesTag: ' • ♿ Locuri PMR',
    linesPrefix: 'Linii',
    stptPublicTransit: 'Transport public STPT',
    textAltFilterAll: (n: number) => `Toate (${n})`,
    textAltFilterStations: (n: number) => `🚋 STPT (${n})`,
    textAltFilterParking: (n: number) => `🅿️ Parking (${n})`,
    textAltFilterLandmarks: (n: number) => `📍 Locații (${n})`,
    textAltCount: (n: number, prioritized: boolean) =>
      `Afișate ${n} locații${
        prioritized ? ' (locațiile accesibile sunt primele)' : ''
      }`,

    // Settings Modal
    settingsTitle: '👤 Profil călător & Setări API',
    quickDemoProfile: 'Selecție rapidă profil demo (FE-08)',
    languageSection: '🌐 Limba aplicației / App Language',
    accessibilitySection: '♿ Accesibilitate (WCAG 2.1 AA • Legea 232/2022)',
    largeTextChip: '🔤 Text mare (120%)',
    textualMapChip: '📜 Hartă textuală',
    wcagModalBtn: '♿ Setări WCAG 2.1 AA & Declarație (RO / EN)',
    modeLocalRouter: '🛡️ Ruter stradal local',
    modeLiveFallback: '⚠️ Fallback Live',
    modeLiveApi: '🌐 API Backend Live',
    workModeLabel: 'Mod de lucru:',
    openDataNotice:
      'Datele despre stații, parcări și obiective sunt preluate direct din API-urile deschise ale Primăriei Timișoara (cont.primariatm.ro).',
    backendUrlLabel: 'Backend Base URL',
    testConnection: '🔌 Testează conexiunea cu backend-ul',
    checkingConnection: 'Verific conexiunea...',
    standaloneRouter: '🛡️ Ruter local',
    liveBackend: '🌐 Live Backend',

    // MapContainer
    originDefaultName: 'Plecare',
    destDefaultName: 'Destinație',
    hideIcons: '👁️ Ascunde pictogramele',
    cleanMapShowAll: '👁️ Hartă curată (Afișează tot)',
    hideIconsA11y: 'Ascunde toate pictogramele de pe hartă',
    showAllA11y: 'Afișează toate categoriile pe hartă',
    loadingSchedule: ' • Încarc orarul...',
    timParkNoSensor: 'Zonă TimPark (status live: fără senzor)',
    myGpsOriginMarker: 'Locația ta GPS curentă (Plecare A)',
    destMarkerDrag: 'Destinație (trage pentru a schimba)',
    filterStations: '🚋 STPT',
    filterParking: '🅿️ Parking',
    filterPlaces: '📍 Locații',
    filterBus: '🚌 Autobuze',
    filterTram: '🚊 Tramvaie',
    filterTrolleybus: '🚎 Troleibuze',
    filterLandmarks: '🏛️ Obiective',
    filterMapPrefix: 'Filtru hartă:',
    bikesFreeLabel: (avail: number, total: number) =>
      `Biciclete disponibile: ${avail} / ${total} locuri`,
    arrivesInMin: (mins: number) => ` • Sosește în ${mins} min`,
    departuresPrefix: 'Plecări:',
    spotsAvailableLabel: (avail: number, total: number) =>
      `Disponibile: ${avail}/${total} locuri`,
    emissionsShort: 'Emisii',
    centerGpsA11y: 'Centrează pe poziția mea GPS',
    filterFilterTram: 'Tramvai',
    filterFilterBus: 'Autobuz',
    filterFilterBikes: 'Biciclete VeloTM',
    filterFilterParking: 'Parking',
    filterFilterPlaces: 'Locații',
    setAsDestB: '🏁 Destinație (B)',
    setAsDestBA11y: (name: string) => `Setează ${name} ca Destinație B`,
    closePoiA11y: 'Închide fereastra locației',
    centerTimisoaraA11y: 'Centrează pe centrul Timișoarei',
    toggleMapThemeA11y: 'Comută tema hărții între Dark și Light',
    smsCodeLabel: (num: string, code: string) =>
      `📱 SMS ${num} (cod ${code})`,
    accessibleSpotsLabel: (spots: number) => `♿ ${spots} locuri PMR`,
    myGpsMarkerTitle: 'Locația mea GPS',
    transferPrefix: 'Schimb',

    // RouteOptionCard
    modeBikeLabel: 'Bicicletă',
    modeTransitLabel: 'Transport Public (STPT)',
    modeWalkLabel: 'Mers pe jos',
    modeScooterLabel: 'Trotinetă',
    modeCarLabel: 'Mașină',
    durationShort: 'Durată',
    distanceShort: 'Distanță',
    priceShort: 'Cost',
    selectedComma: ', selectat',
    recommendedComma: ', cel mai verde',
    zeroPointsBadge: '0 puncte',

    // TripCompletedModal
    tripEarlyTitle: 'Cursă oprită prematur',
    tripFinishedNeutralTitle: 'Călătorie finalizată',
    tripCompletedTitle: 'Călătorie verde finalizată!',
    tripEarlySub:
      'Cursa a fost oprită înainte de a ajunge la destinație (sub 60 m de punctul B), deci nu s-au acordat puncte.',
    tripNeutralSub:
      'Călătoria cu mașina personală nu aduce eco-puncte. Data viitoare alege VeloTM sau tramvaiul STPT pentru +90 de puncte!',
    tripCompletedSub:
      'Mulțumim că păstrezi aerul curat și reduci aglomerația în Timișoara!',
    ecoPointsUnit: 'Eco-puncte',
    co2Saved: 'Economie CO₂',
    durationLabel: 'Durată',
    totalPointsHeader: (pts: number) => `⭐ Total: ${pts} puncte`,
    pointsToStpt: (rem: number) =>
      `Încă ${rem} până la biletul de o zi STPT`,
    rewardUnlocked: 'Recompensă deblocată! 🎉',
    viewRewards: 'Vezi recompensele 🎁',
    backToMap: 'Înapoi la hartă',

    // HistoryScreen
    historyTitle: 'Istoric Călătorii',
    historySubtitle:
      'Călătoriile înregistrate și contribuția ta la reducerea emisiilor în Timișoara.',
    historyLoading: 'Se încarcă istoricul călătoriilor…',
    historyError:
      'Nu s-a putut încărca istoricul călătoriilor. Verifică conexiunea și încearcă din nou.',
    historyEmptyTitle: 'Nu există încă călătorii înregistrate',
    historyEmptySub:
      'Aici vei găsi rezumatul călătoriilor tale și al eco-punctelor câștigate.',
    modePrefix: 'Mod',
    distancePrefix: 'Distanță',

    // RewardsScreen & PointsSummaryCard
    myEcoPoints: 'Eco-Punctele Mele',
    co2SavedShort: 'Economisit CO₂',
    greenRoutesShort: 'Rute verzi',
    treesEquivShort: 'Echiv. copaci',
    rewardsCatalogTitle: 'Catalog DEMO de recompense',
    rewardsNotice:
      'Acestea sunt exemple demonstrative. Numele și reducerile nu sunt oferte reale ale partenerilor. Codurile promo generate nu au valoare reală și nu pot fi folosite. Istoricul revendicărilor este temporar.',
    rewardsBackendOff:
      'Revendicarea prin backend nu este încă disponibilă. Revendicarea demo este dezactivată.',
    rewardsLoginRequired:
      'Autentifică-te pentru a revendica recompense demo.',
    rewardsLoadError:
      'Nu s-au putut încărca recompensele demo. Încearcă din nou mai târziu.',
    rewardsBackendUnavailable:
      'Revendicarea prin backend nu este încă disponibilă.',
    rewardsAlreadyRedeemed: 'Această recompensă demo a fost deja revendicată.',
    rewardsInvalidCost:
      'Punctele pentru această recompensă demo nu pot fi verificate.',
    rewardsExpired: 'Această recompensă demo a expirat.',
    rewardsExpiryCheckFailed: 'Data de expirare nu poate fi verificată.',
    rewardsMissingPoints: (n: number) => `Îți lipsesc ${n} eco-puncte.`,
    rewardsActivationFailed:
      'Recompensa demo nu a fost activată. Încearcă din nou.',
    rewardsModeChanged:
      'Modul demo nu mai este activ. Punctele nu au fost consumate.',
    rewardsRedeemFailed:
      'Revendicarea a eșuat. Încearcă din nou.',
    demoExamplePrefix: 'Exemplu demo:',
    redeemedDemoLabel: 'Revendicat — demo',
    redeemDemoBtn: 'Revendică — demo',
    activatingReward: 'Se activează recompensa demo…',
    demoPromoCode: 'Cod promo demo:',
    invalidRewardCostInline: 'Cost recompensă invalid.',

    // ProfileScreen & ProfileDetails
    ageBadge: (age: number) => `Vârstă: ${age} ani`,
    accessibilityActiveBadge: 'Accesibilitate activă',
    accessibilityAndVehicles: 'Accesibilitate și Vehicule Proprii',
    disabilityLabel: 'Persoană cu dizabilități / Scaun rulant',
    disabilityDesc:
      'Filtrează automat transportul public accesibil și parcările rezervate.',
    ownBikeLabel: 'Dețin bicicletă proprie',
    ownBikeDesc:
      'Nu sugerează închiriere, ci rute directe cu bicicleta.',
    ownCarLabel: 'Dețin automobil',
    ownCarDesc:
      'Activează opțiunea de condus cu parcare recomandată.',
    wcagSectionHeader: 'Accesibilitate (Legea 232/2022 • WCAG 2.1 AA)',
    wcagLargeTextLabel: '🔤 Text mărit (WCAG 1.4.4)',
    wcagLargeTextDesc:
      'Mărește titlurile rutelor, valorile și instrucțiunile pentru deficiențe de vedere.',
    wcagTextMapLabel: '📋 Afișare textuală a hărții (EN 301 549)',
    wcagTextMapDesc:
      'Înlocuiește harta vizuală cu o listă accesibilă a stațiilor și pașilor rutei.',
    displayNameLabel: 'Nume afișat',
    displayNameEmptyError: 'Introdu un nume afișat. Numele nu poate fi gol.',
    editProfileBtn: 'Editează profilul',
    logoutBtn: 'Deconectare',
    statementModalTitleBtn:
      '📜 Declarație Legea 232/2022 & WCAG 2.1 AA (RO / EN)',
    statementModalSubBtn:
      'Declarație privind accesibilitatea • EN 301 549 • Feedback ADR',
    statementModalA11y:
      'Deschide declarația de accesibilitate Legea 232/2022 și WCAG 2.1 AA în română și engleză',

    // Dashboard & CityMetrics
    dashboardBannerTitle: '🌱 BeGreen Green Intelligence — Timișoara DEMO',
    dashboardBannerSubtitle:
      'Toți indicatorii, scorurile de infrastructură și recomandările sunt date demo simulate, nu statistici oficiale ale orașului. Afișarea nu reprezintă recomandări oficiale sau aprobarea Primăriei Timișoara.',
    dashboardSimBadge: 'DEMO — date simulate',
    dashboardMetricsHeading: 'Indicatori urbani simulați și zone prioritare',
    dashboardMetricsLoading:
      'Se încarcă indicatorii simulați și zonele prioritare…',
    dashboardMetricsError:
      'Nu s-au putut încărca indicatorii orașului și zonele prioritare. Încearcă din nou.',
    dashboardMetricsRetry: 'Reîncarcă indicatorii',
    dashboardNoZones:
      'În acest set demo nu există zone prioritare de investiție.',
    dashboardGapsHeading:
      'Lacune simulate ale rețelei (pondere auto și piste de biciclete)',
    dashboardGapsLoading:
      'Se încarcă lacunele simulate de infrastructură…',
    dashboardGapsError:
      'Nu s-au putut încărca lacunele de infrastructură. Încearcă din nou.',
    dashboardGapsRetry: 'Reîncarcă lacunele',
    dashboardNoGaps:
      'În acest set demo nu există lacune de infrastructură de afișat.',
    demoPriorityLabel: 'Prioritate demo:',
    carShareLabel: '🚗 Pondere auto:',
    toBikeLaneLabel: '🚲 Până la pista de biciclete:',
    toFirstStopLabel: '🚏 Până la prima stație STPT:',
    simCo2Saved: 'Economie CO₂ simulată',
    simTrips: 'Călătorii sustenabile simulate',
    identifiedCells: 'Celule de infrastructură DEMO identificate',
    topGapZonesHeading: 'Zone prioritare de investiție — simulare',
    simPotentialPrefix: 'Potențial simulat:',
    perYearSuffix: 'CO₂/an',

    // Auth (Login & Register)
    loginTagline: 'De la A la B fără să coste planeta.',
    loginFormTitle: 'MOD DEMO — Acces Demo',
    loginNotice:
      'Emailul și parola servesc doar la afișarea formularului și nu sunt verificate pe server. Nu introduce parole reale. Continuarea deschide profilul demo de student.',
    emailAddressLabel: 'Adresă email',
    emailPlaceholder: 'introdu email',
    passwordLabel: 'Parolă',
    openStudentDemoBtn: 'Deschide demo student',
    wantCustomDemo: 'Vrei propriul tău profil demo? ',
    createDemoProfileLink: 'Creează profil demo',
    quickDemoTitle: '⚡ Acces Demo Rapid (pentru juriu și testare):',
    quickDemoStudent: '👤 Student (Bicicletă/STPT)',
    quickDemoAccess: '♿ Accesibilitate (Scaun rulant)',

    regTitle: 'MOD DEMO — Profil Local',
    regSubtitle:
      'Creează un profil demo local pentru testarea aplicației. Nu se creează un cont real pe server. Profilul este temporar.',
    regFullNameLabel: 'Nume complet',
    regFullNamePlaceholder: 'ex. Andrei Popescu',
    regEmailLabel: 'Email',
    regBirthDateLabel: 'Data nașterii (YYYY-MM-DD)',
    regSectionAccessibility: 'Accesibilitate și Vehicule Proprii',
    regSubmitBtn: 'Creează profil demo (+50 eco-puncte)',
    regBackToDemo: 'Înapoi la acces demo',
    regNameError: 'Introdu numele și prenumele.',
    regEmailError: 'Introdu o adresă de email validă.',
    regDateFormatError: 'Introdu data în format YYYY-MM-DD.',
    regDateInvalidError: 'Introdu o dată calendaristică reală.',
    regDateFutureError: 'Data nașterii nu poate fi în viitor.',

    // Transport modes (general)
    modeWalk: 'Mers pe jos',
    modeBike: 'Bicicletă',
    modeScooter: 'Trotinetă',
    modePublicTransport: 'Transport public',
    modeCar: 'Mașină',
    modeCarpool: 'Carpool',
    modeCombined: 'Combinat',

    // Services (MOCK rewards & routeService)
    svcReward1Title: 'Cafea gratuită cu cană reutilizabilă',
    svcReward1Desc:
      'Preschimbă eco-punctele pentru cafea proaspăt prăjită în centrul orașului.',
    svcReward1Discount: '100% reducere',
    svcReward2Title: 'Bilet de o zi tramvai și autobuz',
    svcReward2Desc:
      'Călătorie gratuită în toată rețeaua de transport public STPT.',
    svcReward3Title: '30% reducere la service bicicletă',
    svcReward3Desc:
      'Verificare frâne, ungere lanț și centrare roți.',
    svcReward3Discount: '30% reducere',
    svcHistToday: 'Astăzi, 10:15',
    svcHistYesterday: 'Ieri, 17:30',
    svcDefaultStopA: 'Stație plecare',
    svcDefaultStopB: 'Stație sosire',
    svcStationFallback: 'Stația',
    svcTimParkFallback: 'Parcare TimPark',
    svcPointFallback: 'Punct',
    svcWalkWheelchairTitle: 'Mers / Scaun rulant (Trotuare adaptate)',
    svcWalkTitle: 'Mers pe jos',
    svcWalkDesc: 'Rută pietonală pe străzile și podurile din Timișoara',
    svcWalkToStation: (name: string) => `Mers pe jos până la stația ${name}`,
    svcBikeFromStation: (name: string) =>
      `Rută cu bicicleta pe drum de la ${name} la destinație`,
    svcBikeDesc: 'Rută cu bicicleta pe străzile și pistele din Timișoara',
    svcHelmetWarning:
      'Casca de protecție este obligatorie legal pentru vârsta 14–16 ani.',
    svcScooterDesc: 'Deplasare cu trotineta pe arterele și coridoarele velo',
    svcWalkFromStopToDest: (name: string) =>
      `Mers pe jos de la stația ${name} până la destinație`,
    svcAccessibleStopMsg:
      'Linie STPT selectată cu acces adaptat.',
    svcDriveToParking: (name: string) => `Condus pe drum până la ${name}`,
    svcDriveDesc: 'Deplasare cu mașina pe arterele din Timișoara',
    svcWalkFromParking: (name: string, distText: string) =>
      `Mers pe jos de la ${name} (${distText}) până la destinație`,
    svcCarCo2Warn: (carCo2: number) =>
      `Mașina emite ${carCo2}g CO₂. Transportul public sau bicicleta protejează aerul Timișoarei.`,
    svcVehicleTram: 'Tramvai',
    svcVehicleTrolleybus: 'Troleibuz',
    svcVehicleBus: 'Autobuz',
    svcPublicTransitSmtt: 'Transport public (SMTT)',
    svcOwnBikeTitle: 'Bicicletă proprie',
    svcRentBikeTitle: 'Închiriere bicicletă (VeloTM)',
    svcOwnScooterTitle: 'Trotinetă electrică proprie',
    svcRentScooterTitle: 'Închiriere trotinetă electrică',
    svcLowFloorTag: 'Podea joasă',
    svcCarAccessibleTitle: 'Mașină (Parcare TimPark adaptată)',
    svcCarTitlePrefix: 'Mașină',
    svcNearPrefix: (name: string) => `Lângă ${name}`,
    svcApiHealthy: (ms: number) => `Backend activ (${ms} ms)`,
    svcApiTimeout: (ms: number) =>
      `Timeout (${ms} ms) — folosiți modul Demo Offline`,
    svcApiUnreachable: (url: string) =>
      `Indisponibil (${url}) — Demo Offline este pregătit`,
  },
  en: {
    // Navigation / Tabs
    dashboardHeaderTitle: 'Green Intelligence – City Dashboard',
    backLabel: 'Back',
    tabMap: 'Map & Routes',
    tabHistory: 'History',
    tabRewards: 'Rewards',
    tabProfile: 'Profile',

    // Common
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    reset: 'Reset',
    all: 'All',
    points: 'points',
    ptsShort: 'pts',
    free: 'Free',
    loading: 'Loading...',
    retry: 'Retry',
    selected: '✓ Selected',
    recommended: 'Greenest',
    demoMode: 'DEMO MODE',

    // MapScreen
    searchPlaceholder: 'Search address, street, or stop for Destination (B)...',
    chooseDestinationTitle: 'Choose your destination',
    chooseDestinationSub: 'Tap the map or search an address (A is always your location)',
    originLabel: 'Origin (A)',
    destLabel: 'Destination (B)',
    myLocation: 'My location',
    locatingGps: 'Finding GPS...',
    destination: 'Destination',
    panelPromptEmpty: 'Tap the map or enter a destination to calculate an eco-route',
    panelEmptyBody:
      'Choose a destination (point B) by tapping the map or using the search bar above to view the best eco-options from your current location.',
    calculatingRoutes: 'Calculating best eco-options...',
    tooCloseWarning: (meters: number, minMeters: number) =>
      `⚠️ Destination is too close to your location (${meters} m). Choose point B at least ${minMeters} m away to start.`,
    startTripBtn: (mins: number, pts: number) =>
      `🚀 Start (${mins} min • +${pts} pts)`,
    finishTripBtn: (pts: number) => `🏁 Finish Trip (+${pts})`,
    cancelNavBtn: '✕ Stop',
    gpsLive: 'GPS LIVE',
    autoFinishLabel: (radius: number) =>
      `AUTO-FINISH WITHIN ${radius} m OF DESTINATION`,
    remainingToB: 'Remaining to B',
    estimate: 'Estimate',
    progress: 'Progress',
    travelOptionsTitle: 'Travel Options A ➔ B',
    travelOptionsDefaultSub: 'Ranked by eco-sustainability (CO₂ & points)',
    optionsExpand: 'Options ⌃',
    optionsCollapse: 'Collapse ⌄',
    followRouteTo: (destName: string) =>
      `Follow the highlighted route toward: ${destName}`,
    chooseDestinationA11y:
      'Choose your destination. Origin A is always your GPS location.',
    refreshOriginA11y: (originText: string) =>
      `Refresh current GPS location (Origin A): ${originText}`,
    changeDestA11y: (destName: string) =>
      `Change Destination (B): ${destName}`,
    openSettingsA11y: 'Open profile and API mode settings',
    openRewardsA11y: (pts: number) =>
      `Open eco-rewards, currently ${pts} points`,
    openDashboardA11y: 'Open city eco dashboard',
    searchInputA11y: 'Search address, street, or stop for destination B',
    clearSearchA11y: 'Clear and close address search',
    expandOptionsA11y: 'Expand travel options',
    collapseOptionsA11y: 'Collapse travel options',
    routePresetCenter: 'City Center ➔ UPT Politehnica',

    // Header Badges & Profiles
    profileStudentBadge: '🎓 Student',
    profileAccessBadge: '♿ Accessible',
    profileTeenBadge: '🪖 14-15y',
    profileChildBadge: '🧒 Child',
    demoProfileStudent: '🎓 Student (18+)',
    demoProfileAccess: '♿ Wheelchair (Low-Floor)',
    demoProfileTeen: '🪖 Teen (14–15y)',
    demoProfileChild: '🧒 Child (<14y)',

    // Weather short
    weatherRain: 'Rain',
    weatherSnow: 'Snow',
    weatherCold: 'Cold',
    weatherWindy: 'Windy',
    weatherClear: 'Clear',

    // Autocomplete & Settings & GPS Errors
    searchingAddresses: 'Searching Timișoara addresses and places...',
    localPoisHeader: '📍 Stops, parking & popular places',
    osmAddressesHeader: '🗺️ Timișoara Streets & Addresses',
    noSearchResults: (q: string) =>
      `No results for "${q}". Try a street or square name.`,
    setAsDestBadge: '🏁 Dest B',
    gpsDeniedMsg:
      'GPS permission denied. Using last known location.',
    gpsUnavailableMsg: 'GPS signal temporarily unavailable.',
    gpsNeedDestAlertTitle: 'Choose destination',
    gpsNeedDestAlertBody:
      'Tap the map or search an address for destination B before starting.',
    gpsTooCloseAlertTitle: 'Destination too close',
    gpsTooCloseAlertBody: (meters: number, minMeters: number) =>
      `You are already ${meters} m from the destination. To prevent abuse, destination must be at least ${minMeters} m away.`,
    gpsPermNeededTitle: 'Location permission required',
    gpsPermNeededBody:
      'Enable GPS/location tracking to follow your trip in real time and earn eco-points.',
    navArrivedMsg: 'You have arrived at your destination! 🎉',
    navWaitingGpsMsg:
      'Waiting for GPS signal... Finishing early awards 0 eco-points.',
    navTrackingErrorMsg:
      'Unable to track GPS signal on this device.',
    checkingBackendMsg: 'Checking backend connection...',

    // Textual Map Alternative (EN 301 549)
    textAltTitle: '📜 Textual Map Alternative (EN 301 549)',
    textAltSub:
      'Accessible navigation without a visual map (Law 232/2022 Art. 1(4)(d)). Search above or pick point B below.',
    showMapBtn: '🗺️ Show Map',
    statementSettingsBtn: '♿ Statement / Settings',
    routeStepsTitle: '🧭 Current Route Steps',
    notSelectedPrompt: 'Not selected — choose a location below or via search',
    poisTitle: '📍 Stops, PMR Parking & Places in Timișoara',
    chooseAsDestB: '🏁 Choose as Destination (B)',
    accessibleChip: '♿ Accessible',
    pmrParkingChip: '♿ PMR Parking',
    lowFloorTag: '• ♿ Low-floor access',
    pmrSpacesTag: ' • ♿ PMR spaces',
    linesPrefix: 'Lines',
    stptPublicTransit: 'STPT Public Transit',
    textAltFilterAll: (n: number) => `All (${n})`,
    textAltFilterStations: (n: number) => `🚋 STPT (${n})`,
    textAltFilterParking: (n: number) => `🅿️ Parking (${n})`,
    textAltFilterLandmarks: (n: number) => `📍 Places (${n})`,
    textAltCount: (n: number, prioritized: boolean) =>
      `Showing ${n} locations${
        prioritized ? ' (accessible locations listed first)' : ''
      }`,

    // Settings Modal
    settingsTitle: '👤 Traveler Profile & API Settings',
    quickDemoProfile: 'Quick Demo Profile (FE-08)',
    languageSection: '🌐 App Language / Limba aplicației',
    accessibilitySection: '♿ Accessibility (WCAG 2.1 AA • Law 232/2022)',
    largeTextChip: '🔤 Large Text (120%)',
    textualMapChip: '📜 Textual Map',
    wcagModalBtn: '♿ WCAG 2.1 AA Settings & Statement (RO / EN)',
    modeLocalRouter: '🛡️ Local Street Router',
    modeLiveFallback: '⚠️ Live Fallback',
    modeLiveApi: '🌐 Live Backend API',
    workModeLabel: 'Mode:',
    openDataNotice:
      'Stop, parking, and landmark data is loaded directly from City of Timișoara open APIs (cont.primariatm.ro).',
    backendUrlLabel: 'Backend Base URL',
    testConnection: '🔌 Test Backend Connection',
    checkingConnection: 'Checking connection...',
    standaloneRouter: '🛡️ Local Router',
    liveBackend: '🌐 Live Backend',

    // MapContainer
    originDefaultName: 'Origin',
    destDefaultName: 'Destination',
    hideIcons: '👁️ Hide icons',
    cleanMapShowAll: '👁️ Clean map (Show all)',
    hideIconsA11y: 'Hide all map icons',
    showAllA11y: 'Show all map categories',
    loadingSchedule: ' • Loading schedule...',
    timParkNoSensor: 'TimPark zone (live status: no sensor)',
    myGpsOriginMarker: 'Your current GPS location (Origin A)',
    destMarkerDrag: 'Destination (drag to adjust)',
    filterStations: '🚋 STPT',
    filterParking: '🅿️ Parking',
    filterPlaces: '📍 Places',
    filterBus: '🚌 Buses',
    filterTram: '🚊 Trams',
    filterTrolleybus: '🚎 Trolleybuses',
    filterLandmarks: '🏛️ Landmarks',
    filterMapPrefix: 'Map filter:',
    bikesFreeLabel: (avail: number, total: number) =>
      `Bikes available: ${avail} / ${total} docks`,
    arrivesInMin: (mins: number) => ` • Arrives in ${mins} min`,
    departuresPrefix: 'Departures:',
    spotsAvailableLabel: (avail: number, total: number) =>
      `Available: ${avail}/${total} spaces`,
    emissionsShort: 'Emissions',
    centerGpsA11y: 'Center on my GPS position',
    filterFilterTram: 'Tram',
    filterFilterBus: 'Bus',
    filterFilterBikes: 'VeloTM Bikes',
    filterFilterParking: 'Parking',
    filterFilterPlaces: 'Places',
    setAsDestB: '🏁 Destination (B)',
    setAsDestBA11y: (name: string) => `Set ${name} as Destination B`,
    closePoiA11y: 'Close map marker popup',
    centerTimisoaraA11y: 'Center on Timișoara city center',
    toggleMapThemeA11y: 'Toggle map theme between Dark and Light mode',
    smsCodeLabel: (num: string, code: string) =>
      `📱 SMS ${num} (code ${code})`,
    accessibleSpotsLabel: (spots: number) => `♿ ${spots} PMR spaces`,
    myGpsMarkerTitle: 'My GPS location',
    transferPrefix: 'Transfer',

    // RouteOptionCard
    modeBikeLabel: 'Bicycle',
    modeTransitLabel: 'Public Transit (STPT)',
    modeWalkLabel: 'Walking',
    modeScooterLabel: 'Scooter',
    modeCarLabel: 'Car',
    durationShort: 'Duration',
    distanceShort: 'Distance',
    priceShort: 'Cost',
    selectedComma: ', selected',
    recommendedComma: ', greenest',
    zeroPointsBadge: '0 points',

    // TripCompletedModal
    tripEarlyTitle: 'Trip Stopped Early',
    tripFinishedNeutralTitle: 'Trip Completed',
    tripCompletedTitle: 'Green Trip Completed!',
    tripEarlySub:
      'The trip was stopped before arriving at the destination (within 60 m of point B), so 0 points were awarded.',
    tripNeutralSub:
      'Driving a private car earns 0 eco-points. Next time choose VeloTM or STPT tram for +90 points!',
    tripCompletedSub:
      'Thank you for keeping Timișoara’s air clean and reducing traffic!',
    ecoPointsUnit: 'Eco-Points',
    co2Saved: 'CO₂ Saved',
    durationLabel: 'Duration',
    totalPointsHeader: (pts: number) => `⭐ Total: ${pts} points`,
    pointsToStpt: (rem: number) => `${rem} more for STPT day pass`,
    rewardUnlocked: 'Reward unlocked! 🎉',
    viewRewards: 'View Rewards 🎁',
    backToMap: 'Back to Map',

    // HistoryScreen
    historyTitle: 'Trip History',
    historySubtitle:
      'Your recorded trips and contribution to lowering emissions in Timișoara.',
    historyLoading: 'Loading trip history…',
    historyError:
      'Could not load trip history. Check your connection and try again.',
    historyEmptyTitle: 'No recorded trips yet',
    historyEmptySub:
      'Here you will see an overview of your completed trips and earned eco-points.',
    modePrefix: 'Mode',
    distancePrefix: 'Distance',

    // RewardsScreen & PointsSummaryCard
    myEcoPoints: 'My Eco-Points',
    co2SavedShort: 'CO₂ Saved',
    greenRoutesShort: 'Green routes',
    treesEquivShort: 'Trees equiv.',
    rewardsCatalogTitle: 'DEMO Rewards Catalog',
    rewardsNotice:
      'These are demonstration reward examples. Partner names and discounts are not real offers. Generated promo codes have no real value and redemption records are temporary.',
    rewardsBackendOff:
      'Backend redemption is not yet available. Demo redemption is disabled.',
    rewardsLoginRequired: 'Sign in to redeem demo rewards.',
    rewardsLoadError:
      'Could not load demo rewards. Please try again later.',
    rewardsBackendUnavailable:
      'Backend redemption is not yet available.',
    rewardsAlreadyRedeemed: 'This demo reward has already been redeemed.',
    rewardsInvalidCost: 'Points cost for this demo reward could not be verified.',
    rewardsExpired: 'This demo reward has expired.',
    rewardsExpiryCheckFailed: 'Could not verify expiration date.',
    rewardsMissingPoints: (n: number) => `You need ${n} more eco-points.`,
    rewardsActivationFailed: 'Demo reward was not activated. Please try again.',
    rewardsModeChanged: 'Demo mode is no longer active. Points were not spent.',
    rewardsRedeemFailed: 'Redemption failed. Please try again.',
    demoExamplePrefix: 'Demo example:',
    redeemedDemoLabel: 'Redeemed — demo',
    redeemDemoBtn: 'Redeem — demo',
    activatingReward: 'Activating demo reward…',
    demoPromoCode: 'Demo promo code:',
    invalidRewardCostInline: 'Invalid reward cost.',

    // ProfileScreen & ProfileDetails
    ageBadge: (age: number) => `Age: ${age} yrs`,
    accessibilityActiveBadge: 'Accessibility active',
    accessibilityAndVehicles: 'Accessibility & Personal Vehicles',
    disabilityLabel: 'Person with disability / Wheelchair',
    disabilityDesc:
      'Automatically filters accessible public transit and reserved parking.',
    ownBikeLabel: 'I own a bicycle',
    ownBikeDesc:
      'Suggests direct bicycle routes instead of rentals.',
    ownCarLabel: 'I own a car',
    ownCarDesc:
      'Enables driving options with recommended parking.',
    wcagSectionHeader: 'Accessibility (Law 232/2022 • WCAG 2.1 AA)',
    wcagLargeTextLabel: '🔤 Large Text (WCAG 1.4.4)',
    wcagLargeTextDesc:
      'Increases route headings, metrics, and instructions for low vision.',
    wcagTextMapLabel: '📋 Textual Map Display (EN 301 549)',
    wcagTextMapDesc:
      'Replaces visual map pins with an accessible stop and step-by-step directory.',
    displayNameLabel: 'Display name',
    displayNameEmptyError: 'Enter a display name. Name cannot be empty.',
    editProfileBtn: 'Edit Profile',
    logoutBtn: 'Sign Out',
    statementModalTitleBtn:
      '📜 Law 232/2022 & WCAG 2.1 AA Statement (RO / EN)',
    statementModalSubBtn:
      'Accessibility statement • EN 301 549 • ADR Feedback',
    statementModalA11y:
      'Open Romanian Law 232/2022 and WCAG 2.1 AA Accessibility Statement in Romanian and English',

    // Dashboard & CityMetrics
    dashboardBannerTitle: '🌱 BeGreen Green Intelligence — Timișoara DEMO',
    dashboardBannerSubtitle:
      'All metrics, infrastructure scores, and investment recommendations are simulated demo data, not official city statistics. This view does not represent official recommendations or endorsement by the City of Timișoara.',
    dashboardSimBadge: 'DEMO — simulated data',
    dashboardMetricsHeading: 'Simulated City Metrics & Priority Zones',
    dashboardMetricsLoading:
      'Loading simulated metrics and priority zones…',
    dashboardMetricsError:
      'Could not load city metrics and priority zones. Please retry.',
    dashboardMetricsRetry: 'Reload Metrics',
    dashboardNoZones:
      'No priority investment zones in this demo dataset.',
    dashboardGapsHeading:
      'Simulated Network Gaps (car share & bike lanes)',
    dashboardGapsLoading: 'Loading simulated infrastructure gaps…',
    dashboardGapsError:
      'Could not load infrastructure gaps. Please retry.',
    dashboardGapsRetry: 'Reload Gaps',
    dashboardNoGaps:
      'No infrastructure gaps to display in this demo dataset.',
    demoPriorityLabel: 'Demo priority:',
    carShareLabel: '🚗 Car share:',
    toBikeLaneLabel: '🚲 To bike lane:',
    toFirstStopLabel: '🚏 To first transit stop:',
    simCo2Saved: 'Simulated CO₂ Saved',
    simTrips: 'Simulated Sustainable Trips',
    identifiedCells: 'Identified DEMO Infrastructure Cells',
    topGapZonesHeading: 'Priority Investment Zones — Simulation',
    simPotentialPrefix: 'Simulated potential:',
    perYearSuffix: 'CO₂/yr',

    // Auth (Login & Register)
    loginTagline: "Getting from A to B shouldn't cost the planet.",
    loginFormTitle: 'DEMO MODE — Demo Access',
    loginNotice:
      'Email and password are for form display only and are not verified on a server. Do not enter real passwords. Continuing opens the student demo profile.',
    emailAddressLabel: 'Email address',
    emailPlaceholder: 'enter email',
    passwordLabel: 'Password',
    openStudentDemoBtn: 'Open Student Demo',
    wantCustomDemo: 'Want your own demo profile? ',
    createDemoProfileLink: 'Create demo profile',
    quickDemoTitle: '⚡ Quick Demo Access (for jury & testing):',
    quickDemoStudent: '👤 Student (Bike/Transit)',
    quickDemoAccess: '♿ Accessibility (Wheelchair)',

    regTitle: 'DEMO MODE — Local Profile',
    regSubtitle:
      'Create a local demo profile to explore the app. No real server account is created. This profile is temporary.',
    regFullNameLabel: 'Full name',
    regFullNamePlaceholder: 'e.g. Andrei Popescu',
    regEmailLabel: 'Email',
    regBirthDateLabel: 'Birth date (YYYY-MM-DD)',
    regSectionAccessibility: 'Accessibility & Personal Vehicles',
    regSubmitBtn: 'Create demo profile (+50 eco-points)',
    regBackToDemo: 'Back to demo access',
    regNameError: 'Enter full name.',
    regEmailError: 'Enter a valid email address.',
    regDateFormatError: 'Enter date in YYYY-MM-DD format.',
    regDateInvalidError: 'Enter a valid calendar date.',
    regDateFutureError: 'Birth date cannot be in the future.',

    // Transport modes (general)
    modeWalk: 'Walk',
    modeBike: 'Bike',
    modeScooter: 'Scooter',
    modePublicTransport: 'Public Transit',
    modeCar: 'Car',
    modeCarpool: 'Carpool',
    modeCombined: 'Combined',

    // Services (MOCK rewards & routeService)
    svcReward1Title: 'Free coffee with reusable cup',
    svcReward1Desc:
      'Exchange your eco-points for freshly roasted coffee downtown.',
    svcReward1Discount: '100% off',
    svcReward2Title: 'One-day tram & bus pass',
    svcReward2Desc:
      'Free unlimited rides across the STPT public transit network.',
    svcReward3Title: '30% off bicycle tune-up',
    svcReward3Desc:
      'Brake check, chain lubrication, and wheel truing.',
    svcReward3Discount: '30% off',
    svcHistToday: 'Today, 10:15',
    svcHistYesterday: 'Yesterday, 17:30',
    svcDefaultStopA: 'Departure stop',
    svcDefaultStopB: 'Arrival stop',
    svcStationFallback: 'Station',
    svcTimParkFallback: 'TimPark Parking',
    svcPointFallback: 'Point',
    svcWalkWheelchairTitle: 'Walk / Wheelchair (Adapted sidewalks)',
    svcWalkTitle: 'Walk',
    svcWalkDesc: 'Walking route through Timișoara streets and bridges',
    svcWalkToStation: (name: string) => `Walk to station ${name}`,
    svcBikeFromStation: (name: string) =>
      `Bike route by road from ${name} to destination`,
    svcBikeDesc: 'Bike route along Timișoara streets and paths',
    svcHelmetWarning:
      'Helmet is legally required for riders aged 14–16.',
    svcScooterDesc: 'E-scooter ride along streets and cycling corridors',
    svcWalkFromStopToDest: (name: string) =>
      `Walk from stop ${name} to destination`,
    svcAccessibleStopMsg:
      'Selected STPT line with accessible boarding.',
    svcDriveToParking: (name: string) => `Drive by road to ${name}`,
    svcDriveDesc: 'Car route along Timișoara roads',
    svcWalkFromParking: (name: string, distText: string) =>
      `Walk from ${name} (${distText}) to destination`,
    svcCarCo2Warn: (carCo2: number) =>
      `Car emits ${carCo2}g CO₂. Public transit or biking keeps Timișoara air cleaner.`,
    svcVehicleTram: 'Tram',
    svcVehicleTrolleybus: 'Trolleybus',
    svcVehicleBus: 'Bus',
    svcPublicTransitSmtt: 'Public Transit (SMTT)',
    svcOwnBikeTitle: 'Own bicycle',
    svcRentBikeTitle: 'Bike rental (VeloTM)',
    svcOwnScooterTitle: 'Own e-scooter',
    svcRentScooterTitle: 'E-scooter rental',
    svcLowFloorTag: 'Low-floor',
    svcCarAccessibleTitle: 'Car (Accessible TimPark parking)',
    svcCarTitlePrefix: 'Car',
    svcNearPrefix: (name: string) => `Near ${name}`,
    svcApiHealthy: (ms: number) => `Backend active (${ms} ms)`,
    svcApiTimeout: (ms: number) =>
      `Timeout (${ms} ms) — use Offline Demo mode`,
    svcApiUnreachable: (url: string) =>
      `Unreachable (${url}) — Offline Demo is ready`,
  },
} as const;

export type TranslationKeys = typeof translations.ro;
