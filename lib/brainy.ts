import { entryAttachmentLimit } from "./platform";
import type { BookViewSettings } from "./book";
import type { TaskPlanner } from "./task-planner";
export type Language = "en" | "fr";
export type FieldKind = "TITLE" | "DATE" | "NUMBER" | "TIME" | "LINK" | "CHARACTER" | "TEXT" | "BOOLEAN" | "SELECT" | "MULTI_SELECT" | "DATETIME" | "DURATION" | "LONG_TEXT" | "ATTACHMENT" | "OBJECT_REF" | "MEASURE" | "CODE" | "POSITION" | "ZONE";
export type SensitivityLevel = "ORDINARY" | "PERSONAL" | "SENSITIVE";

export type User = { id: string; name: string; email: string; profession?: string | null; job?: string | null; fieldOfStudy?: string | null; interests: string[]; hobbies: string[]; profileCompleted: boolean; hasProfilePhoto?: boolean; onboardingCompleted?: boolean };
export type ProfileInput = { name: string; profession: string; job: string; fieldOfStudy: string; interests: string[]; hobbies: string[] };
export const formatColors = ["#EEF5FF", "#EDF9F3", "#FFF5EB", "#F4F0FF", "#FFF0F4", "#EAF8FA", "#FBF7E9", "#F1F8ED", "#F8F0FA", "#F1F5FA", "#FFF7F1", "#EFF8FF", "#FDEFF7", "#EDF7FF", "#F7FBEA", "#FFF0E8", "#EFEFFD", "#E9F8F4", "#FBF1E8", "#F0F8F9", "#FFF2EF", "#F4F8E8", "#F1F2FF", "#EFFAF0"] as const;
export type Field = { id: string; name: string; kind: FieldKind; sensitivity?: SensitivityLevel; unit?: string | null; options?: string[] | null; codeListId?: string | null; targetObjectFormatId?: string | null; multiple?: boolean | null; variableName?: string | null; referenceMode?: "CURRENT" | "SNAPSHOT" | null; sourceFieldId?: string | null };
export type ClassificationCode = { code: string; labelEn: string; labelFr: string; parentCode?: string | null; active: boolean; mergedInto?: string | null };
export type ClassificationList = { id: string; name: string; version: number; codes: ClassificationCode[]; /** More than 5,000 codes: searched on the server (T39/3). */ external?: boolean | null; codeCount?: number | null; levels?: number | null };
export type GeoPoint = { entryId: string; name: string; latitude: number; longitude: number; accuracy?: number | null };
export type GeoPage = { points: GeoPoint[]; nextCursor?: string | null; hasMore: boolean };
export type CollectionUnit = { id: string; name: string; symbol: string; dimension: string; baseUnitId?: string | null; factor: string; objectFormatId?: string | null; version: number };
export type ExchangeRate = { id: string; from: string; to: string; rate: string; effectiveAt: string };
export type UnitSnapshot = { id: string; version: number; symbol: string; dimension: string; factor: string; root: string; objectFormatId?: string | null };
export type WorkflowDefinition = { stateFieldId: string; initialState: string; transitions: { from: string; to: string; minimumRole: CollectionRole }[]; requirements: { state: string; fieldIds: string[] }[] };
export type EntryWorkflow = { assigneeUserId?: string | null; dueAt?: string | null; reminderMinutesBefore?: number | null; history: { kind: string; from: string; to: string; actorUserId: string; at: string; assigneeUserId?: string | null; dueAt?: string | null }[] };
export type CollectionFormat = { id: string; name: string; color: string; version?: number | null; objectModel?: boolean; appendOnly?: boolean; sensitivity?: SensitivityLevel; copiedFromFormatId?: string | null; linkedSource?: { sourceCollectionId: string; sourceFormatId: string; acceptedVersion: number; targetVersion: number } | null; workflow?: WorkflowDefinition | null; singleEntry?: boolean | null; parentFormatIds?: string[] | null; fields: Field[] };
const sensitivityRank: Record<SensitivityLevel, number> = { ORDINARY: 0, PERSONAL: 1, SENSITIVE: 2 };
export const defaultFieldSensitivity = (field: Field): SensitivityLevel =>
  field.sensitivity ?? (field.kind === "POSITION" || field.kind === "ZONE" ? "SENSITIVE" : "ORDINARY");
export const effectiveFieldSensitivity = (format: CollectionFormat, field: Field): SensitivityLevel => {
  const fieldLevel = defaultFieldSensitivity(field);
  const formatLevel = format.sensitivity ?? "ORDINARY";
  return sensitivityRank[formatLevel] >= sensitivityRank[fieldLevel] ? formatLevel : fieldLevel;
};
export type SavedView = { id: string; name: string; layout: "LIST" | "TABLE" | "CARDS" | "TASKS" | "CALENDAR" | "TASK_DAY" | "TASK_CALENDAR"; formatIds: string[]; columnFieldIds: string[]; search: string; filterFieldId?: string | null; filterOperator?: EntryFilter["operator"] | null; filterValue?: string | null; sort: "NEWEST" | "OLDEST" | "MANUAL"; manualOrderFieldIds?: string[]; groupByFormat: boolean; taskDoneFieldId?: string | null; taskDueFieldId?: string | null; taskCompletedFieldId?: string | null; taskPriorityFieldId?: string | null; calendarStartFieldId?: string | null; calendarEndFieldId?: string | null; calendarTimeZone?: string | null };
export type Formula = { id: string; name: string; formatId: string; expression: string; version: number; dependencies: string[] };
export type AnalysisOperationId = "COUNT" | "SUM" | "AVERAGE" | "MIN" | "MAX" | "MEDIAN" | "PERCENTILE" | "PERCENTILE_25" | "PERCENTILE_75" | "PERCENTILE_95" | "MODE" | "VARIANCE" | "STDDEV" | "STDDEV_SAMPLE" | "RANGE" | "RATE_PER_N" | "CROSSTAB" | "CUMULATIVE" | "MOVING_AVERAGE" | "SUCCESSIVE_DIFF" | "SUCCESSIVE_VARIATION" | "LINEAR_TREND";
export type AnalysisInput = { formatId: string; fieldId?: string; formulaId?: string; dateFieldId?: string; groupFieldId?: string; zoneFormatId?: string; zoneFieldId?: string; search?: string; viewId?: string; groupBy: "NONE" | "DAY" | "MONTH" | "CATEGORY" | "OBJECT" | "ZONE"; secondaryGroupBy?: "NONE" | "DAY" | "MONTH" | "CATEGORY" | "OBJECT"; secondaryGroupFieldId?: string; groupDepth?: number; secondaryGroupDepth?: number; language?: Language; operation: AnalysisOperationId; measureKind: "EVENT" | "SNAPSHOT" | "RATE"; percentile?: number; rateBase?: number; denominatorFieldId?: string; denominatorValue?: string; weightFieldId?: string; windowSize?: number; counterResetFieldId?: string; from?: string; to?: string; comparisonFrom?: string; comparisonTo?: string; filters?: EntryFilter[]; sourceGroup?: string; sourceOffset?: number };
export type AnalysisResult = { operation: string; operationVersion: number; groupBy: string; secondaryGroupBy?: string; unit?: string; dimension?: string; skippedMissingCount?: number; slope?: string; explanation?: string; hasEstimated?: boolean; propagatedUncertainty?: string; refreshedAt: string; rows: { group: string; label: string; rowKey?: string; columnKey?: string; value: string; count: number; sources: { entryId: string; value: string }[]; sourcesHasMore: boolean }[]; comparisonRows?: { group: string; label: string; rowKey?: string; columnKey?: string; value: string; count: number; sources: { entryId: string; value: string }[]; sourcesHasMore: boolean }[] };
export type StockRule = { id: string; name: string; formatId: string; kind: string; productFieldId: string; quantityFieldId: string; dateFieldId?: string; priceFieldId?: string; reasonFieldId?: string; fromLocationFieldId?: string; toLocationFieldId?: string; lotFieldId?: string; packageFactor: string; version: number };
export type StockPosition = { productId: string; productName: string; location: string; lot: string; quantity: string };
export type StockMovement = { id: string; kind: string; productId: string; productName: string; baseQuantity: string; fromLocation: string; toLocation: string; lot: string; occurredAt: string; createdAt: string; reason?: string; sourceEntryId?: string };
export type StockMovementInput = { kind: string; productId: string; quantity: string; packageFactor?: string; fromLocation?: string; toLocation?: string; lot?: string; occurredAt: string; priceSnapshot?: string; priceUnit?: string; reason?: string; reversalOf?: string; idempotencyKey: string };
export type StockPreview = { kind: string; productName: string; baseQuantity: string; beforeFrom: string; afterFrom: string; beforeTo: string; afterTo: string; allowed: boolean; reason?: string; existingMovementId?: string };
export type ForecastInput = { formatId: string; fieldId: string; dateFieldId: string; frequency: "DAY" | "MONTH"; method: "MEAN" | "LINEAR"; measureKind: "EVENT" | "SNAPSHOT" | "RATE"; from?: string; to?: string; horizon: number; holdout: number };
export type ForecastResult = { method: string; frequency: string; sourceFrom: string; sourceTo: string; trainingCount: number; holdoutCount: number; holdoutMae: string; uncertainty: string; unit?: string; dimension?: string; observations: { date: string; estimate: string; lower: string; upper: string; observed?: string }[]; validation: { date: string; estimate: string; lower: string; upper: string; observed?: string }[]; forecast: { date: string; estimate: string; lower: string; upper: string; observed?: string }[] };
export type EntryLink = { id: string; collectionId: string; fromEntryId: string; toEntryId: string; label: string; createdAt: string; deletedAt?: string | null };
export type EntryRelation = { id: string; collectionId: string; fromEntryId: string; toEntryId: string; kind: 'ASSOCIATION' | 'PARENT' | 'COMPONENT'; label: string; quantity?: string | null; unit?: string | null; snapshotValue?: string | null; snapshotUnit?: string | null; snapshotFieldId?: string | null; createdAt: string };
export type EntryReminder = { id: string; entryId: string; fieldId: string; viewId?: string | null; minutesBefore: number; channels: string[]; timeZone: string; timeOfDay?: string | null; state: string; nextAt?: string | null; occurrenceAt?: string | null; attempts: number; failure?: string | null };
export type SharedObjectGrant = { id: string; sourceCollectionId: string; sourceFormatId: string; sourceFormatVersion: number; objectId: string; sourceName: string; objectName: string; propertyFieldIds: string[]; sensitiveFieldIds?: string[]; mode: "CURRENT" | "SNAPSHOT"; snapshot: { fieldId: string; name: string; kind: FieldKind; value: string; unitSnapshot?: UnitSnapshot | null }[]; createdAt: string; revokedAt?: string | null };
export type CollectionRole = "OWNER" | "EDITOR" | "READER";
export type CollectionMember = { userId: string; email: string; name: string; role: CollectionRole; addedAt: string; sharedFieldIds?: string[]; sensitiveFieldIds?: string[] };
export type AuditLog = { id: string; collectionId: string; userId: string; action: string; details?: string | null; occurredAt: string };
export type Collection = { id: string; name: string; ownerId?: string; templateId?: string | null; bookView?: BookViewSettings | null; taskPlanner?: TaskPlanner | null; minAggregateSize?: number; periodTotals?: { formatId: string; dateFieldId: string; amountFieldId: string } | null; fields: Field[]; formats: CollectionFormat[]; codeLists: ClassificationList[]; units: CollectionUnit[]; exchangeRates: ExchangeRate[]; sharedObjects: SharedObjectGrant[]; savedViews: SavedView[]; formulas: Formula[]; stockRules?: StockRule[]; allowNegativeStock?: boolean; members?: CollectionMember[]; sharedBy?: { userId: string; name: string } | null };
export type PersonSummary = { userId: string; name: string; hasPhoto: boolean };
export type Entry = {
  id: string;
  offlinePending?: boolean;
  formatId?: string | null;
  correctionOf?: string | null;
  ledgerHash?: string | null;
  ledgerSequence?: number | null;
  values: { fieldId: string; value: string; attachmentSize?: number | null; attachmentMimeType?: string | null; largeFileId?: string | null; largeFileSha256?: string | null; unitSnapshot?: UnitSnapshot | null; objectIds?: string[] | null; objectSnapshots?: { objectId: string; capturedAt: string; properties: { fieldId: string; name: string; kind: FieldKind; value: string; unitSnapshot?: UnitSnapshot | null }[] }[] | null; measureValue?: { status?: string; uncertainty?: string; uncertaintyType?: string; quality?: string; instrument?: string; observedAt?: string; recordedAt?: string; revisedAt?: string; revisionNote?: string } | null }[];
  createdAt: string;
  updatedAt: string;
  /** T53: creator and last editor (shown in shared collections). */
  createdBy?: PersonSummary | null;
  updatedBy?: PersonSummary | null;
  sourceObjectId?: string | null;
  taskCompletions?: string[] | null;
  contributionLinkId?: string | null;
  contributionReceivedAt?: string | null;
  recurrence?: { startFieldId: string; endFieldId: string; timeZone: string; frequency: "DAILY" | "WEEKLY" | "MONTHLY"; interval: number; untilDate?: string | null; excludedDates: string[] } | null;
  workflow?: EntryWorkflow | null;
  revisions?: { at: string; formatVersion: number; values: { fieldId: string; value: string; unitSnapshot?: UnitSnapshot | null }[] }[];
};
export type EntryPage = { entries: Entry[]; nextCursor?: string | null; hasMore: boolean };
export type EntryFilter = { fieldId: string; operator: "EQ" | "CONTAINS" | "GT" | "GTE" | "LT" | "LTE"; value: string };

export const fieldKinds: FieldKind[] = ["TITLE", "DATE", "NUMBER", "TIME", "LINK", "CHARACTER", "TEXT", "LONG_TEXT", "BOOLEAN", "SELECT", "MULTI_SELECT", "DATETIME", "DURATION", "ATTACHMENT", "OBJECT_REF", "MEASURE", "CODE", "POSITION", "ZONE"];

const messages = {
  en: {
    appName: "brainy",
    tagline: "A little space for big thoughts.",
    intro: "Keep notes, measurements, and everyday information in collections you shape with your own data formats.",
    account: "Account",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    name: "Your name",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    welcome: "Welcome back",
    start: "Start collecting your ideas",
    welcomeDetail: "Your information is waiting right where you left it.",
    startDetail: "A calm home for everything you want to remember.",
    google: "Continue with Google",
    or: "or",
    newHere: "New to Brainy?",
    alreadyHere: "Already have an account?",
    passwordRule: "Use at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    requiredName: "Enter your name.",
    invalidEmail: "Enter a valid email address.",
    loading: "Loading your space…",
    saving: "Saving…",
    creating: "Creating…",
    collections: "Collections",
    collection: "Collection",
    collectionFormat: "Collection data format",
    entries: "Entries",
    savedEntries: "Saved entries",
    field: "field",
    fields: "fields",
    entry: "entry",
    workspace: "Your workspace",
    collectionSubtitle: "Your information, organized your way.",
    newCollection: "New collection",
    createCollection: "Create collection",
    collectionName: "Collection name",
    collectionNameHint: "Ideas, recipes, contacts…",
    collectionGuide: "Start with one data format. Add more data formats to this collection at any time.",
    formats: "Data formats",
    format: "Data format",
    formatName: "Data format name",
    generalFormat: "General",
    addFormat: "Add data format",
    formatGuide: "Give this data format a name and choose the fields it holds.",
    chooseFormat: "Choose a data format",
    formatLimit: "A collection can have up to 24 data formats.",
    nameFormat: "Name the data format.",
    duplicateFormats: "Data format names must be unique.",
    chooseColor: "Choose a color for this data format.",
    colorUsed: "This color is already used in the collection.",
    formatColor: "Data format color",
    changeColor: "Change color",
    formatColorHelp: "Every entry in this data format will use this soft background.",
    editFormat: "Edit data format",
    formatImpact: "Entries using this data format",
    formatSafeEdit: "You can rename and reorder fields or add new ones. Fields with saved values keep their type, unit and choices.",
    formatConflict: "This data format changed. Refresh and try again.",
    formatProtected: "A field with saved values cannot change type, unit or choices, or be removed.",
    options: "Choices (one per line)",
    choicesRule: "Add 2 to 30 different choices.",
    moveUp: "Move up",
    moveDown: "Move down",
    yes: "Yes",
    no: "No",
    selectChoices: "Select choices",
    invalidDuration: "Enter a duration as hours:minutes, for example 1:30.",
    invalidDateTime: "Choose a date and time.",
    attachment: "Attachment",
    objectReference: "Object reference",
    chooseFile: "Choose a file",
    downloadFile: "Download file",
    removeFile: "Remove file",
    fileTooLarge: "Choose a file smaller than 2 MB. An entry can hold at most {max} of files.",
    invalidChoice: "Choose one of the available options.",
    invalidBoolean: "Choose yes or no.",
    invalidFile: "Choose a valid file.",
    fileMissing: "This file is no longer available.",
    setupProfile: "Tell us about yourself",
    editProfile: "Edit profile",
    profileIntro: "Tell Brainy about your work and interests. Meeting people with similar interests may be offered later.",
    profilePrivate: "Your profile is private. Any future sharing will require your choice.",
    profession: "Profession",
    job: "Current job or role",
    fieldOfStudy: "Field of study",
    interests: "Interests",
    hobbies: "Hobbies",
    optional: "Optional",
    listHint: "Separate items with commas",
    profileInterestRule: "Add at least one interest or hobby.",
    profileLimit: "Keep up to 12 interests or hobbies, with 60 characters per item.",
    profileDuplicate: "Remove repeated interests or hobbies.",
    profilePhoto: "Profile photo",
    choosePhoto: "Choose a photo",
    changePhoto: "Change photo",
    removePhoto: "Remove photo",
    photoHint: "JPEG, PNG or WebP. Photos over 1 MB are compressed automatically.",
    photoPreparing: "Preparing photo…",
    photoCompressed: "Photo compressed to {size} to fit the 1 MB limit.",
    photoUnreadable: "This image can’t be read. Choose a JPEG, PNG or WebP photo.",
    photoTooLarge: "This photo can’t be reduced below 1 MB. Choose a smaller one.",
    suggestHint: "Choose from the list or type your own.",
    tagsHint: "Choose from the list or type your own. A comma adds exactly what you typed.",
    addTyped: "Add “{value}”",
    useTyped: "Use “{value}”",
    removeItem: "Remove {item}",
    suggestionsLabel: "Suggestions",
    choosePlaceholder: "Search or type…",
    saveProfile: "Save profile",
    continueToWorkspace: "Continue to workspace",
    noCollections: "Make space for your first idea",
    noCollectionsDetail: "Create a collection and choose the fields you want to keep.",
    noEntries: "Nothing written yet",
    noEntriesDetail: "Add an entry using the fields in this collection.",
    writeEntry: "Write an entry",
    newEntry: "New entry",
    editEntry: "Edit entry",
    saveEntry: "Save entry",
    addField: "Add field",
    removeField: "Remove field",
    fieldName: "Field name",
    type: "Type",
    unit: "Unit",
    noUnit: "Plain number",
    customUnit: "Custom unit",
    customUnitHint: "Enter a unit, for example m/s²",
    rename: "Rename",
    renameCollection: "Rename collection",
    delete: "Delete",
    deleteCollection: "Delete collection",
    deleteEntry: "Delete entry",
    deleteCollectionQuestion: "Delete this collection?",
    deleteCollectionDetail: "All entries in it will be deleted permanently.",
    deleteEntryQuestion: "Delete this entry?",
    deleteEntryDetail: "This entry will be deleted permanently.",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    copyEntry: "Copy entry",
    copied: "Entry copied to clipboard",
    copyFailed: "Could not copy this entry. Try again.",
    created: "Created",
    edited: "Edited",
    refresh: "Refresh",
    retry: "Try again",
    formatHelp: "The fields each entry can hold",
    searchEntries: "Search entries",
    allFormats: "All data formats",
    filterField: "Filter by field",
    filterValue: "Filter value",
    noFilter: "No field filter",
    equals: "Equals",
    contains: "Contains",
    greaterThan: "Greater than",
    lessThan: "Less than",
    loadMore: "Load more entries",
    exportData: "Export collection",
    exportJson: "Download Brainy backup (JSON)",
    exportCsv: "Download readable table (CSV)",
    importData: "Import collection",
    importFile: "Choose a Brainy backup",
    importIntoNew: "Create a new collection",
    importIntoCurrent: "Add to this collection",
    importPreview: "Import preview",
    importMapping: "Field mapping",
    importConfirm: "Import entries",
    importReady: "Ready to import",
    importDone: "Import complete",
    importInvalid: "This backup cannot be imported. Check the file and try again.",
    importResume: "Importing again skips entries already copied.",
    manageUnits: "Units and conversions",
    localUnits: "Units in this collection",
    newUnit: "New unit",
    unitName: "Unit name",
    unitSymbol: "Symbol",
    unitDimension: "Dimension",
    baseUnit: "Base unit",
    unitFactor: "Units per base unit",
    unitFactorHelp: "Example: one carton contains 12 bottles. Set base to bottle and factor to 12.",
    saveUnit: "Save unit",
    convert: "Convert",
    amount: "Amount",
    fromUnit: "From",
    toUnit: "To",
    asOf: "As of",
    exchangeRate: "Exchange rate",
    rateHelp: "Currency rates have a date and never change older entries.",
    rateValue: "Rate",
    saveRate: "Save rate",
    objectModel: "Object data format",
    noObjectModel: "Any item",
    noMatches: "No entries match these filters.",
    invalidCollection: "Name the collection and every field.",
    duplicateFields: "Field names must be unique.",
    fieldLimit: "Choose between 1 and 30 fields.",
    unitLimit: "A unit can be at most 24 characters.",
    emptyEntry: "Write something before saving.",
    invalidNumber: "Enter a valid number.",
    invalidDate: "Enter a valid date.",
    invalidTime: "Enter a valid time.",
    invalidLink: "Enter a full web link beginning with https:// or http://.",
    oneCharacter: "Enter one character.",
    tooLong: "This value is too long.",
    unavailable: "Could not reach Brainy. Check your connection and try again.",
    serverError: "Brainy is temporarily unavailable. Please try again.",
    sessionExpired: "Your session has expired. Please sign in again.",
    unexpected: "Something went wrong. Please try again.",
    title: "Title",
    date: "Date",
    number: "Number",
    measure: "Measure",
    code: "Code from a list",
    position: "Position",
    zone: "Zone",
    time: "Time",
    link: "Link",
    character: "Character",
    text: "Text",
    longText: "Long text",
    boolean: "Checkbox (yes/no)",
    select: "Single choice",
    multiSelect: "Multiple choices",
    dateTime: "Date and time",
    duration: "Duration",
    distance: "Distance",
    mass: "Mass",
    volume: "Volume",
    temperature: "Temperature",
    money: "Money",
    other: "Other",
    langName: "English",
    language: "Language",
    showPassword: "Show password",
    hidePassword: "Hide password",
    show: "Show",
    hide: "Hide",
    close: "Close",
    customUnitRequired: "Enter a custom unit.",
    nameRule: "Use 2 to 80 characters for your name.",
    passwordLength: "Use 8 to 128 characters for your password.",
    googleUnavailable: "Google sign-in is unavailable right now. Try email sign-in.",
    menu: "Menu",
  },
  fr: {
    appName: "brainy",
    tagline: "Un petit espace pour de grandes idées.",
    intro: "Conservez notes, mesures et informations du quotidien dans des collections que vous organisez avec vos propres formats de données.",
    account: "Compte",
    signIn: "Se connecter",
    signUp: "Créer un compte",
    signOut: "Se déconnecter",
    name: "Votre nom",
    email: "Adresse e-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    welcome: "Heureux de vous revoir",
    start: "Commencez à réunir vos idées",
    welcomeDetail: "Vos informations vous attendent là où vous les avez laissées.",
    startDetail: "Un espace calme pour tout ce que vous souhaitez garder.",
    google: "Continuer avec Google",
    or: "ou",
    newHere: "Nouveau sur Brainy ?",
    alreadyHere: "Vous avez déjà un compte ?",
    passwordRule: "Utilisez au moins 8 caractères.",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    requiredName: "Saisissez votre nom.",
    invalidEmail: "Saisissez une adresse e-mail valide.",
    loading: "Chargement de votre espace…",
    saving: "Enregistrement…",
    creating: "Création…",
    collections: "Collections",
    collection: "Collection",
    collectionFormat: "Format de données de la collection",
    entries: "Entrées",
    savedEntries: "Entrées enregistrées",
    field: "champ",
    fields: "champs",
    entry: "entrée",
    workspace: "Votre espace",
    collectionSubtitle: "Vos informations, organisées à votre façon.",
    newCollection: "Nouvelle collection",
    createCollection: "Créer la collection",
    collectionName: "Nom de la collection",
    collectionNameHint: "Idées, recettes, contacts…",
    collectionGuide: "Commencez avec un format de données. Vous pourrez en ajouter d’autres à cette collection.",
    formats: "Formats de données",
    format: "Format de données",
    formatName: "Nom du format de données",
    generalFormat: "Général",
    addFormat: "Ajouter un format de données",
    formatGuide: "Donnez un nom à ce format de données et choisissez les champs qu’il contient.",
    chooseFormat: "Choisissez un format de données",
    formatLimit: "Une collection peut contenir jusqu’à 24 formats de données.",
    nameFormat: "Nommez le format de données.",
    duplicateFormats: "Les noms des formats de données doivent être différents.",
    chooseColor: "Choisissez une couleur pour ce format de données.",
    colorUsed: "Cette couleur est déjà utilisée dans la collection.",
    formatColor: "Couleur du format de données",
    changeColor: "Changer la couleur",
    formatColorHelp: "Chaque entrée de ce format de données aura ce fond très clair.",
    editFormat: "Modifier le format de données",
    formatImpact: "Entrées utilisant ce format de données",
    formatSafeEdit: "Vous pouvez renommer, réorganiser ou ajouter des champs. Les champs déjà renseignés gardent leur type, unité et choix.",
    formatConflict: "Ce format de données a changé. Actualisez et réessayez.",
    formatProtected: "Un champ déjà renseigné ne peut être supprimé ni changer de type, d’unité ou de choix.",
    options: "Choix (un par ligne)",
    choicesRule: "Ajoutez de 2 à 30 choix différents.",
    moveUp: "Monter",
    moveDown: "Descendre",
    yes: "Oui",
    no: "Non",
    selectChoices: "Choisissez des options",
    invalidDuration: "Saisissez une durée en heures:minutes, par exemple 1:30.",
    invalidDateTime: "Choisissez une date et une heure.",
    attachment: "Pièce jointe",
    objectReference: "Référence d’objet",
    chooseFile: "Choisir un fichier",
    downloadFile: "Télécharger le fichier",
    removeFile: "Retirer le fichier",
    fileTooLarge: "Choisissez un fichier de moins de 2 Mo. Une entrée peut contenir au plus {max} de fichiers.",
    invalidChoice: "Choisissez parmi les options disponibles.",
    invalidBoolean: "Choisissez oui ou non.",
    invalidFile: "Choisissez un fichier valide.",
    fileMissing: "Ce fichier n’est plus disponible.",
    setupProfile: "Parlez-nous de vous",
    editProfile: "Modifier le profil",
    profileIntro: "Décrivez votre activité et vos centres d’intérêt. Une mise en relation pourrait être proposée plus tard.",
    profilePrivate: "Votre profil est privé. Tout partage futur demandera votre choix.",
    profession: "Profession",
    job: "Emploi ou poste actuel",
    fieldOfStudy: "Domaine d’études",
    interests: "Centres d’intérêt",
    hobbies: "Loisirs",
    optional: "Facultatif",
    listHint: "Séparez les éléments par des virgules",
    profileInterestRule: "Ajoutez au moins un centre d’intérêt ou un loisir.",
    profileLimit: "Gardez au plus 12 centres d’intérêt ou loisirs, avec 60 caractères par élément.",
    profileDuplicate: "Supprimez les centres d’intérêt ou loisirs répétés.",
    profilePhoto: "Photo de profil",
    choosePhoto: "Choisir une photo",
    changePhoto: "Changer la photo",
    removePhoto: "Retirer la photo",
    photoHint: "JPEG, PNG ou WebP. Les photos de plus de 1 Mo sont compressées automatiquement.",
    photoPreparing: "Préparation de la photo…",
    photoCompressed: "Photo compressée à {size} pour respecter la limite de 1 Mo.",
    photoUnreadable: "Cette image est illisible. Choisissez une photo JPEG, PNG ou WebP.",
    photoTooLarge: "Cette photo ne peut pas descendre sous 1 Mo. Choisissez-en une plus petite.",
    suggestHint: "Choisissez dans la liste ou saisissez votre propre réponse.",
    tagsHint: "Choisissez dans la liste ou saisissez votre propre réponse. Une virgule ajoute exactement votre saisie.",
    addTyped: "Ajouter « {value} »",
    useTyped: "Utiliser « {value} »",
    removeItem: "Retirer {item}",
    suggestionsLabel: "Suggestions",
    choosePlaceholder: "Rechercher ou saisir…",
    saveProfile: "Enregistrer le profil",
    continueToWorkspace: "Continuer vers l’espace",
    noCollections: "Faites place à votre première idée",
    noCollectionsDetail: "Créez une collection et choisissez les champs à conserver.",
    noEntries: "Aucune entrée pour le moment",
    noEntriesDetail: "Ajoutez une entrée avec les champs de cette collection.",
    writeEntry: "Écrire une entrée",
    newEntry: "Nouvelle entrée",
    editEntry: "Modifier l’entrée",
    saveEntry: "Enregistrer l’entrée",
    addField: "Ajouter un champ",
    removeField: "Supprimer le champ",
    fieldName: "Nom du champ",
    type: "Type",
    unit: "Unité",
    noUnit: "Nombre simple",
    customUnit: "Unité personnalisée",
    customUnitHint: "Saisissez une unité, par exemple m/s²",
    rename: "Renommer",
    renameCollection: "Renommer la collection",
    delete: "Supprimer",
    deleteCollection: "Supprimer la collection",
    deleteEntry: "Supprimer l’entrée",
    deleteCollectionQuestion: "Supprimer cette collection ?",
    deleteCollectionDetail: "Toutes ses entrées seront supprimées définitivement.",
    deleteEntryQuestion: "Supprimer cette entrée ?",
    deleteEntryDetail: "Cette entrée sera supprimée définitivement.",
    cancel: "Annuler",
    save: "Enregistrer",
    edit: "Modifier",
    copyEntry: "Copier l’entrée",
    copied: "Entrée copiée dans le presse-papiers",
    copyFailed: "Impossible de copier cette entrée. Réessayez.",
    created: "Créée le",
    edited: "Modifiée le",
    refresh: "Actualiser",
    retry: "Réessayer",
    formatHelp: "Les champs de chaque entrée",
    searchEntries: "Rechercher des entrées",
    allFormats: "Tous les formats de données",
    filterField: "Filtrer par champ",
    filterValue: "Valeur du filtre",
    noFilter: "Aucun filtre de champ",
    equals: "Égal à",
    contains: "Contient",
    greaterThan: "Supérieur à",
    lessThan: "Inférieur à",
    loadMore: "Afficher plus d’entrées",
    exportData: "Exporter la collection",
    exportJson: "Télécharger la sauvegarde Brainy (JSON)",
    exportCsv: "Télécharger le tableau lisible (CSV)",
    importData: "Importer une collection",
    importFile: "Choisir une sauvegarde Brainy",
    importIntoNew: "Créer une nouvelle collection",
    importIntoCurrent: "Ajouter à cette collection",
    importPreview: "Aperçu de l’import",
    importMapping: "Correspondance des champs",
    importConfirm: "Importer les entrées",
    importReady: "Prêt à importer",
    importDone: "Import terminé",
    importInvalid: "Cette sauvegarde ne peut pas être importée. Vérifiez le fichier.",
    importResume: "Un nouvel import ignore les entrées déjà copiées.",
    manageUnits: "Unités et conversions",
    localUnits: "Unités de cette collection",
    newUnit: "Nouvelle unité",
    unitName: "Nom de l’unité",
    unitSymbol: "Symbole",
    unitDimension: "Grandeur",
    baseUnit: "Unité de base",
    unitFactor: "Unités par unité de base",
    unitFactorHelp: "Exemple : un carton contient 12 bouteilles. Choisissez bouteille comme base et le facteur 12.",
    saveUnit: "Enregistrer l’unité",
    convert: "Convertir",
    amount: "Quantité",
    fromUnit: "De",
    toUnit: "Vers",
    asOf: "À la date du",
    exchangeRate: "Taux de change",
    rateHelp: "Les taux de change ont une date et ne modifient pas les anciennes entrées.",
    rateValue: "Taux",
    saveRate: "Enregistrer le taux",
    objectModel: "Format de données d’objet",
    noObjectModel: "Tout article",
    noMatches: "Aucune entrée ne correspond à ces filtres.",
    invalidCollection: "Nommez la collection et chaque champ.",
    duplicateFields: "Les noms des champs doivent être différents.",
    fieldLimit: "Choisissez entre 1 et 30 champs.",
    unitLimit: "Une unité ne peut pas dépasser 24 caractères.",
    emptyEntry: "Écrivez quelque chose avant d’enregistrer.",
    invalidNumber: "Saisissez un nombre valide.",
    invalidDate: "Saisissez une date valide.",
    invalidTime: "Saisissez une heure valide.",
    invalidLink: "Saisissez un lien web complet commençant par https:// ou http://.",
    oneCharacter: "Saisissez un seul caractère.",
    tooLong: "Cette valeur est trop longue.",
    unavailable: "Connexion à Brainy impossible. Vérifiez votre connexion et réessayez.",
    serverError: "Brainy est temporairement indisponible. Réessayez.",
    sessionExpired: "Votre session a expiré. Reconnectez-vous.",
    unexpected: "Une erreur est survenue. Réessayez.",
    title: "Titre",
    date: "Date",
    number: "Nombre",
    measure: "Mesure",
    code: "Code d’une liste",
    position: "Position",
    zone: "Zone",
    time: "Heure",
    link: "Lien",
    character: "Caractère",
    text: "Texte",
    longText: "Texte long",
    boolean: "Case à cocher (oui/non)",
    select: "Choix unique",
    multiSelect: "Choix multiples",
    dateTime: "Date et heure",
    duration: "Durée",
    distance: "Distance",
    mass: "Masse",
    volume: "Volume",
    temperature: "Température",
    money: "Monnaie",
    other: "Autres",
    langName: "Français",
    language: "Langue",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    show: "Afficher",
    hide: "Masquer",
    close: "Fermer",
    customUnitRequired: "Saisissez une unité personnalisée.",
    nameRule: "Utilisez 2 à 80 caractères pour votre nom.",
    passwordLength: "Utilisez 8 à 128 caractères pour votre mot de passe.",
    googleUnavailable: "La connexion avec Google est indisponible. Essayez avec votre adresse e-mail.",
    menu: "Menu",
  },
} satisfies Record<Language, Record<string, string>>;

export type MessageKey = keyof typeof messages.en;
export const t = (language: Language, key: MessageKey): string => messages[language][key];

export function formatDisplayName(format: CollectionFormat, language: Language): string {
  return format.id.startsWith("legacy-") && format.name === "General"
    ? t(language, "generalFormat")
    : format.name;
}

const kindLabels: Record<FieldKind, MessageKey> = {
  TITLE: "title", DATE: "date", NUMBER: "number", TIME: "time", LINK: "link", CHARACTER: "character", TEXT: "text", LONG_TEXT: "longText", BOOLEAN: "boolean", SELECT: "select", MULTI_SELECT: "multiSelect", DATETIME: "dateTime", DURATION: "duration", ATTACHMENT: "attachment", OBJECT_REF: "objectReference", MEASURE: "measure", CODE: "code", POSITION: "position", ZONE: "zone",
};
export const fieldKindLabel = (language: Language, kind: FieldKind): string => t(language, kindLabels[kind]);

type UnitCategory = "distance" | "mass" | "volume" | "temperature" | "money" | "other";
export type NumberUnit = { code: string; en: string; fr: string; symbol: string; category: UnitCategory };
export const numberUnits: NumberUnit[] = [
  { code: "km", en: "Kilometres", fr: "Kilomètres", symbol: "km", category: "distance" },
  { code: "m", en: "Metres", fr: "Mètres", symbol: "m", category: "distance" },
  { code: "cm", en: "Centimetres", fr: "Centimètres", symbol: "cm", category: "distance" },
  { code: "mm", en: "Millimetres", fr: "Millimètres", symbol: "mm", category: "distance" },
  { code: "mi", en: "Miles", fr: "Miles", symbol: "mi", category: "distance" },
  { code: "ft", en: "Feet", fr: "Pieds", symbol: "ft", category: "distance" },
  { code: "in", en: "Inches", fr: "Pouces", symbol: "in", category: "distance" },
  { code: "kg", en: "Kilograms", fr: "Kilogrammes", symbol: "kg", category: "mass" },
  { code: "g", en: "Grams", fr: "Grammes", symbol: "g", category: "mass" },
  { code: "lb", en: "Pounds", fr: "Livres", symbol: "lb", category: "mass" },
  { code: "L", en: "Litres", fr: "Litres", symbol: "L", category: "volume" },
  { code: "mL", en: "Millilitres", fr: "Millilitres", symbol: "mL", category: "volume" },
  { code: "°C", en: "Celsius", fr: "Celsius", symbol: "°C", category: "temperature" },
  { code: "°F", en: "Fahrenheit", fr: "Fahrenheit", symbol: "°F", category: "temperature" },
  { code: "EUR", en: "Euro", fr: "Euro", symbol: "€", category: "money" },
  { code: "USD", en: "US dollar", fr: "Dollar américain", symbol: "$", category: "money" },
  { code: "GBP", en: "British pound", fr: "Livre sterling", symbol: "£", category: "money" },
  { code: "NGN", en: "Nigerian naira", fr: "Naira nigérian", symbol: "₦", category: "money" },
  { code: "FCFA", en: "CFA franc", fr: "Franc CFA", symbol: "FCFA", category: "money" },
  { code: "%", en: "Percent", fr: "Pourcentage", symbol: "%", category: "other" },
  { code: "h", en: "Hours", fr: "Heures", symbol: "h", category: "other" },
  { code: "min", en: "Minutes", fr: "Minutes", symbol: "min", category: "other" },
  { code: "s", en: "Seconds", fr: "Secondes", symbol: "s", category: "other" },
];
export const unitCategories: UnitCategory[] = ["distance", "mass", "volume", "temperature", "money", "other"];
export const unitLabel = (unit: NumberUnit, language: Language): string => `${unit[language]} (${unit.symbol})`;
export const unitSymbol = (code?: string | null): string => numberUnits.find((item) => item.code === code)?.symbol ?? code ?? "";

export function formatNumber(value: string, unit: string | null | undefined, language: Language): string {
  const number = language === "fr" ? value.replaceAll(".", ",") : value;
  if (!unit) return number;
  const symbol = unitSymbol(unit);
  // French writes the currency after the amount (19,99 €); English before it (€19.99 style kept as "€ 19.99").
  if (["EUR", "USD", "GBP", "NGN"].includes(unit)) return language === "fr" ? `${number} ${symbol}` : `${symbol} ${number}`;
  return `${number} ${symbol}`;
}

export function formatFieldValue(field: Field, value: string, language: Language, snapshot?: UnitSnapshot | null, collection?: Collection): string {
  if (field.kind === "CODE") {
    const code = collection?.codeLists?.find((list) => list.id === field.codeListId)?.codes.find((item) => item.code === value);
    return code ? `${language === "fr" ? code.labelFr : code.labelEn} (${value})${code.active ? "" : language === "fr" ? " · obsolète" : " · obsolete"}` : value;
  }
  if (field.kind === "POSITION") { try { const point = JSON.parse(value) as { latitude: number; longitude: number; accuracy?: number }; return `${point.latitude}, ${point.longitude}${point.accuracy === undefined ? "" : ` ±${point.accuracy} m`}`; } catch { return value; } }
  if (field.kind === "ZONE") { try { const zone = JSON.parse(value) as { type?: string }; return zone.type === "Circle" ? language === "fr" ? "Cercle" : "Circle" : language === "fr" ? "Polygone" : "Polygon"; } catch { return value; } }
  if (field.kind === "NUMBER" || field.kind === "MEASURE") {
    if (snapshot) {
      const number = language === "fr" ? value.replaceAll(".", ",") : value;
      if (snapshot.dimension === "CURRENCY") return language === "fr" ? `${number} ${snapshot.symbol}` : `${snapshot.symbol} ${number}`;
      return `${number} ${snapshot.symbol}`;
    }
    return formatNumber(value, field.unit, language);
  }
  if (field.kind === "BOOLEAN") return t(language, value === "true" ? "yes" : "no");
  if (field.kind === "MULTI_SELECT") { try { return (JSON.parse(value) as string[]).join(", "); } catch { return value; } }
  if (field.kind === "OBJECT_REF") { try { const ids = JSON.parse(value) as string[]; return `${ids.length} ${language === "fr" ? "objet(s)" : "object(s)"}`; } catch { return value; } }
  if (field.kind === "DATETIME") return dateTimeDisplay(value, language);
  if (field.kind === "DATE") {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
  }
  return value;
}

function dateTimeDisplay(value: string, language: Language): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function valuesByField(entry: Entry): Record<string, string> {
  return Object.fromEntries(entry.values.map(({ fieldId, value }) => [fieldId, value]));
}

export function formatForEntry(collection: Collection, entry: Entry): CollectionFormat {
  return collection.formats.find((format) => format.id === entry.formatId) ?? collection.formats[0];
}

export function entryClipboardText(collection: Collection, entry: Entry, language: Language): string {
  const values = valuesByField(entry);
  const fields = formatForEntry(collection, entry).fields;
  const titleField = fields.find((field) => field.kind === "TITLE");
  const lines: string[] = [];
  if (titleField && values[titleField.id]?.trim()) lines.push(values[titleField.id].trim());
  for (const field of fields) {
    if (field.id === titleField?.id || !values[field.id]?.trim()) continue;
    if (field.kind === "OBJECT_REF") {
      const stored = entry.values.find((item) => item.fieldId === field.id);
      const names = stored?.objectSnapshots?.map((item) => item.properties.find((property) => property.kind === "TITLE")?.value ?? item.objectId) ?? stored?.objectIds ?? [];
      lines.push(`${field.name}: ${names.join(", ")}`);
      continue;
    }
    lines.push(`${field.name}: ${formatFieldValue(field, values[field.id].trim(), language, entry.values.find((item) => item.fieldId === field.id)?.unitSnapshot, collection)}`);
  }
  return lines.join("\n");
}

export function translateError(error: unknown, language: Language): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Could not reach Brainy")) return t(language, "unavailable");
  if (message.includes("temporarily unavailable")) return t(language, "serverError");
  if (message.includes("Invalid or expired session") || message.includes("Sign in to continue") || message.includes("Invalid session")) return t(language, "sessionExpired");
  if (message.includes("Name must be between")) return t(language, "nameRule");
  if (message.includes("Data format name must be") || message.includes("Format name must be")) return t(language, "nameFormat");
  if (message.includes("Data format names must be unique") || message.includes("Format names must be unique")) return t(language, "duplicateFormats");
  if (message.includes("Choose a light data format color") || message.includes("Choose a light format color")) return t(language, "chooseColor");
  if (message.includes("Each data format needs a different color") || message.includes("Each format needs a different color")) return t(language, "colorUsed");
  if (message.includes("Data format changed")) return t(language, "formatConflict");
  if (message.includes("can only have one entry")) return language === "fr" ? "Ce format de données n’accepte qu’une seule entrée. Modifiez celle qui existe." : "This data format accepts a single entry. Edit the existing one.";
  if (message.includes("can only be placed under")) return language === "fr" ? `Cette partie se place seulement sous : ${message.split(": ").pop()}.` : message;
  if (message.includes("already has several entries")) return language === "fr" ? "Ce format de données a déjà plusieurs entrées. N’en gardez qu’une avant d’activer cette règle." : message;
  if (message.includes("has saved values")) return t(language, "formatProtected");
  if (message.includes("Choice fields need")) return t(language, "choicesRule");
  if (message.includes("needs a duration")) return t(language, "invalidDuration");
  if (message.includes("file is too large") || message.includes("Attachments in one entry") || message.includes("Request too large")) return fileTooLargeText(language);
  if (message.includes("paused on this hosting plan")) return language === "fr" ? "Cette fonction est en pause sur cet hébergement." : "This feature is paused on this hosting.";
  if (message.includes("needs one of its choices") || message.includes("needs valid choices")) return t(language, "invalidChoice");
  if (message.includes("must be yes or no")) return t(language, "invalidBoolean");
  if (message.includes("needs a valid file") || message.includes("needs a file")) return t(language, "invalidFile");
  if (message.includes("Attachment not found")) return t(language, "fileMissing");
  if (message.includes("needs a date, time") || message.includes("needs a valid date and time")) return t(language, "invalidDateTime");
  if (message.includes("Add at least one interest or hobby")) return t(language, "profileInterestRule");
  if (message.includes("Profile photo must be at most")) return t(language, "photoTooLarge");
  if (message.includes("Profile photo must be a")) return t(language, "photoUnreadable");
  if (language === "fr") {
    const contributionErrors: [string, string][] = [
      ["Contribution link unavailable", "Ce lien de contribution est indisponible ou expiré."],
      ["Too many submissions or link unavailable", "Trop de réponses ont été envoyées. Réessayez dans une minute ou demandez un nouveau lien."],
      ["Consent is required", "Votre consentement est nécessaire pour envoyer la réponse."],
      ["Submission rejected", "Cette réponse a été refusée."],
      ["Submission is too large or empty", "La réponse est vide ou trop volumineuse."],
      ["Valid contact email required", "Saisissez une adresse e-mail de contact valide."],
      ["Invalid public field", "Un champ de cette réponse n’est plus disponible. Rechargez le formulaire."],
      ["Choose valid public fields", "Choisissez des champs publics valides."],
      ["Expiry must be within 90 days", "Choisissez une expiration dans les 90 prochains jours."],
      ["Submission already reviewed", "Cette réponse a déjà été examinée. Actualisez la liste."],
      ["Duplicate target not found", "La réponse indiquée comme doublon est introuvable."],
      ["Receipt not found", "Ce reçu privé est introuvable."],
      ["Submission is being accepted", "Cette réponse est en cours d’acceptation. Réessayez dans un instant."],
      ["Only the collection owner can manage contributions", "Seul le propriétaire de la collection peut gérer les contributions."],
    ];
    for (const [source, translated] of contributionErrors) if (message.includes(source)) return translated;
    const workflowErrors: [string, string][] = [
      ["This transition is not allowed", "Cette transition n’est pas autorisée."],
      ["Change the state with a workflow transition", "Changez l’état avec une transition du flux."],
      ["This entry changed elsewhere", "Cette entrée a été modifiée ailleurs. Actualisez et réessayez."],
      ["Start this entry in the initial state", "Commencez cette entrée dans l’état initial."],
      ["Fill in a valid state on every existing entry", "Renseignez un état valide sur chaque entrée existante avant d’activer le flux."],
      ["Keep the workflow state field", "Conservez le champ d’état et ses choix pendant que le flux est actif."],
      ["Only a collection owner can perform this action", "Seul le propriétaire de la collection peut effectuer cette action."],
      ["Read-only members cannot modify collection data", "Les membres en lecture seule ne peuvent pas modifier la collection."],
      ["Share only with your collaborators", "Partagez seulement avec vos collaborateurs : envoyez-leur d’abord votre lien de collaboration."],
      ["This collaboration link is no longer valid", "Ce lien de collaboration n’est plus valable. Demandez-en un nouveau à la personne qui vous l’a envoyé."],
      ["You cannot collaborate with yourself", "C’est votre propre lien : envoyez-le à un collègue pour qu’il l’accepte."],
      ["Collaborator not found", "Ce collaborateur n’existe plus."],
      ["Choose read only or read and write", "Choisissez « Lecture seule » ou « Lecture et écriture »."],
      ["Assign to the owner or an editor", "Assignez l’entrée au propriétaire ou à un éditeur ayant accès à ce format de données."],
      ["Choose a valid due date and time", "Choisissez une échéance valide."],
      ["Choose a reminder advance", "Choisissez un délai de rappel entre 0 et 43 200 minutes."],
      ["This entry has no workflow", "Cette entrée n’a pas de flux d’états."],
    ];
    for (const [source, translated] of workflowErrors) if (message.includes(source)) return translated;
    const required = message.match(/Fill in (.+) before entering (.+)/);
    if (required) return `Renseignez ${required[1]} avant de passer à ${required[2]}.`;
    if (message.includes("An object data format needs a title field")) return "Un format de données d’objet a besoin d’un champ titre.";
    if (message.includes("Give this object a name")) return "Donnez un nom à cet objet.";
    if (message.includes("Object model not found")) return "Ce modèle d’objet est introuvable.";
    if (message.includes("Object not found")) return "Cet objet est introuvable.";
    if (message.includes("Existing entries need titles before becoming objects")) return "Nommez les entrées existantes avant de les utiliser comme objets.";
    if (message.includes("Review existing entries before converting them to objects")) return "Examinez les entrées existantes avant de les convertir en objets.";
    if (message.includes("Choose a text field in a regular data format in this collection")) return "Choisissez un champ texte dans un format de données ordinaire de cette collection.";
    if (message.includes("This object is used in entries")) return "Cet objet est utilisé dans des entrées. Retirez ces liens avant de le supprimer.";
  }
  if (message.includes("can have at most 12 items") || message.includes("items must be at most 60 characters")) return t(language, "profileLimit");
  if (message.includes("items must be unique")) return t(language, "profileDuplicate");
  if (message.includes("formats")) return t(language, "formatLimit");
  if (message.includes("Password must be between")) return t(language, "passwordLength");
  if (message.includes("Enter a valid email address")) return t(language, "invalidEmail");
  if (message.includes("Google sign-in is not configured") || message.includes("auth/unauthorized-domain")) return t(language, "googleUnavailable");
  if (language === "en") return message;
  if (message.includes("Incorrect email or password")) return "Adresse e-mail ou mot de passe incorrect";
  if (message.includes("already exists")) return "Un compte utilise déjà cette adresse e-mail";
  if (message.includes("linked to another Google account")) return "Cette adresse e-mail est liée à un autre compte Google";
  if (message.includes("already linked to another account")) return "Cette adresse e-mail est déjà liée à un autre compte";
  if (message.includes("Invalid or expired Google session") || message.includes("Invalid Google session")) return "La session Google a expiré. Réessayez.";
  if (message.includes("auth/")) return t(language, "googleUnavailable");
  if (message.includes("Collection name must be")) return t(language, "invalidCollection");
  if (message.includes("Choose between 1 and 30 fields")) return t(language, "fieldLimit");
  if (message.includes("Field names must be 1 to 80")) return t(language, "invalidCollection");
  if (message.includes("Field names must be unique")) return t(language, "duplicateFields");
  if (message.includes("Unit must be at most")) return t(language, "unitLimit");
  if (message.includes("Write something before saving")) return t(language, "emptyEntry");
  if (message.includes("is too long")) return t(language, "tooLong");
  if (message.includes("must be a number")) return t(language, "invalidNumber");
  if (message.includes("must be a valid date")) return t(language, "invalidDate");
  if (message.includes("must be a valid time")) return t(language, "invalidTime");
  if (message.includes("must be a web link")) return t(language, "invalidLink");
  if (message.includes("must be one character")) return t(language, "oneCharacter");
  if (message.includes("Collection not found") || message.includes("Entry not found")) return "Cet élément n’est plus disponible. Actualisez et réessayez.";
  return t(language, "unexpected");
}

/** File size message with this hosting's limit per entry. */
export const fileTooLargeText = (language: Language): string => t(language, "fileTooLarge").replace("{max}", entryAttachmentLimit(language));
