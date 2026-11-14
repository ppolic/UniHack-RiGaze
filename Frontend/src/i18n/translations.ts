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
    svcOriginFallback: 'Plecare',

    // Stack Headers & Language Toggle
    challengesHeaderTitle: 'Provocări',
    reportIssueHeaderTitle: 'Raportează o problemă',
    switchToEnA11y: 'Schimbă limba în engleză',
    switchToRoA11y: 'Schimbă limba în română',

    // Auth (Login & Register)
    loginTitle: 'Autentificare în BeGreen',
    loginSubtitle: 'Introdu emailul și parola. Autentificarea necesită o conexiune la server.',
    loginButton: 'Autentifică-te',
    demoBypassButton: 'Demo Bypass (Intră fără cont)',
    noAccountPrompt: 'Nu ai cont? ',
    createAccountLink: 'Creează un cont',
    loginFailed: 'Email sau parolă incorectă.',
    loginServerError:
      'Nu am putut contacta serverul sau confirma autentificarea. Verifică conexiunea și încearcă din nou.',
    registerTitle: 'Creează un cont',
    registerSubtitle:
      'Creează un cont BeGreen pentru călătorii, economii de CO₂ și eco-puncte. Înregistrarea este confirmată de server.',
    registerPasswordLabel: 'Parolă (minim 8 caractere)',
    registerPasswordPlaceholder: 'Cel puțin 8 caractere',
    registerPasswordError: 'Parola trebuie să aibă cel puțin 8 caractere.',
    registerFailed: 'Înregistrarea a eșuat.',
    registerServerError:
      'Nu am putut contacta serverul sau confirma înregistrarea. Verifică conexiunea și încearcă din nou.',
    createAccountButton: 'Creează cont',
    backToSignIn: 'Înapoi la autentificare',
    authUnconfirmedError: 'Serverul nu a confirmat autentificarea. Încearcă din nou.',

    // Home & Coming Soon
    homeBrand: 'BEGREEN · TIMIȘOARA',
    homeGreetingNamed: (firstName: string) => `Bună, ${firstName}!`,
    homeGreetingDefault: 'Bine ai venit!',
    homeIntro: 'Un drum mai bun începe cu o alegere verde.',
    homeHeroBadge: 'MAI BINE PENTRU ORAȘ',
    homeHeroTitle: 'Unde mergem?',
    homeHeroDescription:
      'Pe jos, cu bicicleta sau cu transportul public: găsește o variantă mai sustenabilă pentru următoarea călătorie.',
    homeOpenMapBtn: 'Deschide harta',
    homeOpenMapA11y: 'Deschide harta și planifică o călătorie',
    homeSectionTitle: 'La un pas distanță',
    homeSectionSubtitle: 'Tot ce ai nevoie pentru a merge mai departe.',
    homeShortcutFavoritesTitle: 'Favorite',
    homeShortcutFavoritesDesc: 'Un loc pentru drumurile preferate.',
    homeShortcutHistoryTitle: 'Istoric',
    homeShortcutHistoryDesc: 'Revino la călătoriile tale.',
    homeShortcutChallengesTitle: 'Provocări',
    homeShortcutChallengesDesc: 'Pași mici pentru un oraș mai verde.',
    homeShortcutReportTitle: 'Raportează o problemă',
    homeShortcutReportDesc: 'Ajută la îmbunătățirea traseelor.',
    homeShortcutPointsTitle: 'Puncte',
    homeShortcutPointsDesc: 'Vezi punctele și recompensele tale.',
    homeShortcutCouponsTitle: 'Cupoane',
    homeShortcutCouponsDesc: 'Explorează catalogul de recompense.',
    comingSoonLabel: 'În curând',
    comingSoonBody: 'Această funcție nu este încă disponibilă.',
    backHomeBtn: 'Înapoi acasă',

    // History & Favorites
    historyEyebrow: 'DRUMURILE TALE',
    historyScreenTitle: 'Favorite și istoric',
    historyScreenSubtitle: 'Alegerile de azi, într-un oraș mai verde mâine.',
    historyTabFavorites: '♡  Favorite',
    historyInListSuffix: ' în listă',
    historyRetentionNote:
      'Serviciul poate returna date inițializate și nu confirmă păstrarea lor după repornirea serverului.',
    historyUnavailableTitle: 'Istoricul nu este disponibil',
    favoritesLoadError: 'Nu am putut încărca favoritele. Verifică conexiunea și încearcă din nou.',
    favoritesNoticeTitle: 'Favorite din serviciul BeGreen',
    favoritesNoticeBody1:
      'Sunt afișate doar rutele pe care serverul le asociază contului tău. Lista poate include exemple inițializate de server; proveniența și păstrarea după repornire nu sunt confirmate de API.',
    favoritesNoticeBody2:
      'Adăugarea și ștergerea sunt indisponibile până când serverul confirmă salvarea durabilă și dreptul de modificare a rutelor.',
    favoritesAddDisabledBtn: 'Adăugare indisponibilă',
    favoritesAccountRoutesTitle: 'Rute asociate contului',
    reloadBtn: 'Reîncarcă',
    favoritesLoading: 'Se încarcă favoritele…',
    favoritesLoadingA11y: 'Se încarcă favoritele',
    favoritesEmptyTitle: 'Nicio rută asociată contului',
    favoritesEmptyDesc:
      'Serverul nu a returnat rute favorite care aparțin acestui cont. Exemplele comune nu sunt incluse.',
    favoritesStepFreePref: 'Preferință salvată: acces fără trepte',
    favoritesDeleteDisabledBtn: 'Ștergere indisponibilă',
    favoritesListInvalidError: 'Serverul a returnat o listă de favorite nevalidă.',
    favoritesItemInvalidError: 'Serverul a returnat o favorită nevalidă.',
    favoritesRecordUnverifiedError: 'Datele unei rute favorite nu pot fi verificate.',

    // Profile
    profileEyebrow: 'CONTUL TĂU',
    profileSubtitle: 'Preferințele tale, pentru călătorii care ți se potrivesc.',
    profileNameSyncNote:
      'Numele se actualizează imediat în aplicație. Dacă serverul nu este disponibil, modificarea poate să nu se păstreze la următoarea autentificare.',
    profileSessionTitle: 'Sesiunea ta',
    profileSessionDesc:
      'Deconectarea închide sesiunea curentă. Pentru a reveni în cont, va trebui să te autentifici din nou.',
    profileAgeUnconfirmed: 'Vârstă neconfirmată',
    profileVisualOptionsActive: 'Opțiuni vizuale active',
    profileAccessibilityHint:
      'Ține cont de accesibilitate când sunt propuse opțiunile de transport.',
    profileOwnBikeHint: 'Folosește bicicleta proprie la planificarea călătoriilor.',
    profileOwnCarHint: 'Include opțiunile de călătorie cu mașina proprie.',

    // Rewards
    rewardsEyebrow: 'ALEGERILE VERZI CONTEAZĂ',
    rewardsTitle: 'Puncte și cupoane',
    rewardsSubtitle: 'Soldul și activările sunt încărcate din contul tău de pe server.',
    rewardsReloadDataBtn: 'Reîncarcă datele',
    rewardsLoadingBalance: 'Se încarcă soldul…',
    rewardsLoadingBalanceA11y: 'Se încarcă soldul',
    rewardsReloadBalanceBtn: 'Reîncarcă soldul',
    rewardsMemoryWarning:
      'Serverul poate funcționa temporar în memorie. Un răspuns confirmat nu garantează păstrarea datelor după repornirea serverului.',
    rewardsAvailableTitle: 'Recompense disponibile',
    rewardsAvailableDesc:
      'Activarea folosește punctele contului. Soldul și istoricul trebuie încărcate înainte de activare.',
    rewardsLoadingRewards: 'Se încarcă recompensele…',
    rewardsLoadingRewardsA11y: 'Se încarcă recompensele',
    rewardsCatalogUnavailable: 'Catalog indisponibil',
    rewardsReloadRewardsBtn: 'Reîncarcă recompensele',
    rewardsEmptyTitle: 'Nicio recompensă disponibilă acum',
    rewardsEmptyDesc: 'Serverul a returnat un catalog fără recompense active.',
    rewardsBadgeLabel: 'RECOMPENSĂ',
    rewardsRedeemedBtn: 'Activată',
    rewardsRedeemBtn: 'Activează recompensa',
    rewardsRedeeming: 'Se activează recompensa…',
    rewardsRecordedBadge: 'Activare înregistrată',
    rewardsCodePrefix: 'Cod:',
    rewardsLedgerTitle: 'Activări și cupoane',
    rewardsLedgerDesc:
      'Activările sunt reîncărcate din tranzacțiile contului. API-ul nu oferă recuperarea codurilor anterioare. Codurile primite aici rămân temporar în acest ecran; copiază-le înainte de a-l închide.',
    rewardsLoadingLedger: 'Se încarcă activările…',
    rewardsLoadingLedgerA11y: 'Se încarcă activările',
    rewardsReloadLedgerBtn: 'Reîncarcă activările',
    rewardsNoRedemptionsTitle: 'Nicio activare înregistrată',
    rewardsNoRedemptionsDesc:
      'Serverul nu a returnat tranzacții de activare pentru contul tău.',
    rewardsSpentSuffix: ' utilizate',
    rewardsCodeUnavailable: 'Codul acestei activări nu este disponibil prin API.',
    rewardsRedemptionPrefix: 'Activare #',
    rewardsDataLoadError:
      'Nu am putut încărca datele. Verifică conexiunea și încearcă din nou.',
    rewardsExpiredError: 'Această recompensă a expirat.',
    rewardsSignInRequired: 'Autentifică-te din nou pentru a activa recompense.',
    rewardsLoadPrerequisites:
      'Încarcă soldul și istoricul activărilor înainte de a continua.',
    rewardsRedeemUnconfirmed:
      'Activarea nu a putut fi confirmată. Reîncarcă soldul și istoricul.',
    rewardsRedeemConfirmFailed:
      'Nu am putut confirma activarea. Cererea poate să fi ajuns la server. Reîncarcă soldul și istoricul înainte de a reîncerca.',
    rewardsCatalogInvalid: 'Catalogul returnat de server nu este valid.',
    rewardsCatalogItemInvalid: 'O recompensă din catalog nu poate fi verificată.',
    rewardsInvalidId: 'Identificatorul recompensei nu este valid.',
    rewardsRedeemPending:
      'O activare este deja în curs. Așteaptă confirmarea serverului.',
    rewardsRedeemConfirmReload:
      'Activarea nu a putut fi confirmată. Reîncarcă soldul și istoricul înainte de a reîncerca.',
    rewardsHistoryChanged:
      'Istoricul activărilor s-a schimbat sau nu este valid. Reîncarcă datele.',
    rewardsHistoryIncomplete: 'Istoricul activărilor este incomplet. Încearcă din nou.',
    rewardsTxUnverified: 'O tranzacție nu poate fi verificată. Reîncarcă istoricul.',
    rewardsRecordInvalid: 'Datele unei activări nu sunt valide.',
    rewardsHistoryInconsistent:
      'Istoricul activărilor este inconsistent. Reîncarcă datele.',
    rewardsHistoryTooLarge:
      'Istoricul contului este prea mare pentru încărcarea completă. Este necesară filtrarea activărilor pe server.',
    rewardsTripsInvalid: 'Istoricul călătoriilor returnat de server nu este valid.',
    rewardsTripUnverified: 'Datele unei călătorii nu pot fi verificate.',

    // Session & Common Service Errors
    sessionSignInAgain: 'Autentifică-te din nou pentru a continua.',
    sessionChangedReload:
      'Sesiunea s-a schimbat. Reîncarcă datele după autentificare.',
    sessionChangedRetry:
      'Sesiunea s-a schimbat. Revino în ecran și încearcă din nou.',
    sessionAccountUnconfirmed: 'Serverul nu a confirmat datele contului.',
    sessionIdentityUnconfirmed:
      'Serverul nu a confirmat sesiunea contului tău. Autentifică-te din nou.',
    sessionExpiredError:
      'Sesiunea a expirat sau accesul a fost refuzat. Autentifică-te din nou.',
    sessionDuplicateRewardError:
      'Serverul a refuzat o activare repetată sau o recompensă inactivă. Reîncarcă datele înainte de a continua.',
    sessionBadRequestError:
      'Serverul a respins operația. Verifică soldul și datele înainte de a încerca din nou.',

    // Challenges
    challengesEyebrow: 'PAȘI MICI, SCHIMBĂRI MARI',
    challengesTitle: 'Provocări',
    challengesSubtitle: 'Descoperă obiectivele de mobilitate sustenabilă din catalog.',
    challengesNoticeTitle: 'Ce este disponibil acum',
    challengesNoticeBody1:
      'Poți consulta și reîncărca provocările. Înscrierea separată nu este disponibilă. Progresul, finalizarea și colectarea bonusurilor nu pot fi confirmate în siguranță de serviciul actual.',
    challengesNoticeBody2:
      'De aceea nu afișăm un progres presupus și nu acordăm puncte din acest ecran.',
    challengesJoinDisabledBtn: 'Înscriere separată indisponibilă',
    challengesCatalogTitle: 'Catalog de provocări',
    challengesLoading: 'Se încarcă provocările…',
    challengesLoadingA11y: 'Se încarcă provocările',
    challengesUnavailableTitle: 'Provocările nu sunt disponibile',
    challengesEmptyTitle: 'Nicio provocare disponibilă acum',
    challengesEmptyDesc:
      'Catalogul returnat de server este gol. Poți reveni mai târziu sau reîncărca lista.',
    challengesDefaultCategory: 'Provocare',
    challengesBonusPointsSuffix: ' puncte bonus posibile',
    challengesGoalPrefix: 'Obiectiv:',
    challengesAccessibleLabel: 'Adaptată pentru accesibilitate',
    challengesProgressUnavailable:
      'Progres și status de finalizare: indisponibile pentru verificare.',
    challengesCollectDisabledBtn: 'Colectare puncte indisponibilă',
    challengeCatBike: 'Bicicletă',
    challengeCatWalk: 'Pe jos',
    challengeCatTransit: 'Transport public',
    challengeCatCarbon: 'Impact climatic',
    challengeCatCarFree: 'Fără mașină',
    challengeCatCommunity: 'Comunitate',
    challengeCatAccessibility: 'Accesibilitate',
    challengeUnitTrips: 'călătorii',
    challengeUnitTrip: 'călătorie',
    challengeUnitDay: 'zi',
    challengeUnitDays: 'zile',
    challengeUnitReport: 'raportare',
    challengesCopy: {
      'bike-3x': {
        title: 'Săptămâna pe bicicletă',
        description:
          'Alege bicicleta proprie sau una închiriată pentru drumurile către facultate sau serviciu.',
      },
      'accessible-transit-3x': {
        title: 'Transport public accesibil',
        description:
          'Călătorește fără bariere, cu tramvaie și autobuze cu podea joasă.',
      },
      'car-free-day': {
        title: 'O alegere fără mașina proprie',
        description:
          'Alege mersul pe jos, bicicleta, transportul public sau o călătorie partajată pentru deplasările zilnice.',
      },
      'walk-10km': {
        title: 'Mai mult mers pe jos',
        description:
          'Adună kilometri pe jos, prin coridoarele verzi de pe Bega și zonele pietonale ale orașului.',
      },
      'accessible-10km': {
        title: 'Mobilitate fără bariere',
        description:
          'Alege trasee fără trepte, transport public cu podea joasă sau călătorii partajate accesibile.',
      },
      'try-transit': {
        title: 'Descoperă transportul public',
        description:
          'Folosește transportul public STPT sau împarte o călătorie cu alți pasageri.',
      },
      'save-5kg-co2': {
        title: 'Mai puține emisii CO₂',
        description:
          'Înlocuiește drumurile cu mașina cu opțiuni sustenabile și economisește emisii de CO₂.',
      },
      'waze-guardian': {
        title: 'Ajută comunitatea în mișcare',
        description:
          'Raportează sau confirmă obstacole, lucrări și căi de acces blocate pentru persoanele cu mobilitate redusă.',
      },
    } as Record<string, { title: string; description: string }>,
    communitySessionInvalid:
      'Sesiunea nu mai este validă. Autentifică-te din nou pentru a continua.',
    communityServerRejected:
      'Serverul a respins datele. Verifică formularul și încearcă din nou.',
    communitySubmitUnconfirmed:
      'Nu am putut confirma trimiterea. Cererea poate să fi ajuns la server; retrimiterea poate crea un duplicat. Datele formularului au fost păstrate.',
    communityLoadError:
      'Nu am putut încărca provocările. Verifică conexiunea și încearcă din nou.',
    communityReportPending:
      'O raportare este deja în curs de trimitere. Așteaptă confirmarea înainte de a încerca din nou.',

    // Report Issue
    reportEyebrow: 'UN ORAȘ MAI UȘOR DE PARCURS',
    reportTitle: 'Raportează o problemă',
    reportSubtitle:
      'Spune-ne ce îngreunează deplasarea. Introdu locul și detaliile observate.',
    reportSessionChanged:
      'Sesiunea s-a schimbat. Verifică autentificarea înainte de a continua.',
    reportErrCategory: 'Alege o categorie.',
    reportErrDescriptionRequired: 'Descrie problema observată.',
    reportErrDescriptionMax: 'Descrierea poate avea cel mult 600 de caractere.',
    reportErrStreetMax: 'Folosește cel mult 150 de caractere.',
    reportErrLatitude: 'Introdu o latitudine între -90 și 90.',
    reportErrLongitude: 'Introdu o longitudine între -180 și 180.',
    reportReceiptBadge: 'Primită de server',
    reportReceiptTitle: (id: number) => `Raportarea #${id} a fost primită`,
    reportCoordsLabel: (lat: number, lng: number) =>
      `Latitudine: ${lat} · Longitudine: ${lng}`,
    reportReceiptDisclaimer:
      'Confirmarea atestă primirea de către serverul BeGreen. Păstrarea după repornirea serverului și acordarea punctelor nu sunt garantate de serviciul actual. Raportarea nu este transmisă automat către primărie.',
    reportAnotherBtn: 'Raportează altă problemă',
    reportStep1Title: '1. Ce ai observat?',
    reportStep1Hint: 'Categoria și descrierea sunt obligatorii.',
    reportCategoryGroupA11y: 'Categoria problemei',
    reportDescLabel: 'Descriere *',
    reportDescA11y: 'Descrierea problemei, obligatorie',
    reportCharsCount: (count: number) => `${count}/600 caractere`,
    reportStep2Title: '2. Unde se află problema?',
    reportStep2Desc:
      'Introdu coordonate WGS84 în grade zecimale. Poți folosi punct sau virgulă. Nu este necesar accesul la GPS.',
    reportStreetLabel: 'Stradă sau zonă (opțional)',
    reportStreetA11y: 'Stradă sau zonă, opțional',
    reportLatLabel: 'Latitudine *',
    reportLatA11y: 'Latitudine, obligatorie, între -90 și 90',
    reportLngLabel: 'Longitudine *',
    reportLngA11y: 'Longitudine, obligatorie, între -180 și 180',
    reportFormCheckError: 'Verifică câmpurile marcate înainte de trimitere.',
    reportSubmitDisclaimer:
      'Raportarea ajunge la BeGreen și nu înlocuiește o sesizare oficială către primărie.',
    reportRetryBtn: 'Reîncearcă trimiterea',
    reportSubmitBtn: 'Trimite raportarea',
    reportSubmitting: 'Se verifică sesiunea și se trimite raportarea…',
    reportCatRoadBlockade: 'Drum blocat',
    reportCatRoadBlockadeDesc: 'Lucrări sau obstacole pe carosabil.',
    reportCatBlockedBike: 'Pistă de biciclete blocată',
    reportCatBlockedBikeDesc: 'Acces împiedicat pe o pistă existentă.',
    reportCatInaccessible: 'Zonă inaccesibilă',
    reportCatInaccessibleDesc: 'Bariere pentru deplasarea în siguranță.',
    reportCatMissingBike: 'Lipsă pistă de biciclete',
    reportCatMissingBikeDesc: 'Un loc unde este necesară o pistă.',
    reportCatTransitDisruption: 'Transport public perturbat',
    reportCatTransitDisruptionDesc: 'O problemă care afectează transportul public.',
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
    svcOriginFallback: 'Origin',

    // Stack Headers & Language Toggle
    challengesHeaderTitle: 'Challenges',
    reportIssueHeaderTitle: 'Report an issue',
    switchToEnA11y: 'Switch language to English',
    switchToRoA11y: 'Switch language to Romanian',

    // Auth (Login & Register)
    loginTitle: 'Sign in to BeGreen',
    loginSubtitle: 'Enter your email and password. Sign-in requires a server connection.',
    loginButton: 'Sign in',
    demoBypassButton: 'Demo Bypass (Skip Login)',
    noAccountPrompt: 'No account? ',
    createAccountLink: 'Create an account',
    loginFailed: 'Incorrect email or password.',
    loginServerError:
      'Could not connect to the server or confirm sign-in. Check your connection and try again.',
    registerTitle: 'Create an account',
    registerSubtitle:
      'Create a BeGreen account for trips, CO₂ savings and eco-points. Registration is confirmed by the server.',
    registerPasswordLabel: 'Password (at least 8 characters)',
    registerPasswordPlaceholder: 'At least 8 characters',
    registerPasswordError: 'Password must contain at least 8 characters.',
    registerFailed: 'Registration failed.',
    registerServerError:
      'Could not connect to the server or confirm registration. Check your connection and try again.',
    createAccountButton: 'Create account',
    backToSignIn: 'Back to sign in',
    authUnconfirmedError: 'The server did not confirm authentication. Please try again.',

    // Home & Coming Soon
    homeBrand: 'BEGREEN · TIMIȘOARA',
    homeGreetingNamed: (firstName: string) => `Hello, ${firstName}!`,
    homeGreetingDefault: 'Welcome!',
    homeIntro: 'A better journey begins with a green choice.',
    homeHeroBadge: 'BETTER FOR THE CITY',
    homeHeroTitle: 'Where are we going?',
    homeHeroDescription:
      'On foot, by bike, or by public transit: find a more sustainable option for your next trip.',
    homeOpenMapBtn: 'Open the map',
    homeOpenMapA11y: 'Open the map and plan a trip',
    homeSectionTitle: 'One step away',
    homeSectionSubtitle: 'Everything you need to keep moving forward.',
    homeShortcutFavoritesTitle: 'Favorites',
    homeShortcutFavoritesDesc: 'A place for your favorite routes.',
    homeShortcutHistoryTitle: 'History',
    homeShortcutHistoryDesc: 'Revisit your past journeys.',
    homeShortcutChallengesTitle: 'Challenges',
    homeShortcutChallengesDesc: 'Small steps for a greener city.',
    homeShortcutReportTitle: 'Report an issue',
    homeShortcutReportDesc: 'Help improve city routes.',
    homeShortcutPointsTitle: 'Points',
    homeShortcutPointsDesc: 'See your points and rewards.',
    homeShortcutCouponsTitle: 'Coupons',
    homeShortcutCouponsDesc: 'Explore the reward catalog.',
    comingSoonLabel: 'Coming soon',
    comingSoonBody: 'This feature is not available yet.',
    backHomeBtn: 'Back to Home',

    // History & Favorites
    historyEyebrow: 'YOUR JOURNEYS',
    historyScreenTitle: 'Favorites & History',
    historyScreenSubtitle: 'Today’s choices, a greener city tomorrow.',
    historyTabFavorites: '♡  Favorites',
    historyInListSuffix: ' in list',
    historyRetentionNote:
      'The service may return seeded data and does not confirm retention after a server restart.',
    historyUnavailableTitle: 'History is unavailable',
    favoritesLoadError: 'Could not load favorites. Check your connection and try again.',
    favoritesNoticeTitle: 'Favorites from BeGreen service',
    favoritesNoticeBody1:
      'Only routes associated with your account by the server are shown. The list may include server-seeded examples; origin and retention after restart are not confirmed by the API.',
    favoritesNoticeBody2:
      'Adding and deleting are unavailable until the server confirms durable storage and route modification rights.',
    favoritesAddDisabledBtn: 'Adding unavailable',
    favoritesAccountRoutesTitle: 'Account routes',
    reloadBtn: 'Reload',
    favoritesLoading: 'Loading favorites…',
    favoritesLoadingA11y: 'Loading favorites',
    favoritesEmptyTitle: 'No routes associated with this account',
    favoritesEmptyDesc:
      'The server returned no favorite routes belonging to this account. Shared examples are excluded.',
    favoritesStepFreePref: 'Saved preference: step-free access',
    favoritesDeleteDisabledBtn: 'Deleting unavailable',
    favoritesListInvalidError: 'The server returned an invalid favorites list.',
    favoritesItemInvalidError: 'The server returned an invalid favorite route.',
    favoritesRecordUnverifiedError: 'A favorite route record could not be verified.',

    // Profile
    profileEyebrow: 'YOUR ACCOUNT',
    profileSubtitle: 'Your preferences, for journeys that suit you.',
    profileNameSyncNote:
      'Your name updates immediately in the app. If the server is unavailable, the change may not be retained the next time you sign in.',
    profileSessionTitle: 'Your session',
    profileSessionDesc:
      'Signing out ends your current session. You will need to sign in again to return to your account.',
    profileAgeUnconfirmed: 'Age unconfirmed',
    profileVisualOptionsActive: 'Visual options enabled',
    profileAccessibilityHint:
      'Consider accessibility when suggesting transport options.',
    profileOwnBikeHint: 'Use your own bicycle when planning journeys.',
    profileOwnCarHint: 'Include travel options using your own car.',

    // Rewards
    rewardsEyebrow: 'GREEN CHOICES MATTER',
    rewardsTitle: 'Points & Coupons',
    rewardsSubtitle: 'Your balance and redemptions are loaded from your account on the server.',
    rewardsReloadDataBtn: 'Reload data',
    rewardsLoadingBalance: 'Loading balance…',
    rewardsLoadingBalanceA11y: 'Loading balance',
    rewardsReloadBalanceBtn: 'Reload balance',
    rewardsMemoryWarning:
      'The server may temporarily use memory storage. A confirmed response does not guarantee data retention after a server restart.',
    rewardsAvailableTitle: 'Available rewards',
    rewardsAvailableDesc:
      'Redemption spends account points. Load your balance and history before redeeming.',
    rewardsLoadingRewards: 'Loading rewards…',
    rewardsLoadingRewardsA11y: 'Loading rewards',
    rewardsCatalogUnavailable: 'Catalog unavailable',
    rewardsReloadRewardsBtn: 'Reload rewards',
    rewardsEmptyTitle: 'No rewards available right now',
    rewardsEmptyDesc: 'The server returned a catalog with no active rewards.',
    rewardsBadgeLabel: 'REWARD',
    rewardsRedeemedBtn: 'Redeemed',
    rewardsRedeemBtn: 'Redeem reward',
    rewardsRedeeming: 'Redeeming reward…',
    rewardsRecordedBadge: 'Redemption recorded',
    rewardsCodePrefix: 'Code:',
    rewardsLedgerTitle: 'Redemptions & Coupons',
    rewardsLedgerDesc:
      'Redemptions are reloaded from account transactions. The API cannot retrieve previous codes. Codes received here remain temporarily in this screen; copy them before closing it.',
    rewardsLoadingLedger: 'Loading redemptions…',
    rewardsLoadingLedgerA11y: 'Loading redemptions',
    rewardsReloadLedgerBtn: 'Reload redemptions',
    rewardsNoRedemptionsTitle: 'No recorded redemptions',
    rewardsNoRedemptionsDesc:
      'The server returned no redemption transactions for your account.',
    rewardsSpentSuffix: ' spent',
    rewardsCodeUnavailable: 'The code for this redemption is not available through the API.',
    rewardsRedemptionPrefix: 'Redemption #',
    rewardsDataLoadError:
      'Could not load the data. Check your connection and try again.',
    rewardsExpiredError: 'This reward has expired.',
    rewardsSignInRequired: 'Sign in again to redeem rewards.',
    rewardsLoadPrerequisites:
      'Load your balance and redemption history before continuing.',
    rewardsRedeemUnconfirmed:
      'Redemption could not be confirmed. Reload your balance and history.',
    rewardsRedeemConfirmFailed:
      'Redemption could not be confirmed. The request may have reached the server. Reload your balance and history before retrying.',
    rewardsCatalogInvalid: 'The server returned an invalid reward catalog.',
    rewardsCatalogItemInvalid: 'A reward in the catalog could not be verified.',
    rewardsInvalidId: 'The reward identifier is invalid.',
    rewardsRedeemPending:
      'A redemption is already pending. Wait for the server confirmation.',
    rewardsRedeemConfirmReload:
      'Redemption could not be confirmed. Reload your balance and history before retrying.',
    rewardsHistoryChanged:
      'Redemption history changed or is invalid. Reload the data.',
    rewardsHistoryIncomplete: 'Redemption history is incomplete. Please retry.',
    rewardsTxUnverified: 'A transaction could not be verified. Reload the history.',
    rewardsRecordInvalid: 'A redemption record is invalid.',
    rewardsHistoryInconsistent:
      'Redemption history is inconsistent. Reload the data.',
    rewardsHistoryTooLarge:
      'The account history is too large to load completely. Redemption filtering is required on the server.',
    rewardsTripsInvalid: 'The server returned invalid trip history.',
    rewardsTripUnverified: 'A trip record could not be verified.',

    // Session & Common Service Errors
    sessionSignInAgain: 'Sign in again to continue.',
    sessionChangedReload:
      'Your session changed. Reload data after signing in.',
    sessionChangedRetry:
      'Your session changed. Return to this screen and try again.',
    sessionAccountUnconfirmed: 'The server did not confirm your account details.',
    sessionIdentityUnconfirmed:
      'The server could not confirm your account session. Please sign in again.',
    sessionExpiredError:
      'Your session expired or access was denied. Please sign in again.',
    sessionDuplicateRewardError:
      'The server rejected a duplicate redemption or inactive reward. Reload data before continuing.',
    sessionBadRequestError:
      'The server rejected the operation. Check your balance and details before trying again.',

    // Challenges
    challengesEyebrow: 'SMALL STEPS, BIG CHANGES',
    challengesTitle: 'Challenges',
    challengesSubtitle: 'Discover sustainable mobility goals from the catalog.',
    challengesNoticeTitle: 'What is available right now',
    challengesNoticeBody1:
      'You can browse and reload challenges. Separate enrollment is unavailable. Progress, completion, and bonus collection cannot be reliably confirmed by the current service.',
    challengesNoticeBody2:
      'Therefore we do not display estimated progress or award points from this screen.',
    challengesJoinDisabledBtn: 'Separate enrollment unavailable',
    challengesCatalogTitle: 'Challenge catalog',
    challengesLoading: 'Loading challenges…',
    challengesLoadingA11y: 'Loading challenges',
    challengesUnavailableTitle: 'Challenges are unavailable',
    challengesEmptyTitle: 'No challenges available right now',
    challengesEmptyDesc:
      'The catalog returned by the server is empty. You can check back later or reload the list.',
    challengesDefaultCategory: 'Challenge',
    challengesBonusPointsSuffix: ' possible bonus points',
    challengesGoalPrefix: 'Goal:',
    challengesAccessibleLabel: 'Adapted for accessibility',
    challengesProgressUnavailable:
      'Progress and completion status: unavailable for verification.',
    challengesCollectDisabledBtn: 'Point collection unavailable',
    challengeCatBike: 'Bike',
    challengeCatWalk: 'Walk',
    challengeCatTransit: 'Public transit',
    challengeCatCarbon: 'Climate impact',
    challengeCatCarFree: 'Car-free',
    challengeCatCommunity: 'Community',
    challengeCatAccessibility: 'Accessibility',
    challengeUnitTrips: 'trips',
    challengeUnitTrip: 'trip',
    challengeUnitDay: 'day',
    challengeUnitDays: 'days',
    challengeUnitReport: 'report',
    challengesCopy: {
      'bike-3x': {
        title: 'Bike to Work & Campus Week',
        description:
          'Choose your own or a rented bicycle for trips to university or work.',
      },
      'accessible-transit-3x': {
        title: 'Accessible Public Transit',
        description:
          'Travel barrier-free with low-floor trams and buses.',
      },
      'car-free-day': {
        title: 'A Choice Without Your Car',
        description:
          'Choose walking, cycling, public transit, or carpooling for your daily commute.',
      },
      'walk-10km': {
        title: 'More Walking',
        description:
          'Collect kilometers on foot along the Bega green corridors and pedestrian zones.',
      },
      'accessible-10km': {
        title: 'Barrier-Free Mobility',
        description:
          'Choose step-free routes, low-floor public transit, or accessible carpool rides.',
      },
      'try-transit': {
        title: 'Discover Public Transit',
        description:
          'Use STPT public transit or share a ride with other passengers.',
      },
      'save-5kg-co2': {
        title: 'Lower CO₂ Emissions',
        description:
          'Replace car trips with sustainable options and save CO₂ emissions.',
      },
      'waze-guardian': {
        title: 'Help the Community Move',
        description:
          'Report or confirm obstacles, roadworks, and blocked access paths for people with reduced mobility.',
      },
    } as Record<string, { title: string; description: string }>,
    communitySessionInvalid:
      'Your session is no longer valid. Sign in again to continue.',
    communityServerRejected:
      'The server rejected the data. Check the form and try again.',
    communitySubmitUnconfirmed:
      'Could not confirm submission. The request may have reached the server; resubmitting may create a duplicate. Form data has been kept.',
    communityLoadError:
      'Could not load challenges. Check your connection and try again.',
    communityReportPending:
      'A report submission is already in progress. Wait for confirmation before trying again.',

    // Report Issue
    reportEyebrow: 'AN EASIER CITY TO NAVIGATE',
    reportTitle: 'Report an issue',
    reportSubtitle:
      'Tell us what makes travel difficult. Enter the location and observed details.',
    reportSessionChanged:
      'Your session changed. Verify authentication before continuing.',
    reportErrCategory: 'Choose a category.',
    reportErrDescriptionRequired: 'Describe the observed issue.',
    reportErrDescriptionMax: 'Description can have at most 600 characters.',
    reportErrStreetMax: 'Use at most 150 characters.',
    reportErrLatitude: 'Enter a latitude between -90 and 90.',
    reportErrLongitude: 'Enter a longitude between -180 and 180.',
    reportReceiptBadge: 'Received by server',
    reportReceiptTitle: (id: number) => `Report #${id} has been received`,
    reportCoordsLabel: (lat: number, lng: number) =>
      `Latitude: ${lat} · Longitude: ${lng}`,
    reportReceiptDisclaimer:
      'This confirmation verifies receipt by the BeGreen server. Retention after server restart and point awards are not guaranteed by the current service. The report is not automatically forwarded to City Hall.',
    reportAnotherBtn: 'Report another issue',
    reportStep1Title: '1. What did you observe?',
    reportStep1Hint: 'Category and description are required.',
    reportCategoryGroupA11y: 'Issue category',
    reportDescLabel: 'Description *',
    reportDescA11y: 'Issue description, required',
    reportCharsCount: (count: number) => `${count}/600 characters`,
    reportStep2Title: '2. Where is the issue?',
    reportStep2Desc:
      'Enter WGS84 coordinates in decimal degrees. You can use a dot or comma. GPS access is not required.',
    reportStreetLabel: 'Street or zone (optional)',
    reportStreetA11y: 'Street or zone, optional',
    reportLatLabel: 'Latitude *',
    reportLatA11y: 'Latitude, required, between -90 and 90',
    reportLngLabel: 'Longitude *',
    reportLngA11y: 'Longitude, required, between -180 and 180',
    reportFormCheckError: 'Check the highlighted fields before submitting.',
    reportSubmitDisclaimer:
      'The report goes to BeGreen and does not replace an official City Hall complaint.',
    reportRetryBtn: 'Retry submission',
    reportSubmitBtn: 'Submit report',
    reportSubmitting: 'Verifying session and submitting report…',
    reportCatRoadBlockade: 'Blocked road',
    reportCatRoadBlockadeDesc: 'Roadworks or obstacles on the carriageway.',
    reportCatBlockedBike: 'Blocked bike lane',
    reportCatBlockedBikeDesc: 'Obstructed access on an existing bike lane.',
    reportCatInaccessible: 'Inaccessible area',
    reportCatInaccessibleDesc: 'Barriers preventing safe movement.',
    reportCatMissingBike: 'Missing bike lane',
    reportCatMissingBikeDesc: 'A location where a bike lane is needed.',
    reportCatTransitDisruption: 'Public transit disruption',
    reportCatTransitDisruptionDesc: 'An issue affecting public transport.',
  },
} as const;

export type TranslationKeys = typeof translations.ro;
