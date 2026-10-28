import type { Collection, CollectionUnit, Entry, EntryFilter, EntryPage, User, FieldKind, Language, ProfileInput, SharedObjectGrant, SavedView, EntryReminder, AnalysisInput, AnalysisResult, EntryLink, EntryRelation, StockPosition, StockMovement, StockMovementInput, StockPreview, ForecastInput, ForecastResult, CollectionRole, AuditLog } from "./brainy";

type GraphQLError = { message?: string; extensions?: { code?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly unauthenticated = false) {
    super(message);
  }
}

async function request<T>(query: string, variables: Record<string, unknown> = {}, backup = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(backup ? "/api/graphql?backup=1" : "/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach Brainy. Check your connection and try again.");
  }
  let body: { data?: T; errors?: GraphQLError[] };
  try {
    body = await response.json();
  } catch {
    throw new ApiError("Brainy is temporarily unavailable. Please try again.");
  }
  const error = body.errors?.[0];
  if (error) throw new ApiError(error.message ?? "Something went wrong. Please try again.", error.extensions?.code === "UNAUTHENTICATED");
  if (!response.ok || !body.data) throw new ApiError("Brainy is temporarily unavailable. Please try again.");
  return body.data;
}

const collectionFields = "id name fields { id name kind unit options targetObjectFormatId multiple variableName referenceMode sourceFieldId } formats { id name color version objectModel copiedFromFormatId linkedSource { sourceCollectionId sourceFormatId acceptedVersion targetVersion } fields { id name kind unit options targetObjectFormatId multiple variableName referenceMode sourceFieldId } } units { id name symbol dimension baseUnitId factor objectFormatId version copiedFromUnitId } exchangeRates { id from to rate effectiveAt } sharedObjects { id sourceCollectionId sourceFormatId sourceFormatVersion objectId sourceName objectName propertyFieldIds mode snapshot { fieldId name kind value unitSnapshot { id version symbol dimension factor root objectFormatId } } createdAt revokedAt } savedViews { id name layout formatIds columnFieldIds search filterFieldId filterOperator filterValue sort manualOrderFieldIds groupByFormat taskDoneFieldId taskDueFieldId taskCompletedFieldId taskPriorityFieldId calendarStartFieldId calendarEndFieldId calendarTimeZone } formulas { id name formatId expression version dependencies } stockRules { id name formatId kind productFieldId quantityFieldId version } allowNegativeStock members { userId email name role addedAt sharedFieldIds }";
const entryFields = "id formatId sourceObjectId recurrence { startFieldId endFieldId timeZone frequency interval untilDate excludedDates } values { fieldId value objectIds objectSnapshots { objectId capturedAt properties { fieldId name kind value unitSnapshot { id version symbol dimension factor root objectFormatId } } } unitSnapshot { id version symbol dimension factor root objectFormatId } measureValue { status uncertainty uncertaintyType quality instrument observedAt recordedAt revisedAt revisionNote } } createdAt updatedAt";
const userFields = "id name email profession job fieldOfStudy interests hobbies profileCompleted";

export const api = {
  async workspaceBackup(): Promise<string> { return (await request<{ workspaceBackup: string }>(`query { workspaceBackup }`, {}, true)).workspaceBackup; },
  async restoreWorkspaceBackup(archive: string, dryRun: boolean): Promise<{ version: number; collections: number; entries: number; relations: number; stockMovements: number; conflicts: string[]; allowed: boolean; restored: boolean }> {
    return (await request<{ restoreWorkspaceBackup: { version: number; collections: number; entries: number; relations: number; stockMovements: number; conflicts: string[]; allowed: boolean; restored: boolean } }>(`mutation($archive:String!,$dryRun:Boolean!){restoreWorkspaceBackup(archive:$archive,dryRun:$dryRun){version collections entries relations stockMovements conflicts allowed restored}}`, { archive, dryRun }, true)).restoreWorkspaceBackup;
  },
  async relations(collectionId: string, entryId: string): Promise<EntryRelation[]> {
    return (await request<{ collectionRelations: EntryRelation[] }>(`query($collectionId:String!,$entryId:String!){collectionRelations(collectionId:$collectionId,entryId:$entryId){id collectionId fromEntryId toEntryId kind label quantity unit snapshotValue snapshotUnit snapshotFieldId createdAt}}`, { collectionId, entryId })).collectionRelations;
  },
  async createRelation(collectionId: string, fromEntryId: string, toEntryId: string, kind: EntryRelation['kind'], label: string, quantity?: string, unit?: string, snapshotFieldId?: string): Promise<EntryRelation> {
    return (await request<{ createCollectionRelation: EntryRelation }>(`mutation($collectionId:String!,$fromEntryId:String!,$toEntryId:String!,$kind:RelationKind!,$label:String,$quantity:String,$unit:String,$snapshotFieldId:String){createCollectionRelation(collectionId:$collectionId,fromEntryId:$fromEntryId,toEntryId:$toEntryId,kind:$kind,label:$label,quantity:$quantity,unit:$unit,snapshotFieldId:$snapshotFieldId){id collectionId fromEntryId toEntryId kind label quantity unit snapshotValue snapshotUnit createdAt}}`, { collectionId, fromEntryId, toEntryId, kind, label, quantity, unit, snapshotFieldId })).createCollectionRelation;
  },
  async removeRelation(collectionId: string, relationId: string): Promise<void> {
    await request(`mutation($collectionId:String!,$relationId:String!){removeCollectionRelation(collectionId:$collectionId,relationId:$relationId)}`, { collectionId, relationId });
  },
  async relationTotal(collectionId: string, rootId: string, kind: 'PARENT' | 'COMPONENT', fieldName: string): Promise<{ value: string; unit?: string; nodes: number }> {
    return (await request<{ collectionRelationTotal: { value: string; unit?: string; nodes: number } }>(`query($collectionId:String!,$rootId:String!,$kind:RelationKind!,$fieldName:String!){collectionRelationTotal(collectionId:$collectionId,rootId:$rootId,kind:$kind,fieldName:$fieldName){value unit nodes}}`, { collectionId, rootId, kind, fieldName })).collectionRelationTotal;
  },
  async relationImpact(collectionId: string, entryId: string, replacementId?: string): Promise<{ relations: EntryRelation[]; replacementAllowed: boolean }> {
    return (await request<{ collectionRelationImpact: { relations: EntryRelation[]; replacementAllowed: boolean } }>(`query($collectionId:String!,$entryId:String!,$replacementId:String){collectionRelationImpact(collectionId:$collectionId,entryId:$entryId,replacementId:$replacementId){replacementAllowed relations{id fromEntryId toEntryId kind label quantity unit}}}`, { collectionId, entryId, replacementId })).collectionRelationImpact;
  },
  async detachRelations(collectionId: string, entryId: string, replacementId?: string): Promise<void> {
    await request(`mutation($collectionId:String!,$entryId:String!,$replacementId:String){detachCollectionRelations(collectionId:$collectionId,entryId:$entryId,replacementId:$replacementId)}`, { collectionId, entryId, replacementId });
  },
  async importRelations(collectionId: string, importKey: string, rows: { fromSourceId: string; toSourceId: string; kind: EntryRelation['kind']; label: string; quantity?: string; unit?: string; snapshotValue?: string; snapshotUnit?: string; snapshotFieldId?: string }[]): Promise<void> {
    await request(`mutation($collectionId:String!,$importKey:String!,$rows:[ImportedRelationInput!]!){importCollectionRelations(collectionId:$collectionId,importKey:$importKey,rows:$rows)}`, { collectionId, importKey, rows });
  },
  async stockPositions(collectionId: string): Promise<StockPosition[]> { return (await request<{ stockPositions: StockPosition[] }>(`query($collectionId:String!) { stockPositions(collectionId:$collectionId) { productId productName location lot quantity } }`, { collectionId })).stockPositions; },
  async stockMovements(collectionId: string): Promise<StockMovement[]> { return (await request<{ stockMovements: StockMovement[] }>(`query($collectionId:String!) { stockMovements(collectionId:$collectionId) { id kind productId productName baseQuantity fromLocation toLocation lot occurredAt createdAt reason sourceEntryId } }`, { collectionId })).stockMovements; },
  async stockDailyReport(collectionId: string, productId: string, from: string, to: string, timeZone: string): Promise<{ date: string; opening: string; incoming: string; outgoing: string; closing: string; movements: { id: string; kind: string; baseQuantity: string }[] }[]> { return (await request<{ stockDailyReport: { date: string; opening: string; incoming: string; outgoing: string; closing: string; movements: { id: string; kind: string; baseQuantity: string }[] }[] }>(`query($collectionId:String!,$productId:String!,$from:String!,$to:String!,$timeZone:String!) { stockDailyReport(collectionId:$collectionId,productId:$productId,from:$from,to:$to,timeZone:$timeZone) { date opening incoming outgoing closing movements { id kind baseQuantity } } }`, { collectionId, productId, from, to, timeZone })).stockDailyReport; },
  async setStockNegativePolicy(collectionId: string, allowNegative: boolean): Promise<Collection> { return (await request<{ setStockNegativePolicy: Collection }>(`mutation($collectionId:String!,$allowNegative:Boolean!) { setStockNegativePolicy(collectionId:$collectionId,allowNegative:$allowNegative) { ${collectionFields} } }`, { collectionId, allowNegative })).setStockNegativePolicy; },
  async saveStockRule(collectionId: string, input: { name: string; formatId: string; productFieldId: string; quantityFieldId: string; kind: string; dateFieldId?: string; priceFieldId?: string; reasonFieldId?: string; fromLocationFieldId?: string; toLocationFieldId?: string; lotFieldId?: string; packageFactor?: string }): Promise<Collection> { return (await request<{ saveStockRule: Collection }>(`mutation($collectionId:String!,$input:StockRuleInput!) { saveStockRule(collectionId:$collectionId,input:$input) { ${collectionFields} } }`, { collectionId, input })).saveStockRule; },
  async deleteStockRule(collectionId: string, ruleId: string): Promise<Collection> { return (await request<{ deleteStockRule: Collection }>(`mutation($collectionId:String!,$ruleId:String!) { deleteStockRule(collectionId:$collectionId,ruleId:$ruleId) { ${collectionFields} } }`, { collectionId, ruleId })).deleteStockRule; },
  async previewStock(collectionId: string, input: StockMovementInput): Promise<StockPreview> { return (await request<{ previewStockMovement: StockPreview }>(`query($collectionId:String!,$input:StockMovementInput!) { previewStockMovement(collectionId:$collectionId,input:$input) { kind productName baseQuantity beforeFrom afterFrom beforeTo afterTo allowed reason existingMovementId } }`, { collectionId, input })).previewStockMovement; },
  async commitStock(collectionId: string, input: StockMovementInput): Promise<StockMovement> { return (await request<{ commitStockMovement: StockMovement }>(`mutation($collectionId:String!,$input:StockMovementInput!) { commitStockMovement(collectionId:$collectionId,input:$input) { id kind productId productName baseQuantity fromLocation toLocation lot occurredAt createdAt reason sourceEntryId } }`, { collectionId, input })).commitStockMovement; },
  async previewEntryStock(collectionId: string, entryId: string, ruleId: string): Promise<StockPreview> { return (await request<{ previewEntryStockEffect: StockPreview }>(`query($collectionId:String!,$entryId:String!,$ruleId:String!) { previewEntryStockEffect(collectionId:$collectionId,entryId:$entryId,ruleId:$ruleId) { kind productName baseQuantity beforeFrom afterFrom beforeTo afterTo allowed reason existingMovementId } }`, { collectionId, entryId, ruleId })).previewEntryStockEffect; },
  async commitEntryStock(collectionId: string, entryId: string, ruleId: string, expectedUpdatedAt: string): Promise<StockMovement> { return (await request<{ commitEntryStockEffect: StockMovement }>(`mutation($collectionId:String!,$entryId:String!,$ruleId:String!,$expectedUpdatedAt:String!) { commitEntryStockEffect(collectionId:$collectionId,entryId:$entryId,ruleId:$ruleId,expectedUpdatedAt:$expectedUpdatedAt) { id kind productId productName baseQuantity fromLocation toLocation lot occurredAt createdAt reason sourceEntryId } }`, { collectionId, entryId, ruleId, expectedUpdatedAt })).commitEntryStockEffect; },
  async forecast(collectionId: string, input: ForecastInput): Promise<ForecastResult> { return (await request<{ forecastCollection: ForecastResult }>(`query($collectionId:String!,$input:ForecastInput!) { forecastCollection(collectionId:$collectionId,input:$input) { method frequency sourceFrom sourceTo trainingCount holdoutCount holdoutMae uncertainty unit dimension observations { date estimate lower upper observed } validation { date estimate lower upper observed } forecast { date estimate lower upper observed } } }`, { collectionId, input })).forecastCollection; },
  async starterTemplates(language: Language): Promise<{ id: string; name: string; description: string }[]> {
    return (await request<{ starterTemplates: { id: string; name: string; description: string }[] }>(`query($language:String) { starterTemplates(language:$language) { id name description } }`, { language })).starterTemplates;
  },
  async createFromTemplate(templateId: string, name: string, language: Language): Promise<Collection> {
    return (await request<{ createCollectionFromTemplate: Collection }>(`mutation($templateId:String!,$name:String!,$language:String,$timeZone:String) { createCollectionFromTemplate(templateId:$templateId,name:$name,language:$language,timeZone:$timeZone) { ${collectionFields} } }`, { templateId, name, language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })).createCollectionFromTemplate;
  },
  async saveFormula(collectionId: string, input: { name: string; formatId: string; expression: string; expectedVersion?: number }, formulaId?: string): Promise<Collection> {
    return (await request<{ saveCollectionFormula: Collection }>(`mutation($collectionId:String!,$input:FormulaInput!,$formulaId:String) { saveCollectionFormula(collectionId:$collectionId,input:$input,formulaId:$formulaId) { ${collectionFields} } }`, { collectionId, input, formulaId })).saveCollectionFormula;
  },
  async deleteFormula(collectionId: string, formulaId: string): Promise<Collection> {
    return (await request<{ deleteCollectionFormula: Collection }>(`mutation($collectionId:String!,$formulaId:String!) { deleteCollectionFormula(collectionId:$collectionId,formulaId:$formulaId) { ${collectionFields} } }`, { collectionId, formulaId })).deleteCollectionFormula;
  },
  async calculateFormula(collectionId: string, formulaId: string, entryId: string): Promise<{ entryId: string; value?: string; unit?: string; missing?: string }> {
    return (await request<{ calculateCollectionFormula: { entryId: string; value?: string; unit?: string; missing?: string } }>(`query($collectionId:String!,$formulaId:String!,$entryId:String!) { calculateCollectionFormula(collectionId:$collectionId,formulaId:$formulaId,entryId:$entryId) { entryId value unit missing } }`, { collectionId, formulaId, entryId })).calculateCollectionFormula;
  },
  async analyse(collectionId: string, input: AnalysisInput): Promise<AnalysisResult> {
    return (await request<{ analyseCollection: AnalysisResult }>(`query($collectionId:String!,$input:AnalysisInput!) { analyseCollection(collectionId:$collectionId,input:$input) { operation operationVersion groupBy secondaryGroupBy unit dimension skippedMissingCount slope explanation hasEstimated propagatedUncertainty refreshedAt rows { group label rowKey columnKey value count sourcesHasMore sources { entryId value } } comparisonRows { group label rowKey columnKey value count sourcesHasMore sources { entryId value } } } }`, { collectionId, input })).analyseCollection;
  },
  async entryLinks(collectionId: string, entryId: string, includeDeleted = false): Promise<EntryLink[]> {
    return (await request<{ collectionEntryLinks: EntryLink[] }>(`query($collectionId:String!,$entryId:String!,$includeDeleted:Boolean) { collectionEntryLinks(collectionId:$collectionId,entryId:$entryId,includeDeleted:$includeDeleted) { id collectionId fromEntryId toEntryId label createdAt deletedAt } }`, { collectionId, entryId, includeDeleted })).collectionEntryLinks;
  },
  async createEntryLink(collectionId: string, fromEntryId: string, toEntryId: string, label = ''): Promise<EntryLink> {
    return (await request<{ createCollectionEntryLink: EntryLink }>(`mutation($collectionId:String!,$fromEntryId:String!,$toEntryId:String!,$label:String) { createCollectionEntryLink(collectionId:$collectionId,fromEntryId:$fromEntryId,toEntryId:$toEntryId,label:$label) { id collectionId fromEntryId toEntryId label createdAt deletedAt } }`, { collectionId, fromEntryId, toEntryId, label })).createCollectionEntryLink;
  },
  async setEntryLinkActive(collectionId: string, linkId: string, active: boolean): Promise<EntryLink> {
    return (await request<{ setCollectionEntryLinkActive: EntryLink }>(`mutation($collectionId:String!,$linkId:String!,$active:Boolean!) { setCollectionEntryLinkActive(collectionId:$collectionId,linkId:$linkId,active:$active) { id collectionId fromEntryId toEntryId label createdAt deletedAt } }`, { collectionId, linkId, active })).setCollectionEntryLinkActive;
  },
  async linkImportedEntries(collectionId: string, importKey: string, links: { fromSourceId: string; toSourceId: string; label: string }[]): Promise<boolean> {
    return (await request<{ linkImportedEntries: boolean }>(`mutation($collectionId:String!,$importKey:String!,$links:[ImportedEntryLinkInput!]!) { linkImportedEntries(collectionId:$collectionId,importKey:$importKey,links:$links) }`, { collectionId, importKey, links })).linkImportedEntries;
  },
  async duplicateLinks(collectionId: string, formatId: string, fieldId: string, url: string, excludeEntryId?: string): Promise<Entry[]> {
    return (await request<{ collectionDuplicateLinks: Entry[] }>(`query($collectionId:String!,$formatId:String!,$fieldId:String!,$url:String!,$excludeEntryId:String) { collectionDuplicateLinks(collectionId:$collectionId,formatId:$formatId,fieldId:$fieldId,url:$url,excludeEntryId:$excludeEntryId) { ${entryFields} } }`, { collectionId, formatId, fieldId, url, excludeEntryId })).collectionDuplicateLinks;
  },
  async me(): Promise<User> {
    return (await request<{ me: User }>(`query Me { me { ${userFields} } }`)).me;
  },
  async login(email: string, password: string): Promise<User> {
    return (await request<{ login: { user: User } }>(
      `mutation Login($input: LoginInput!) { login(input: $input) { user { ${userFields} } token } }`,
      { input: { email, password } },
    )).login.user;
  },
  async register(name: string, email: string, password: string): Promise<User> {
    return (await request<{ register: { user: User } }>(
      `mutation Register($input: RegisterInput!) { register(input: $input) { user { ${userFields} } token } }`,
      { input: { name, email, password } },
    )).register.user;
  },
  async google(firebaseIdToken: string): Promise<User> {
    return (await request<{ loginWithGoogle: { user: User } }>(
      `mutation Google($firebaseIdToken: String!) { loginWithGoogle(firebaseIdToken: $firebaseIdToken) { user { ${userFields} } token } }`,
      { firebaseIdToken },
    )).loginWithGoogle.user;
  },
  async signOut(): Promise<void> {
    let response: Response;
    try { response = await fetch("/api/session", { method: "DELETE", credentials: "same-origin" }); }
    catch { throw new ApiError("Could not reach Brainy. Check your connection and try again."); }
    if (!response.ok) throw new ApiError("Brainy is temporarily unavailable. Please try again.");
  },
  async updateProfile(input: ProfileInput): Promise<User> {
    return (await request<{ updateProfile: User }>(
      `mutation UpdateProfile($input: ProfileInput!) { updateProfile(input: $input) { ${userFields} } }`,
      { input },
    )).updateProfile;
  },
  async collections(): Promise<Collection[]> {
    return (await request<{ collectionsList: Collection[] }>(`query { collectionsList { ${collectionFields} } }`)).collectionsList;
  },
  async createCollection(name: string, fields: { name: string; kind: FieldKind; unit?: string; options?: string[] }[], formatName: string, color: string, objectModel = false): Promise<Collection> {
    return (await request<{ createCollection: Collection }>(
      `mutation Create($input: CreateCollectionInput!) { createCollection(input: $input) { ${collectionFields} } }`,
      { input: { name, formats: [{ name: formatName, color, fields, objectModel }] } },
    )).createCollection;
  },
  async createCollectionWithFormats(name: string, formats: { name: string; color: string; objectModel?: boolean; fields: { name: string; kind: FieldKind; unit?: string; options?: string[] }[] }[], units: CollectionUnit[] = [], exchangeRates: Collection["exchangeRates"] = []): Promise<Collection> {
    return (await request<{ createCollection: Collection }>(
      `mutation Create($input: CreateCollectionInput!) { createCollection(input: $input) { ${collectionFields} } }`,
      { input: { name, formats, units: units.map(({ id, name, symbol, dimension, baseUnitId, factor, objectFormatId }) => ({ id, name, symbol, dimension, baseUnitId, factor, objectFormatId })), exchangeRates: exchangeRates.map(({ from, to, rate, effectiveAt }) => ({ from, to, rate, effectiveAt })) } },
    )).createCollection;
  },
  async addFormat(collectionId: string, name: string, color: string, fields: { name: string; kind: FieldKind; unit?: string; options?: string[] }[], objectModel = false): Promise<Collection> {
    return (await request<{ addCollectionFormat: Collection }>(
      `mutation AddFormat($id: String!, $input: CollectionFormatInput!) { addCollectionFormat(collectionId: $id, input: $input) { ${collectionFields} } }`,
      { id: collectionId, input: { name, color, fields, objectModel } },
    )).addCollectionFormat;
  },
  async objectTemplates(language: Language): Promise<{ id: string; name: string; description: string; fields: { id: string; name: string; kind: FieldKind; unit?: string }[] }[]> {
    return (await request<{ objectModelTemplates: { id: string; name: string; description: string; fields: { id: string; name: string; kind: FieldKind; unit?: string }[] }[] }>(`query Templates($language: String) { objectModelTemplates(language: $language) { id name description fields { id name kind unit } } }`, { language })).objectModelTemplates;
  },
  async addObjectTemplate(collectionId: string, templateId: string, name: string, color: string, language: Language): Promise<Collection> {
    return (await request<{ addObjectModelFromTemplate: Collection }>(`mutation Template($collectionId: String!, $templateId: String!, $name: String!, $color: String!, $language: String) { addObjectModelFromTemplate(collectionId: $collectionId, templateId: $templateId, name: $name, color: $color, language: $language) { ${collectionFields} } }`, { collectionId, templateId, name, color, language })).addObjectModelFromTemplate;
  },
  async setObjectModel(collectionId: string, formatId: string, enabled: boolean, expectedVersion: number, expectedEntryCount?: number): Promise<Collection> {
    return (await request<{ setCollectionFormatObjectModel: Collection }>(`mutation ObjectModel($collectionId: String!, $formatId: String!, $enabled: Boolean!, $expectedVersion: Int!, $expectedEntryCount: Int) { setCollectionFormatObjectModel(collectionId: $collectionId, formatId: $formatId, enabled: $enabled, expectedVersion: $expectedVersion, expectedEntryCount: $expectedEntryCount) { ${collectionFields} } }`, { collectionId, formatId, enabled, expectedVersion, expectedEntryCount })).setCollectionFormatObjectModel;
  },
  async formatImpact(collectionId: string, formatId: string): Promise<{ entryCount: number; populatedFieldIds: string[] }> {
    return (await request<{ collectionFormatImpact: { entryCount: number; populatedFieldIds: string[] } }>(
      `query Impact($collectionId: String!, $formatId: String!) { collectionFormatImpact(collectionId: $collectionId, formatId: $formatId) { entryCount populatedFieldIds } }`,
      { collectionId, formatId },
    )).collectionFormatImpact;
  },
  async updateFormat(collectionId: string, formatId: string, name: string, expectedVersion: number, fields: { id?: string; name: string; kind: FieldKind; unit?: string; options?: string[] }[]): Promise<Collection> {
    return (await request<{ updateCollectionFormat: Collection }>(
      `mutation UpdateFormat($collectionId: String!, $formatId: String!, $input: UpdateCollectionFormatInput!) { updateCollectionFormat(collectionId: $collectionId, formatId: $formatId, input: $input) { ${collectionFields} } }`,
      { collectionId, formatId, input: { name, fields, expectedVersion } },
    )).updateCollectionFormat;
  },
  async setFormatColor(collectionId: string, formatId: string, color: string): Promise<Collection> {
    return (await request<{ setCollectionFormatColor: Collection }>(
      `mutation SetFormatColor($collectionId: String!, $formatId: String!, $color: String!) { setCollectionFormatColor(collectionId: $collectionId, formatId: $formatId, color: $color) { ${collectionFields} } }`,
      { collectionId, formatId, color },
    )).setCollectionFormatColor;
  },
  async renameCollection(id: string, name: string): Promise<Collection> {
    return (await request<{ renameCollection: Collection }>(
      `mutation Rename($id: String!, $name: String!) { renameCollection(id: $id, name: $name) { ${collectionFields} } }`,
      { id, name },
    )).renameCollection;
  },
  async deleteCollection(id: string): Promise<void> {
    await request(`mutation Delete($id: String!) { deleteCollection(id: $id) }`, { id });
  },
  async entries(collectionId: string): Promise<Entry[]> {
    return (await request<{ collectionEntries: Entry[] }>(
      `query Entries($id: String!) { collectionEntries(collectionId: $id) { ${entryFields} } }`,
      { id: collectionId },
    )).collectionEntries;
  },
  async entry(collectionId: string, entryId: string): Promise<Entry> {
    return (await request<{ collectionEntry: Entry }>(
      `query Entry($collectionId: String!, $entryId: String!) { collectionEntry(collectionId: $collectionId, entryId: $entryId) { ${entryFields} } }`,
      { collectionId, entryId },
    )).collectionEntry;
  },
  async entryAsOfDate(entryId: string, asOfDate: string): Promise<Entry> {
    return (await request<{ collectionEntryAsOfDate: Entry }>(
      `query EntryAsOfDate($entryId: String!, $asOfDate: String!) { collectionEntryAsOfDate(entryId: $entryId, asOfDate: $asOfDate) { ${entryFields} } }`,
      { entryId, asOfDate },
    )).collectionEntryAsOfDate;
  },
  async entriesPage(collectionId: string, options: { after?: string; search?: string; formatId?: string; filters?: EntryFilter[]; viewId?: string } = {}): Promise<EntryPage> {
    return (await request<{ collectionEntriesPage: EntryPage }>(
      `query EntryPage($id: String!, $first: Int!, $after: String, $search: String, $formatId: String, $filters: [EntryFieldFilterInput!], $viewId: String) { collectionEntriesPage(collectionId: $id, first: $first, after: $after, search: $search, formatId: $formatId, filters: $filters, viewId: $viewId) { entries { ${entryFields} } nextCursor hasMore } }`,
      { id: collectionId, first: 30, ...options },
    )).collectionEntriesPage;
  },
  async saveView(collectionId: string, input: Omit<SavedView, "id">, viewId?: string): Promise<Collection> {
    return (await request<{ saveCollectionView: Collection }>(`mutation SaveView($collectionId: String!, $viewId: String, $input: SavedCollectionViewInput!) { saveCollectionView(collectionId: $collectionId, viewId: $viewId, input: $input) { ${collectionFields} } }`, { collectionId, viewId, input })).saveCollectionView;
  },
  async deleteView(collectionId: string, viewId: string): Promise<Collection> {
    return (await request<{ deleteCollectionView: Collection }>(`mutation DeleteView($collectionId: String!, $viewId: String!) { deleteCollectionView(collectionId: $collectionId, viewId: $viewId) { ${collectionFields} } }`, { collectionId, viewId })).deleteCollectionView;
  },
  async setTaskCompleted(collectionId: string, viewId: string, entryId: string, done: boolean): Promise<Entry> {
    return (await request<{ setCollectionTaskCompleted: Entry }>(`mutation TaskDone($collectionId: String!, $viewId: String!, $entryId: String!, $done: Boolean!) { setCollectionTaskCompleted(collectionId: $collectionId, viewId: $viewId, entryId: $entryId, done: $done) { ${entryFields} } }`, { collectionId, viewId, entryId, done })).setCollectionTaskCompleted;
  },
  async setEntryRecurrence(collectionId: string, viewId: string, entryId: string, input?: { timeZone: string; frequency: string; interval: number; untilDate?: string; excludedDates: string[] }): Promise<Entry> {
    return (await request<{ setCollectionEntryRecurrence: Entry }>(`mutation Recurrence($collectionId: String!, $viewId: String!, $entryId: String!, $input: EntryRecurrenceInput) { setCollectionEntryRecurrence(collectionId: $collectionId, viewId: $viewId, entryId: $entryId, input: $input) { ${entryFields} } }`, { collectionId, viewId, entryId, input: input ?? null })).setCollectionEntryRecurrence;
  },
  async calendarOccurrences(collectionId: string, viewId: string, from: string, to: string): Promise<{ entry: Entry; startAt: string; endAt: string; timeZone: string; recurring: boolean; localDate: string }[]> {
    return (await request<{ collectionCalendarOccurrences: { entry: Entry; startAt: string; endAt: string; timeZone: string; recurring: boolean; localDate: string }[] }>(`query Calendar($collectionId: String!, $viewId: String!, $from: String!, $to: String!) { collectionCalendarOccurrences(collectionId: $collectionId, viewId: $viewId, from: $from, to: $to) { entry { ${entryFields} } startAt endAt timeZone recurring localDate } }`, { collectionId, viewId, from, to })).collectionCalendarOccurrences;
  },
  async reminderCapabilities(): Promise<{ email: boolean; push: boolean }> {
    return (await request<{ reminderCapabilities: { email: boolean; push: boolean } }>(`query { reminderCapabilities { email push } }`)).reminderCapabilities;
  },
  async entryReminders(entryId: string): Promise<EntryReminder[]> {
    return (await request<{ entryReminders: EntryReminder[] }>(`query Reminders($entryId: String!) { entryReminders(entryId: $entryId) { id entryId fieldId viewId minutesBefore channels timeZone timeOfDay state nextAt occurrenceAt attempts failure } }`, { entryId })).entryReminders;
  },
  async saveEntryReminder(entryId: string, input: { fieldId: string; minutesBefore: number; channels: string[]; timeZone: string; timeOfDay?: string; viewId?: string }, reminderId?: string): Promise<EntryReminder> {
    return (await request<{ saveEntryReminder: EntryReminder }>(`mutation SaveReminder($entryId: String!, $reminderId: String, $input: EntryReminderInput!) { saveEntryReminder(entryId: $entryId, reminderId: $reminderId, input: $input) { id entryId fieldId viewId minutesBefore channels timeZone timeOfDay state nextAt occurrenceAt attempts failure } }`, { entryId, reminderId, input })).saveEntryReminder;
  },
  async cancelEntryReminder(reminderId: string): Promise<boolean> {
    return (await request<{ cancelEntryReminder: boolean }>(`mutation CancelReminder($reminderId: String!) { cancelEntryReminder(reminderId: $reminderId) }`, { reminderId })).cancelEntryReminder;
  },
  async pushDevices(): Promise<{ id: string; platform: string; label: string; lastSeenAt: string }[]> {
    return (await request<{ pushDevices: { id: string; platform: string; label: string; lastSeenAt: string }[] }>(`query { pushDevices { id platform label lastSeenAt } }`)).pushDevices;
  },
  async registerPushDevice(token: string, platform: string, label: string): Promise<{ id: string }> {
    return (await request<{ registerPushDevice: { id: string } }>(`mutation Device($token: String!, $platform: String!, $label: String!) { registerPushDevice(token: $token, platform: $platform, label: $label) { id } }`, { token, platform, label })).registerPushDevice;
  },
  async unregisterPushDevice(id: string): Promise<boolean> {
    return (await request<{ unregisterPushDevice: boolean }>(`mutation RemoveDevice($id: String!) { unregisterPushDevice(id: $id) }`, { id })).unregisterPushDevice;
  },
  async objectsPage(collectionId: string, formatId: string, options: { after?: string; search?: string } = {}): Promise<EntryPage> {
    return (await request<{ collectionObjectsPage: EntryPage }>(`query Objects($collectionId: String!, $formatId: String!, $first: Int!, $after: String, $search: String) { collectionObjectsPage(collectionId: $collectionId, formatId: $formatId, first: $first, after: $after, search: $search) { entries { ${entryFields} } nextCursor hasMore } }`, { collectionId, formatId, first: 30, ...options })).collectionObjectsPage;
  },
  async objectDetail(id: string): Promise<Entry> {
    return (await request<{ collectionObject: Entry }>(`query Object($id: String!) { collectionObject(id: $id) { ${entryFields} revisions { at formatVersion values { fieldId value unitSnapshot { id version symbol dimension factor root objectFormatId } } } } }`, { id })).collectionObject;
  },
  async entryObjectReferences(entryId: string): Promise<{ objectId: string; fieldId: string; mode: string; missing: boolean; name?: string; capturedAt?: string; properties: { fieldId: string; name: string; kind: FieldKind; value: string; unitSnapshot?: Entry["values"][number]["unitSnapshot"] }[] }[]> {
    return (await request<{ entryObjectReferences: { objectId: string; fieldId: string; mode: string; missing: boolean; name?: string; capturedAt?: string; properties: { fieldId: string; name: string; kind: FieldKind; value: string; unitSnapshot?: Entry["values"][number]["unitSnapshot"] }[] }[] }>(`query References($entryId: String!) { entryObjectReferences(entryId: $entryId) { objectId fieldId mode missing name capturedAt properties { fieldId name kind value unitSnapshot { id version symbol dimension factor root objectFormatId } } } }`, { entryId })).entryObjectReferences;
  },
  async objectCopyPreview(objectId: string, targetCollectionId: string): Promise<{ sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number }> {
    return (await request<{ objectCopyPreview: { sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number } }>(`query CopyPreview($objectId: String!, $targetCollectionId: String!) { objectCopyPreview(objectId: $objectId, targetCollectionId: $targetCollectionId) { sourceName targetName dataFormats units formulas objects entries relations conflicts allowed stockMovementCount } }`, { objectId, targetCollectionId })).objectCopyPreview;
  },
  async copyObject(objectId: string, targetCollectionId: string): Promise<string> {
    return (await request<{ copyCollectionObject: { objectId: string } }>(`mutation CopyObject($objectId: String!, $targetCollectionId: String!) { copyCollectionObject(objectId: $objectId, targetCollectionId: $targetCollectionId) { objectId } }`, { objectId, targetCollectionId })).copyCollectionObject.objectId;
  },
  async objectMovePreview(objectId: string, targetCollectionId: string): Promise<{ sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number; inboundReferences: number; activeShares: number }> {
    return (await request<{ objectMovePreview: { sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number; inboundReferences: number; activeShares: number } }>(`query MovePreview($objectId: String!, $targetCollectionId: String!) { objectMovePreview(objectId: $objectId, targetCollectionId: $targetCollectionId) { sourceName targetName dataFormats units formulas objects entries relations conflicts allowed stockMovementCount inboundReferences activeShares } }`, { objectId, targetCollectionId })).objectMovePreview;
  },
  async moveObject(objectId: string, targetCollectionId: string): Promise<{ objectId: string; operationId: string }> {
    return (await request<{ moveCollectionObject: { objectId: string; operationId: string } }>(`mutation MoveObject($objectId: String!, $targetCollectionId: String!) { moveCollectionObject(objectId: $objectId, targetCollectionId: $targetCollectionId) { objectId operationId } }`, { objectId, targetCollectionId })).moveCollectionObject;
  },
  async shareObject(objectId: string, targetCollectionId: string, propertyFieldIds: string[], mode: "CURRENT" | "SNAPSHOT"): Promise<SharedObjectGrant> {
    return (await request<{ shareCollectionObject: SharedObjectGrant }>(`mutation ShareObject($objectId: String!, $targetCollectionId: String!, $propertyFieldIds: [String!]!, $mode: String!) { shareCollectionObject(objectId: $objectId, targetCollectionId: $targetCollectionId, propertyFieldIds: $propertyFieldIds, mode: $mode) { id sourceCollectionId sourceFormatId sourceFormatVersion objectId sourceName objectName propertyFieldIds mode snapshot { fieldId name kind value } createdAt revokedAt } }`, { objectId, targetCollectionId, propertyFieldIds, mode })).shareCollectionObject;
  },
  async revokeObjectShare(targetCollectionId: string, grantId: string): Promise<void> {
    await request<{ revokeCollectionObjectShare: boolean }>(`mutation RevokeObjectShare($targetCollectionId: String!, $grantId: String!) { revokeCollectionObjectShare(targetCollectionId: $targetCollectionId, grantId: $grantId) }`, { targetCollectionId, grantId });
  },
  async dataFormatCopyPreview(formatId: string, targetCollectionId: string, withEntries: boolean): Promise<{ sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number }> {
    return (await request<{ dataFormatCopyPreview: { sourceName: string; targetName: string; dataFormats: string[]; units: string[]; formulas: string[]; objects: number; entries: number; relations: number; conflicts: string[]; allowed: boolean; stockMovementCount: number } }>(`query FormatCopyPreview($formatId: String!, $targetCollectionId: String!, $withEntries: Boolean!) { dataFormatCopyPreview(formatId: $formatId, targetCollectionId: $targetCollectionId, withEntries: $withEntries) { sourceName targetName dataFormats units formulas objects entries relations conflicts allowed stockMovementCount } }`, { formatId, targetCollectionId, withEntries })).dataFormatCopyPreview;
  },
  async copyDataFormat(formatId: string, targetCollectionId: string, withEntries: boolean): Promise<string> {
    return (await request<{ copyCollectionDataFormat: { dataFormatId: string } }>(`mutation CopyFormat($formatId: String!, $targetCollectionId: String!, $withEntries: Boolean!) { copyCollectionDataFormat(formatId: $formatId, targetCollectionId: $targetCollectionId, withEntries: $withEntries) { dataFormatId } }`, { formatId, targetCollectionId, withEntries })).copyCollectionDataFormat.dataFormatId;
  },
  async linkDataFormat(formatId: string, targetCollectionId: string): Promise<string> {
    return (await request<{ linkCollectionDataFormat: { dataFormatId: string } }>(`mutation LinkFormat($formatId: String!, $targetCollectionId: String!) { linkCollectionDataFormat(formatId: $formatId, targetCollectionId: $targetCollectionId) { dataFormatId } }`, { formatId, targetCollectionId })).linkCollectionDataFormat.dataFormatId;
  },
  async linkedDataFormatUpdatePreview(targetCollectionId: string, targetFormatId: string): Promise<{ targetFormatId: string; sourceVersion: number; acceptedVersion: number; addedFields: string[]; changedFields: string[]; removedFields: string[]; conflicts: string[]; allowed: boolean; stockMovementCount: number }> {
    return (await request<{ linkedDataFormatUpdatePreview: { targetFormatId: string; sourceVersion: number; acceptedVersion: number; addedFields: string[]; changedFields: string[]; removedFields: string[]; conflicts: string[]; allowed: boolean; stockMovementCount: number } }>(`query LinkedUpdate($targetCollectionId: String!, $targetFormatId: String!) { linkedDataFormatUpdatePreview(targetCollectionId: $targetCollectionId, targetFormatId: $targetFormatId) { targetFormatId sourceVersion acceptedVersion addedFields changedFields removedFields conflicts allowed stockMovementCount } }`, { targetCollectionId, targetFormatId })).linkedDataFormatUpdatePreview;
  },
  async acceptLinkedDataFormatVersion(targetCollectionId: string, targetFormatId: string, expectedSourceVersion: number): Promise<Collection> {
    return (await request<{ acceptLinkedDataFormatVersion: Collection }>(`mutation AcceptLinked($targetCollectionId: String!, $targetFormatId: String!, $expectedSourceVersion: Int!) { acceptLinkedDataFormatVersion(targetCollectionId: $targetCollectionId, targetFormatId: $targetFormatId, expectedSourceVersion: $expectedSourceVersion) { ${collectionFields} } }`, { targetCollectionId, targetFormatId, expectedSourceVersion })).acceptLinkedDataFormatVersion;
  },
  async detachLinkedDataFormat(targetCollectionId: string, targetFormatId: string): Promise<Collection> {
    return (await request<{ detachLinkedDataFormat: Collection }>(`mutation DetachLinked($targetCollectionId: String!, $targetFormatId: String!) { detachLinkedDataFormat(targetCollectionId: $targetCollectionId, targetFormatId: $targetFormatId) { ${collectionFields} } }`, { targetCollectionId, targetFormatId })).detachLinkedDataFormat;
  },
  async duplicateObject(id: string): Promise<Entry> {
    return (await request<{ duplicateCollectionObject: Entry }>(`mutation Duplicate($id: String!) { duplicateCollectionObject(id: $id) { ${entryFields} } }`, { id })).duplicateCollectionObject;
  },
  async useObject(objectId: string, targetFormatId: string, targetFieldId: string): Promise<Entry> {
    return (await request<{ useCollectionObject: Entry }>(`mutation Use($objectId: String!, $targetFormatId: String!, $targetFieldId: String!) { useCollectionObject(objectId: $objectId, targetFormatId: $targetFormatId, targetFieldId: $targetFieldId) { ${entryFields} } }`, { objectId, targetFormatId, targetFieldId })).useCollectionObject;
  },
  async saveEntry(collectionId: string, values: { fieldId: string; value: string; attachmentBase64?: string; attachmentMimeType?: string }[], entryId?: string, formatId?: string, sync?: { clientMutationId?: string; expectedUpdatedAt?: string }): Promise<Entry> {
    const key = entryId ? "updateEntry" : "createEntry";
    const query = entryId
      ? `mutation UpdateEntry($id: String!, $input: SaveEntryInput!) { updateEntry(id: $id, input: $input) { ${entryFields} } }`
      : `mutation CreateEntry($id: String!, $input: SaveEntryInput!) { createEntry(collectionId: $id, input: $input) { ${entryFields} } }`;
    const data = await request<Record<string, Entry>>(query, { id: entryId ?? collectionId, input: { values, formatId, ...sync } });
    return data[key];
  },
  async entryAttachment(entryId: string, fieldId: string): Promise<{ fileName: string; mimeType: string; size: number; base64: string }> {
    return (await request<{ entryAttachment: { fileName: string; mimeType: string; size: number; base64: string } }>(
      `query Attachment($entryId: String!, $fieldId: String!) { entryAttachment(entryId: $entryId, fieldId: $fieldId) { fileName mimeType size base64 } }`,
      { entryId, fieldId },
    )).entryAttachment;
  },
  async importEntriesBatch(collectionId: string, input: { formatId: string; importKey: string; dryRun: boolean; rows: { sourceId: string; createdAt: string; updatedAt: string; values: { fieldId: string; value: string; attachmentBase64?: string; attachmentMimeType?: string }[] }[] }): Promise<{ validCount: number; createdCount: number; skippedCount: number; errors: { sourceId: string; message: string }[] }> {
    return (await request<{ importEntriesBatch: { validCount: number; createdCount: number; skippedCount: number; errors: { sourceId: string; message: string }[] } }>(
      `mutation Import($collectionId: String!, $input: ImportEntriesInput!) { importEntriesBatch(collectionId: $collectionId, input: $input) { validCount createdCount skippedCount errors { sourceId message } } }`,
      { collectionId, input },
    )).importEntriesBatch;
  },
  async linkImportedObjects(collectionId: string, importKey: string, links: { sourceId: string; sourceObjectId: string }[]): Promise<void> {
    await request<{ linkImportedObjects: boolean }>(
      `mutation Links($collectionId: String!, $importKey: String!, $links: [ImportObjectLinkInput!]!) { linkImportedObjects(collectionId: $collectionId, importKey: $importKey, links: $links) }`,
      { collectionId, importKey, links },
    );
  },
  async availableUnits(collectionId: string): Promise<CollectionUnit[]> {
    return (await request<{ collectionAvailableUnits: CollectionUnit[] }>(`query Units($id: String!) { collectionAvailableUnits(collectionId: $id) { id name symbol dimension baseUnitId factor objectFormatId version } }`, { id: collectionId })).collectionAvailableUnits;
  },
  async saveUnit(collectionId: string, input: { name: string; symbol: string; dimension: string; baseUnitId?: string; factor: string; objectFormatId?: string; expectedVersion?: number }, unitId?: string): Promise<Collection> {
    return (await request<{ saveCollectionUnit: Collection }>(`mutation SaveUnit($collectionId: String!, $unitId: String, $input: CollectionUnitInput!) { saveCollectionUnit(collectionId: $collectionId, unitId: $unitId, input: $input) { ${collectionFields} } }`, { collectionId, unitId, input })).saveCollectionUnit;
  },
  async recordExchangeRate(collectionId: string, input: { from: string; to: string; rate: string; effectiveAt: string }): Promise<Collection> {
    return (await request<{ recordCollectionExchangeRate: Collection }>(`mutation Rate($collectionId: String!, $input: CollectionExchangeRateInput!) { recordCollectionExchangeRate(collectionId: $collectionId, input: $input) { ${collectionFields} } }`, { collectionId, input })).recordCollectionExchangeRate;
  },
  async convertQuantity(collectionId: string, amount: string, from: string, to: string, asOf?: string): Promise<{ value: string; fromSymbol: string; toSymbol: string; rateDate?: string }> {
    return (await request<{ collectionQuantityConversion: { value: string; fromSymbol: string; toSymbol: string; rateDate?: string } }>(`query Convert($collectionId: String!, $amount: String!, $from: String!, $to: String!, $asOf: String) { collectionQuantityConversion(collectionId: $collectionId, amount: $amount, from: $from, to: $to, asOf: $asOf) { value fromSymbol toSymbol rateDate } }`, { collectionId, amount, from, to, asOf })).collectionQuantityConversion;
  },
  async deleteEntry(id: string): Promise<void> {
    await request(`mutation DeleteEntry($id: String!) { deleteEntry(id: $id) }`, { id });
  },
  async addCollectionMember(collectionId: string, email: string, role: CollectionRole, sharedFieldIds?: string[]): Promise<Collection> {
    return (await request<{ addCollectionMember: Collection }>(
      `mutation AddMember($collectionId: String!, $email: String!, $role: CollectionRole!, $sharedFieldIds: [String!]) { addCollectionMember(collectionId: $collectionId, email: $email, role: $role, sharedFieldIds: $sharedFieldIds) { ${collectionFields} } }`,
      { collectionId, email, role, sharedFieldIds },
    )).addCollectionMember;
  },
  async removeCollectionMember(collectionId: string, memberUserId: string): Promise<Collection> {
    return (await request<{ removeCollectionMember: Collection }>(
      `mutation RemoveMember($collectionId: String!, $memberUserId: String!) { removeCollectionMember(collectionId: $collectionId, memberUserId: $memberUserId) { ${collectionFields} } }`,
      { collectionId, memberUserId },
    )).removeCollectionMember;
  },
  async collectionAuditLogs(collectionId: string): Promise<AuditLog[]> {
    return (await request<{ collectionAuditLogs: AuditLog[] }>(
      `query AuditLogs($collectionId: String!) { collectionAuditLogs(collectionId: $collectionId) { id collectionId userId action details occurredAt } }`,
      { collectionId },
    )).collectionAuditLogs;
  },
};
