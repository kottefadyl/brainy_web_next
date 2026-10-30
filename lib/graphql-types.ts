export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
};

export type AnalysisInput = {
  comparisonFrom?: InputMaybe<Scalars['String']['input']>;
  comparisonTo?: InputMaybe<Scalars['String']['input']>;
  counterResetFieldId?: InputMaybe<Scalars['String']['input']>;
  dateFieldId?: InputMaybe<Scalars['String']['input']>;
  denominatorFieldId?: InputMaybe<Scalars['String']['input']>;
  denominatorValue?: InputMaybe<Scalars['String']['input']>;
  fieldId?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Array<EntryFieldFilterInput>>;
  formatId: Scalars['String']['input'];
  formulaId?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  groupBy: Scalars['String']['input'];
  groupDepth?: InputMaybe<Scalars['Int']['input']>;
  groupFieldId?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  measureKind: Scalars['String']['input'];
  operation: Scalars['String']['input'];
  percentile?: InputMaybe<Scalars['Int']['input']>;
  rateBase?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  secondaryGroupBy?: InputMaybe<Scalars['String']['input']>;
  secondaryGroupDepth?: InputMaybe<Scalars['Int']['input']>;
  secondaryGroupFieldId?: InputMaybe<Scalars['String']['input']>;
  sourceGroup?: InputMaybe<Scalars['String']['input']>;
  sourceOffset?: InputMaybe<Scalars['Float']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  viewId?: InputMaybe<Scalars['String']['input']>;
  weightFieldId?: InputMaybe<Scalars['String']['input']>;
  windowSize?: InputMaybe<Scalars['Int']['input']>;
  zoneFieldId?: InputMaybe<Scalars['String']['input']>;
  zoneFormatId?: InputMaybe<Scalars['String']['input']>;
};

export type AnalysisOperationSpec = {
  __typename?: 'AnalysisOperationSpec';
  acceptedMeasureKinds: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  minObservations: Scalars['Int']['output'];
  missingValuePolicy: Scalars['String']['output'];
  outputKind: Scalars['String']['output'];
  requiresDateOrder: Scalars['Boolean']['output'];
  requiresNumeric: Scalars['Boolean']['output'];
  version: Scalars['Int']['output'];
};

export type AnalysisResult = {
  __typename?: 'AnalysisResult';
  comparisonRows?: Maybe<Array<AnalysisRow>>;
  dimension?: Maybe<Scalars['String']['output']>;
  explanation?: Maybe<Scalars['String']['output']>;
  groupBy: Scalars['String']['output'];
  hasEstimated?: Maybe<Scalars['Boolean']['output']>;
  operation: Scalars['String']['output'];
  operationVersion?: Maybe<Scalars['Int']['output']>;
  propagatedUncertainty?: Maybe<Scalars['String']['output']>;
  refreshedAt: Scalars['String']['output'];
  rows: Array<AnalysisRow>;
  secondaryGroupBy?: Maybe<Scalars['String']['output']>;
  skippedMissingCount?: Maybe<Scalars['Int']['output']>;
  slope?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
};

export type AnalysisRow = {
  __typename?: 'AnalysisRow';
  columnKey?: Maybe<Scalars['String']['output']>;
  count: Scalars['Float']['output'];
  group: Scalars['String']['output'];
  label: Scalars['String']['output'];
  rowKey?: Maybe<Scalars['String']['output']>;
  sources: Array<AnalysisSource>;
  sourcesHasMore: Scalars['Boolean']['output'];
  value: Scalars['String']['output'];
};

export type AnalysisSource = {
  __typename?: 'AnalysisSource';
  entryId: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type AuditLog = {
  __typename?: 'AuditLog';
  action: Scalars['String']['output'];
  collectionId: Scalars['String']['output'];
  details?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  occurredAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type BackgroundJob = {
  __typename?: 'BackgroundJob';
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdCount: Scalars['Int']['output'];
  errorCount: Scalars['Int']['output'];
  failure?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  logs: Array<BackgroundJobLog>;
  processed: Scalars['Int']['output'];
  requestKey: Scalars['String']['output'];
  result?: Maybe<Scalars['String']['output']>;
  skippedCount: Scalars['Int']['output'];
  state: Scalars['String']['output'];
  total: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BackgroundJobLog = {
  __typename?: 'BackgroundJobLog';
  message: Scalars['String']['output'];
  row: Scalars['Int']['output'];
};

export type CalendarOccurrence = {
  __typename?: 'CalendarOccurrence';
  endAt: Scalars['String']['output'];
  entry: Entry;
  localDate: Scalars['String']['output'];
  localEndClock: Scalars['String']['output'];
  localStartClock: Scalars['String']['output'];
  recurring: Scalars['Boolean']['output'];
  startAt: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
};

export type ClassificationCode = {
  __typename?: 'ClassificationCode';
  active: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  labelEn: Scalars['String']['output'];
  labelFr: Scalars['String']['output'];
  mergedInto?: Maybe<Scalars['String']['output']>;
  parentCode?: Maybe<Scalars['String']['output']>;
};

export type ClassificationCodeInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code: Scalars['String']['input'];
  labelEn: Scalars['String']['input'];
  labelFr: Scalars['String']['input'];
  mergedInto?: InputMaybe<Scalars['String']['input']>;
  parentCode?: InputMaybe<Scalars['String']['input']>;
};

export type ClassificationCopyPreview = {
  __typename?: 'ClassificationCopyPreview';
  allowed: Scalars['Boolean']['output'];
  codeCount: Scalars['Int']['output'];
  conflicts: Array<Scalars['String']['output']>;
  sourceName: Scalars['String']['output'];
  targetName: Scalars['String']['output'];
};

export type ClassificationCsvError = {
  __typename?: 'ClassificationCsvError';
  message: Scalars['String']['output'];
  row: Scalars['Int']['output'];
};

export type ClassificationCsvPreview = {
  __typename?: 'ClassificationCsvPreview';
  codes: Array<ClassificationCode>;
  errors: Array<ClassificationCsvError>;
};

export type ClassificationList = {
  __typename?: 'ClassificationList';
  codes: Array<ClassificationCode>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  version: Scalars['Float']['output'];
};

export type ClassificationMergePreview = {
  __typename?: 'ClassificationMergePreview';
  affectedEntries: Scalars['Int']['output'];
  allowed: Scalars['Boolean']['output'];
};

export type Collection = {
  __typename?: 'Collection';
  allowNegativeStock: Scalars['Boolean']['output'];
  codeLists: Array<ClassificationList>;
  exchangeRates: Array<CollectionExchangeRate>;
  fields: Array<CollectionField>;
  formats: Array<CollectionFormat>;
  formulas: Array<CollectionFormula>;
  id: Scalars['ID']['output'];
  members?: Maybe<Array<CollectionMember>>;
  minAggregateSize?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  ownerId: Scalars['String']['output'];
  savedViews: Array<SavedCollectionView>;
  sharedObjects: Array<SharedObjectGrant>;
  stockRules: Array<StockRule>;
  units: Array<CollectionUnit>;
};

export type CollectionExchangeRate = {
  __typename?: 'CollectionExchangeRate';
  effectiveAt: Scalars['DateTime']['output'];
  from: Scalars['String']['output'];
  id: Scalars['String']['output'];
  rate: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type CollectionExchangeRateInput = {
  effectiveAt: Scalars['String']['input'];
  from: Scalars['String']['input'];
  rate: Scalars['String']['input'];
  to: Scalars['String']['input'];
};

export type CollectionField = {
  __typename?: 'CollectionField';
  codeListId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  kind: FieldKind;
  multiple?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  options?: Maybe<Array<Scalars['String']['output']>>;
  referenceMode?: Maybe<Scalars['String']['output']>;
  sensitivity: SensitivityLevel;
  sourceFieldId?: Maybe<Scalars['String']['output']>;
  targetObjectFormatId?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  variableName?: Maybe<Scalars['String']['output']>;
};

export type CollectionFieldInput = {
  codeListId?: InputMaybe<Scalars['String']['input']>;
  kind: FieldKind;
  multiple?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  referenceMode?: InputMaybe<Scalars['String']['input']>;
  sensitivity?: InputMaybe<SensitivityLevel>;
  targetObjectFormatId?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  variableName?: InputMaybe<Scalars['String']['input']>;
};

export type CollectionFormat = {
  __typename?: 'CollectionFormat';
  appendOnly: Scalars['Boolean']['output'];
  color: Scalars['String']['output'];
  copiedFromFormatId?: Maybe<Scalars['String']['output']>;
  fields: Array<CollectionField>;
  id: Scalars['String']['output'];
  linkedSource?: Maybe<LinkedFormatSource>;
  name: Scalars['String']['output'];
  objectModel: Scalars['Boolean']['output'];
  sensitivity: SensitivityLevel;
  version?: Maybe<Scalars['Float']['output']>;
  workflow?: Maybe<WorkflowDefinition>;
};

export type CollectionFormatImpact = {
  __typename?: 'CollectionFormatImpact';
  entryCount: Scalars['Float']['output'];
  populatedFieldIds: Array<Scalars['String']['output']>;
};

export type CollectionFormatInput = {
  color: Scalars['String']['input'];
  fields: Array<CollectionFieldInput>;
  name: Scalars['String']['input'];
  objectModel?: InputMaybe<Scalars['Boolean']['input']>;
  sensitivity?: InputMaybe<SensitivityLevel>;
};

export type CollectionFormula = {
  __typename?: 'CollectionFormula';
  dependencies: Array<Scalars['String']['output']>;
  expression: Scalars['String']['output'];
  formatId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  version: Scalars['Float']['output'];
};

export type CollectionMember = {
  __typename?: 'CollectionMember';
  addedAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  role: CollectionRole;
  sensitiveFieldIds?: Maybe<Array<Scalars['String']['output']>>;
  sharedFieldIds?: Maybe<Array<Scalars['String']['output']>>;
  userId: Scalars['String']['output'];
};

export enum CollectionRole {
  Editor = 'EDITOR',
  Owner = 'OWNER',
  Reader = 'READER'
}

export type CollectionUnit = {
  __typename?: 'CollectionUnit';
  baseUnitId?: Maybe<Scalars['String']['output']>;
  copiedFromUnitId?: Maybe<Scalars['String']['output']>;
  dimension: Scalars['String']['output'];
  factor: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  objectFormatId?: Maybe<Scalars['String']['output']>;
  symbol: Scalars['String']['output'];
  version: Scalars['Float']['output'];
};

export type CollectionUnitInput = {
  baseUnitId?: InputMaybe<Scalars['String']['input']>;
  dimension: Scalars['String']['input'];
  expectedVersion?: InputMaybe<Scalars['Float']['input']>;
  factor: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  objectFormatId?: InputMaybe<Scalars['String']['input']>;
  symbol: Scalars['String']['input'];
};

export type ContributionEvent = {
  __typename?: 'ContributionEvent';
  actorId?: Maybe<Scalars['String']['output']>;
  at: Scalars['DateTime']['output'];
  kind: Scalars['String']['output'];
};

export type ContributionLink = {
  __typename?: 'ContributionLink';
  allowAnonymous: Scalars['Boolean']['output'];
  collectionId: Scalars['String']['output'];
  consentEn: Scalars['String']['output'];
  consentFr: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  fieldIds: Array<Scalars['String']['output']>;
  formatId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  titleEn: Scalars['String']['output'];
  titleFr: Scalars['String']['output'];
};

export type ContributionReceipt = {
  __typename?: 'ContributionReceipt';
  receipt: Scalars['String']['output'];
  receivedAt: Scalars['DateTime']['output'];
};

export type ContributionSubmission = {
  __typename?: 'ContributionSubmission';
  acceptedEntryId?: Maybe<Scalars['String']['output']>;
  collectionId: Scalars['String']['output'];
  duplicateOf?: Maybe<Scalars['String']['output']>;
  events: Array<ContributionEvent>;
  formatId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  linkId: Scalars['String']['output'];
  receivedAt: Scalars['DateTime']['output'];
  respondentEmail?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  values: Array<EntryValue>;
};

export type CreateCollectionInput = {
  codeLists?: InputMaybe<Array<InitialCodeListInput>>;
  exchangeRates?: InputMaybe<Array<CollectionExchangeRateInput>>;
  fields?: InputMaybe<Array<CollectionFieldInput>>;
  formats?: InputMaybe<Array<CollectionFormatInput>>;
  name: Scalars['String']['input'];
  units?: InputMaybe<Array<CollectionUnitInput>>;
};

export type CreateContributionLinkInput = {
  allowAnonymous: Scalars['Boolean']['input'];
  consentEn: Scalars['String']['input'];
  consentFr: Scalars['String']['input'];
  expiresAt: Scalars['String']['input'];
  fieldIds: Array<Scalars['String']['input']>;
  formatId: Scalars['String']['input'];
  titleEn: Scalars['String']['input'];
  titleFr: Scalars['String']['input'];
};

export type CreateNoteInput = {
  content: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreatedContributionLink = {
  __typename?: 'CreatedContributionLink';
  link: ContributionLink;
  token: Scalars['String']['output'];
};

export type Entry = {
  __typename?: 'Entry';
  collectionId: Scalars['String']['output'];
  contributionLinkId?: Maybe<Scalars['String']['output']>;
  contributionReceivedAt?: Maybe<Scalars['DateTime']['output']>;
  copiedFromCollectionId?: Maybe<Scalars['String']['output']>;
  copiedFromEntryId?: Maybe<Scalars['String']['output']>;
  correctionOf?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  formatId?: Maybe<Scalars['String']['output']>;
  formatVersion?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  ledgerHash?: Maybe<Scalars['String']['output']>;
  ledgerPreviousHash?: Maybe<Scalars['String']['output']>;
  ledgerSequence?: Maybe<Scalars['Float']['output']>;
  recurrence?: Maybe<EntryRecurrence>;
  revisions: Array<EntryRevision>;
  sourceObjectId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  values: Array<EntryValue>;
  workflow?: Maybe<EntryWorkflow>;
};

export type EntryAttachment = {
  __typename?: 'EntryAttachment';
  base64: Scalars['String']['output'];
  fileName: Scalars['String']['output'];
  mimeType: Scalars['String']['output'];
  size: Scalars['Float']['output'];
};

export type EntryFieldFilterInput = {
  fieldId: Scalars['String']['input'];
  operator: EntryFilterOperator;
  value: Scalars['String']['input'];
};

export enum EntryFilterOperator {
  Contains = 'CONTAINS',
  Eq = 'EQ',
  Gt = 'GT',
  Gte = 'GTE',
  Lt = 'LT',
  Lte = 'LTE'
}

export type EntryLink = {
  __typename?: 'EntryLink';
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  fromEntryId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  ownerId: Scalars['String']['output'];
  toEntryId: Scalars['String']['output'];
};

export type EntryMeasureValue = {
  __typename?: 'EntryMeasureValue';
  instrument?: Maybe<Scalars['String']['output']>;
  observedAt?: Maybe<Scalars['String']['output']>;
  quality?: Maybe<Scalars['String']['output']>;
  recordedAt?: Maybe<Scalars['String']['output']>;
  revisedAt?: Maybe<Scalars['String']['output']>;
  revisionNote?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  uncertainty?: Maybe<Scalars['String']['output']>;
  uncertaintyType?: Maybe<Scalars['String']['output']>;
};

export type EntryMeasureValueInput = {
  instrument?: InputMaybe<Scalars['String']['input']>;
  observedAt?: InputMaybe<Scalars['String']['input']>;
  quality?: InputMaybe<Scalars['String']['input']>;
  recordedAt?: InputMaybe<Scalars['String']['input']>;
  revisedAt?: InputMaybe<Scalars['String']['input']>;
  revisionNote?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  uncertainty?: InputMaybe<Scalars['String']['input']>;
  uncertaintyType?: InputMaybe<Scalars['String']['input']>;
};

export type EntryPage = {
  __typename?: 'EntryPage';
  entries: Array<Entry>;
  hasMore: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type EntryRecurrence = {
  __typename?: 'EntryRecurrence';
  endFieldId: Scalars['String']['output'];
  excludedDates: Array<Scalars['String']['output']>;
  frequency: Scalars['String']['output'];
  interval: Scalars['Float']['output'];
  startFieldId: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
  untilDate?: Maybe<Scalars['String']['output']>;
};

export type EntryRecurrenceInput = {
  excludedDates: Array<Scalars['String']['input']>;
  frequency: Scalars['String']['input'];
  interval: Scalars['Float']['input'];
  timeZone: Scalars['String']['input'];
  untilDate?: InputMaybe<Scalars['String']['input']>;
};

export type EntryRelation = {
  __typename?: 'EntryRelation';
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  fromEntryId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: RelationKind;
  label: Scalars['String']['output'];
  ownerId: Scalars['String']['output'];
  quantity?: Maybe<Scalars['String']['output']>;
  snapshotFieldId?: Maybe<Scalars['String']['output']>;
  snapshotUnit?: Maybe<Scalars['String']['output']>;
  snapshotValue?: Maybe<Scalars['String']['output']>;
  toEntryId: Scalars['String']['output'];
  unit?: Maybe<Scalars['String']['output']>;
};

export type EntryReminder = {
  __typename?: 'EntryReminder';
  attempts: Scalars['Float']['output'];
  channels: Array<Scalars['String']['output']>;
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  entryId: Scalars['String']['output'];
  failure?: Maybe<Scalars['String']['output']>;
  fieldId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lockedUntil?: Maybe<Scalars['DateTime']['output']>;
  minutesBefore: Scalars['Float']['output'];
  nextAt?: Maybe<Scalars['DateTime']['output']>;
  occurrenceAt?: Maybe<Scalars['DateTime']['output']>;
  ownerId: Scalars['String']['output'];
  state: Scalars['String']['output'];
  timeOfDay?: Maybe<Scalars['String']['output']>;
  timeZone: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  viewId?: Maybe<Scalars['String']['output']>;
};

export type EntryReminderInput = {
  channels: Array<Scalars['String']['input']>;
  fieldId: Scalars['String']['input'];
  minutesBefore: Scalars['Float']['input'];
  timeOfDay?: InputMaybe<Scalars['String']['input']>;
  timeZone: Scalars['String']['input'];
  viewId?: InputMaybe<Scalars['String']['input']>;
};

export type EntryRevision = {
  __typename?: 'EntryRevision';
  at: Scalars['DateTime']['output'];
  formatVersion: Scalars['Float']['output'];
  values: Array<EntryValue>;
};

export type EntryValue = {
  __typename?: 'EntryValue';
  attachmentMimeType?: Maybe<Scalars['String']['output']>;
  attachmentSize?: Maybe<Scalars['Float']['output']>;
  booleanValue?: Maybe<Scalars['Boolean']['output']>;
  dateTimeValue?: Maybe<Scalars['String']['output']>;
  dateValue?: Maybe<Scalars['String']['output']>;
  durationSeconds?: Maybe<Scalars['Float']['output']>;
  fieldId: Scalars['String']['output'];
  measureValue?: Maybe<EntryMeasureValue>;
  numberValue?: Maybe<Scalars['String']['output']>;
  objectIds?: Maybe<Array<Scalars['String']['output']>>;
  objectSnapshots?: Maybe<Array<ObjectReferenceSnapshot>>;
  selectedValues?: Maybe<Array<Scalars['String']['output']>>;
  unitSnapshot?: Maybe<UnitSnapshot>;
  value: Scalars['String']['output'];
};

export type EntryValueInput = {
  attachmentBase64?: InputMaybe<Scalars['String']['input']>;
  attachmentMimeType?: InputMaybe<Scalars['String']['input']>;
  fieldId: Scalars['String']['input'];
  measureValue?: InputMaybe<EntryMeasureValueInput>;
  unitSnapshot?: InputMaybe<UnitSnapshotInput>;
  value: Scalars['String']['input'];
};

export type EntryWorkflow = {
  __typename?: 'EntryWorkflow';
  assigneeUserId?: Maybe<Scalars['String']['output']>;
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  history: Array<WorkflowEvent>;
  reminderMinutesBefore?: Maybe<Scalars['Int']['output']>;
};

export enum FieldKind {
  Attachment = 'ATTACHMENT',
  Boolean = 'BOOLEAN',
  Character = 'CHARACTER',
  Code = 'CODE',
  Date = 'DATE',
  Datetime = 'DATETIME',
  Duration = 'DURATION',
  Link = 'LINK',
  LongText = 'LONG_TEXT',
  Measure = 'MEASURE',
  MultiSelect = 'MULTI_SELECT',
  Number = 'NUMBER',
  ObjectRef = 'OBJECT_REF',
  Position = 'POSITION',
  Select = 'SELECT',
  Text = 'TEXT',
  Time = 'TIME',
  Title = 'TITLE',
  Zone = 'ZONE'
}

export type ForecastInput = {
  dateFieldId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  frequency: Scalars['String']['input'];
  from?: InputMaybe<Scalars['String']['input']>;
  holdout: Scalars['Int']['input'];
  horizon: Scalars['Int']['input'];
  measureKind: Scalars['String']['input'];
  method: Scalars['String']['input'];
  to?: InputMaybe<Scalars['String']['input']>;
};

export type ForecastPoint = {
  __typename?: 'ForecastPoint';
  date: Scalars['String']['output'];
  estimate: Scalars['String']['output'];
  lower: Scalars['String']['output'];
  observed?: Maybe<Scalars['String']['output']>;
  upper: Scalars['String']['output'];
};

export type ForecastResult = {
  __typename?: 'ForecastResult';
  dimension?: Maybe<Scalars['String']['output']>;
  forecast: Array<ForecastPoint>;
  frequency: Scalars['String']['output'];
  holdoutCount: Scalars['Int']['output'];
  holdoutMae: Scalars['String']['output'];
  method: Scalars['String']['output'];
  observations: Array<ForecastPoint>;
  sourceFrom: Scalars['String']['output'];
  sourceTo: Scalars['String']['output'];
  trainingCount: Scalars['Int']['output'];
  uncertainty: Scalars['String']['output'];
  unit?: Maybe<Scalars['String']['output']>;
  validation: Array<ForecastPoint>;
};

export type FormulaInput = {
  expectedVersion?: InputMaybe<Scalars['Float']['input']>;
  expression: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type FormulaResult = {
  __typename?: 'FormulaResult';
  dimension?: Maybe<Scalars['String']['output']>;
  entryId: Scalars['String']['output'];
  missing?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type GeoDistance = {
  __typename?: 'GeoDistance';
  unit: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type GeoImportError = {
  __typename?: 'GeoImportError';
  message: Scalars['String']['output'];
  row: Scalars['Int']['output'];
};

export type GeoImportResult = {
  __typename?: 'GeoImportResult';
  count: Scalars['Int']['output'];
  errors: Array<GeoImportError>;
};

export type GeoPage = {
  __typename?: 'GeoPage';
  hasMore: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  points: Array<GeoPoint>;
};

export type GeoPoint = {
  __typename?: 'GeoPoint';
  accuracy?: Maybe<Scalars['Float']['output']>;
  entryId: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

export type GeoZoneCount = {
  __typename?: 'GeoZoneCount';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  zoneEntryId: Scalars['String']['output'];
};

export type ImportEntriesInput = {
  dryRun: Scalars['Boolean']['input'];
  formatId: Scalars['String']['input'];
  importKey: Scalars['String']['input'];
  rows: Array<ImportEntryRowInput>;
};

export type ImportEntriesResult = {
  __typename?: 'ImportEntriesResult';
  createdCount: Scalars['Float']['output'];
  errors: Array<ImportRowError>;
  skippedCount: Scalars['Float']['output'];
  validCount: Scalars['Float']['output'];
};

export type ImportEntryRowInput = {
  createdAt: Scalars['String']['input'];
  sourceId: Scalars['String']['input'];
  updatedAt: Scalars['String']['input'];
  values: Array<EntryValueInput>;
  workflowHistory?: InputMaybe<Array<WorkflowEventImportInput>>;
};

export type ImportObjectLinkInput = {
  sourceId: Scalars['String']['input'];
  sourceObjectId: Scalars['String']['input'];
};

export type ImportRowError = {
  __typename?: 'ImportRowError';
  message: Scalars['String']['output'];
  sourceId: Scalars['String']['output'];
};

export type ImportedEntryLinkInput = {
  fromSourceId: Scalars['String']['input'];
  label: Scalars['String']['input'];
  toSourceId: Scalars['String']['input'];
};

export type ImportedRelationInput = {
  fromSourceId: Scalars['String']['input'];
  kind: RelationKind;
  label: Scalars['String']['input'];
  quantity?: InputMaybe<Scalars['String']['input']>;
  snapshotFieldId?: InputMaybe<Scalars['String']['input']>;
  snapshotUnit?: InputMaybe<Scalars['String']['input']>;
  snapshotValue?: InputMaybe<Scalars['String']['input']>;
  toSourceId: Scalars['String']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type InitialCodeInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code: Scalars['String']['input'];
  labelEn: Scalars['String']['input'];
  labelFr: Scalars['String']['input'];
  mergedInto?: InputMaybe<Scalars['String']['input']>;
  parentCode?: InputMaybe<Scalars['String']['input']>;
};

export type InitialCodeListInput = {
  codes: Array<InitialCodeInput>;
  id?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type LedgerIntegrity = {
  __typename?: 'LedgerIntegrity';
  checked: Scalars['Float']['output'];
  headHash: Scalars['String']['output'];
  problem?: Maybe<Scalars['String']['output']>;
  redactionHash: Scalars['String']['output'];
  valid: Scalars['Boolean']['output'];
};

export type LinkedFormatSource = {
  __typename?: 'LinkedFormatSource';
  acceptedVersion: Scalars['Float']['output'];
  sourceCollectionId: Scalars['String']['output'];
  sourceFormatId: Scalars['String']['output'];
  targetVersion: Scalars['Float']['output'];
};

export type LinkedFormatUpdatePreview = {
  __typename?: 'LinkedFormatUpdatePreview';
  acceptedVersion: Scalars['Float']['output'];
  addedFields: Array<Scalars['String']['output']>;
  allowed: Scalars['Boolean']['output'];
  changedFields: Array<Scalars['String']['output']>;
  conflicts: Array<Scalars['String']['output']>;
  removedFields: Array<Scalars['String']['output']>;
  sourceVersion: Scalars['Float']['output'];
  targetFormatId: Scalars['String']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MoveOperationStatus = {
  __typename?: 'MoveOperationStatus';
  failure?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  sourceObjectId: Scalars['String']['output'];
  state: Scalars['String']['output'];
  targetCollectionId: Scalars['String']['output'];
  targetObjectId?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptLinkedDataFormatVersion: Collection;
  addCollectionFormat: Collection;
  addCollectionMember: Collection;
  addCollectionWorkflowTemplate: Collection;
  addObjectModelFromTemplate: Collection;
  assignWorkflowEntry: Entry;
  cancelBackgroundJob: BackgroundJob;
  cancelEntryReminder: Scalars['Boolean']['output'];
  commitEntryStockEffect: StockMovement;
  commitStockMovement: StockMovement;
  copyClassification: Collection;
  copyCollectionDataFormat: TransferResult;
  copyCollectionObject: TransferResult;
  correctContribution: ContributionSubmission;
  correctLedgerEntry: Entry;
  createCollection: Collection;
  createCollectionEntryLink: EntryLink;
  createCollectionFromTemplate: Collection;
  createCollectionRelation: EntryRelation;
  createContributionLink: CreatedContributionLink;
  createEntry: Entry;
  createNote: Note;
  deleteCollection: Scalars['Boolean']['output'];
  deleteCollectionFormula: Collection;
  deleteCollectionView: Collection;
  deleteEntry: Scalars['Boolean']['output'];
  deleteNote: Scalars['Boolean']['output'];
  deleteStockRule: Collection;
  detachCollectionRelations: Scalars['Boolean']['output'];
  detachLinkedDataFormat: Collection;
  duplicateCollectionObject: Entry;
  enableLedger: Collection;
  eraseContribution: Scalars['Boolean']['output'];
  eraseContributionByReceipt: Scalars['Boolean']['output'];
  importCollectionRelations: Scalars['Boolean']['output'];
  importEntriesBatch: ImportEntriesResult;
  importGeoPoints: GeoImportResult;
  linkCollectionDataFormat: TransferResult;
  linkImportedEntries: Scalars['Boolean']['output'];
  linkImportedObjects: Scalars['Boolean']['output'];
  login: AuthPayload;
  loginWithGoogle: AuthPayload;
  mergeClassificationCodes: Collection;
  moveCollectionObject: TransferResult;
  readWorkflowNotification: Scalars['Boolean']['output'];
  recordCollectionExchangeRate: Collection;
  recoverCollectionMove: MoveOperationStatus;
  redactLedgerFields: LedgerIntegrity;
  register: AuthPayload;
  registerPushDevice: PushDevice;
  removeCollectionMember: Collection;
  removeCollectionRelation: Scalars['Boolean']['output'];
  renameCollection: Collection;
  restoreWorkspaceBackup: WorkspaceBackupPreview;
  resumeBackgroundJob: BackgroundJob;
  reviewContribution: ContributionSubmission;
  revokeCollectionObjectShare: Scalars['Boolean']['output'];
  revokeContributionLink: ContributionLink;
  saveClassification: Collection;
  saveCollectionFormula: Collection;
  saveCollectionUnit: Collection;
  saveCollectionView: Collection;
  saveEntryReminder: EntryReminder;
  saveStockRule: Collection;
  sealStockHistory: LedgerIntegrity;
  setCollectionEntryLinkActive: EntryLink;
  setCollectionEntryRecurrence: Entry;
  setCollectionFormatColor: Collection;
  setCollectionFormatObjectModel: Collection;
  setCollectionFormatWorkflow: Collection;
  setCollectionTaskCompleted: Entry;
  setFieldSensitivity: Collection;
  setFormatSensitivity: Collection;
  setMinimumAggregateSize: Collection;
  setStockNegativePolicy: Collection;
  shareCollectionObject: SharedObjectGrant;
  startBackgroundJob: BackgroundJob;
  submitContribution: ContributionReceipt;
  transitionWorkflowEntry: Entry;
  unregisterPushDevice: Scalars['Boolean']['output'];
  updateCollectionFormat: Collection;
  updateEntry: Entry;
  updateNote?: Maybe<Note>;
  updateProfile: User;
  useCollectionObject: Entry;
};


export type MutationAcceptLinkedDataFormatVersionArgs = {
  expectedSourceVersion: Scalars['Int']['input'];
  targetCollectionId: Scalars['String']['input'];
  targetFormatId: Scalars['String']['input'];
};


export type MutationAddCollectionFormatArgs = {
  collectionId: Scalars['String']['input'];
  input: CollectionFormatInput;
};


export type MutationAddCollectionMemberArgs = {
  collectionId: Scalars['String']['input'];
  email: Scalars['String']['input'];
  role: CollectionRole;
  sensitiveFieldIds?: InputMaybe<Array<Scalars['String']['input']>>;
  sharedFieldIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationAddCollectionWorkflowTemplateArgs = {
  collectionId: Scalars['String']['input'];
  color: Scalars['String']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  templateId: Scalars['String']['input'];
};


export type MutationAddObjectModelFromTemplateArgs = {
  collectionId: Scalars['String']['input'];
  color: Scalars['String']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  templateId: Scalars['String']['input'];
};


export type MutationAssignWorkflowEntryArgs = {
  entryId: Scalars['String']['input'];
  input: WorkflowAssignmentInput;
};


export type MutationCancelBackgroundJobArgs = {
  jobId: Scalars['String']['input'];
};


export type MutationCancelEntryReminderArgs = {
  reminderId: Scalars['String']['input'];
};


export type MutationCommitEntryStockEffectArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  expectedUpdatedAt: Scalars['String']['input'];
  ruleId: Scalars['String']['input'];
};


export type MutationCommitStockMovementArgs = {
  collectionId: Scalars['String']['input'];
  input: StockMovementInput;
};


export type MutationCopyClassificationArgs = {
  collectionId: Scalars['String']['input'];
  listId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type MutationCopyCollectionDataFormatArgs = {
  formatId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
  withEntries?: Scalars['Boolean']['input'];
};


export type MutationCopyCollectionObjectArgs = {
  objectId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type MutationCorrectContributionArgs = {
  id: Scalars['String']['input'];
  values: Array<EntryValueInput>;
};


export type MutationCorrectLedgerEntryArgs = {
  input: SaveEntryInput;
  originalId: Scalars['String']['input'];
};


export type MutationCreateCollectionArgs = {
  input: CreateCollectionInput;
};


export type MutationCreateCollectionEntryLinkArgs = {
  collectionId: Scalars['String']['input'];
  fromEntryId: Scalars['String']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  toEntryId: Scalars['String']['input'];
};


export type MutationCreateCollectionFromTemplateArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  templateId: Scalars['String']['input'];
  timeZone?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateCollectionRelationArgs = {
  collectionId: Scalars['String']['input'];
  fromEntryId: Scalars['String']['input'];
  kind: RelationKind;
  label?: InputMaybe<Scalars['String']['input']>;
  quantity?: InputMaybe<Scalars['String']['input']>;
  snapshotFieldId?: InputMaybe<Scalars['String']['input']>;
  toEntryId: Scalars['String']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateContributionLinkArgs = {
  collectionId: Scalars['String']['input'];
  input: CreateContributionLinkInput;
};


export type MutationCreateEntryArgs = {
  collectionId: Scalars['String']['input'];
  input: SaveEntryInput;
};


export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationDeleteCollectionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCollectionFormulaArgs = {
  collectionId: Scalars['String']['input'];
  formulaId: Scalars['String']['input'];
};


export type MutationDeleteCollectionViewArgs = {
  collectionId: Scalars['String']['input'];
  viewId: Scalars['String']['input'];
};


export type MutationDeleteEntryArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteNoteArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteStockRuleArgs = {
  collectionId: Scalars['String']['input'];
  ruleId: Scalars['String']['input'];
};


export type MutationDetachCollectionRelationsArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  replacementId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDetachLinkedDataFormatArgs = {
  targetCollectionId: Scalars['String']['input'];
  targetFormatId: Scalars['String']['input'];
};


export type MutationDuplicateCollectionObjectArgs = {
  id: Scalars['String']['input'];
};


export type MutationEnableLedgerArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type MutationEraseContributionArgs = {
  id: Scalars['String']['input'];
};


export type MutationEraseContributionByReceiptArgs = {
  receipt: Scalars['String']['input'];
};


export type MutationImportCollectionRelationsArgs = {
  collectionId: Scalars['String']['input'];
  importKey: Scalars['String']['input'];
  rows: Array<ImportedRelationInput>;
};


export type MutationImportEntriesBatchArgs = {
  collectionId: Scalars['String']['input'];
  input: ImportEntriesInput;
};


export type MutationImportGeoPointsArgs = {
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  importKey: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  text: Scalars['String']['input'];
};


export type MutationLinkCollectionDataFormatArgs = {
  formatId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type MutationLinkImportedEntriesArgs = {
  collectionId: Scalars['String']['input'];
  importKey: Scalars['String']['input'];
  links: Array<ImportedEntryLinkInput>;
};


export type MutationLinkImportedObjectsArgs = {
  collectionId: Scalars['String']['input'];
  importKey: Scalars['String']['input'];
  links: Array<ImportObjectLinkInput>;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationLoginWithGoogleArgs = {
  firebaseIdToken: Scalars['String']['input'];
};


export type MutationMergeClassificationCodesArgs = {
  collectionId: Scalars['String']['input'];
  expectedVersion: Scalars['Int']['input'];
  fromCode: Scalars['String']['input'];
  listId: Scalars['String']['input'];
  toCode: Scalars['String']['input'];
};


export type MutationMoveCollectionObjectArgs = {
  objectId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type MutationReadWorkflowNotificationArgs = {
  id: Scalars['String']['input'];
};


export type MutationRecordCollectionExchangeRateArgs = {
  collectionId: Scalars['String']['input'];
  input: CollectionExchangeRateInput;
};


export type MutationRecoverCollectionMoveArgs = {
  operationId: Scalars['String']['input'];
};


export type MutationRedactLedgerFieldsArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  fieldIds: Array<Scalars['String']['input']>;
  formatId: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRegisterPushDeviceArgs = {
  label: Scalars['String']['input'];
  platform: Scalars['String']['input'];
  targetKind?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
};


export type MutationRemoveCollectionMemberArgs = {
  collectionId: Scalars['String']['input'];
  memberUserId: Scalars['String']['input'];
};


export type MutationRemoveCollectionRelationArgs = {
  collectionId: Scalars['String']['input'];
  relationId: Scalars['String']['input'];
};


export type MutationRenameCollectionArgs = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type MutationRestoreWorkspaceBackupArgs = {
  archive: Scalars['String']['input'];
  dryRun: Scalars['Boolean']['input'];
};


export type MutationResumeBackgroundJobArgs = {
  jobId: Scalars['String']['input'];
};


export type MutationReviewContributionArgs = {
  action: Scalars['String']['input'];
  duplicateOf?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};


export type MutationRevokeCollectionObjectShareArgs = {
  grantId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type MutationRevokeContributionLinkArgs = {
  id: Scalars['String']['input'];
};


export type MutationSaveClassificationArgs = {
  codes: Array<ClassificationCodeInput>;
  collectionId: Scalars['String']['input'];
  expectedVersion?: InputMaybe<Scalars['Int']['input']>;
  listId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationSaveCollectionFormulaArgs = {
  collectionId: Scalars['String']['input'];
  formulaId?: InputMaybe<Scalars['String']['input']>;
  input: FormulaInput;
};


export type MutationSaveCollectionUnitArgs = {
  collectionId: Scalars['String']['input'];
  input: CollectionUnitInput;
  unitId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSaveCollectionViewArgs = {
  collectionId: Scalars['String']['input'];
  input: SavedCollectionViewInput;
  viewId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSaveEntryReminderArgs = {
  entryId: Scalars['String']['input'];
  input: EntryReminderInput;
  reminderId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSaveStockRuleArgs = {
  collectionId: Scalars['String']['input'];
  input: StockRuleInput;
  ruleId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSealStockHistoryArgs = {
  collectionId: Scalars['String']['input'];
  productId: Scalars['String']['input'];
};


export type MutationSetCollectionEntryLinkActiveArgs = {
  active: Scalars['Boolean']['input'];
  collectionId: Scalars['String']['input'];
  linkId: Scalars['String']['input'];
};


export type MutationSetCollectionEntryRecurrenceArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  input?: InputMaybe<EntryRecurrenceInput>;
  viewId: Scalars['String']['input'];
};


export type MutationSetCollectionFormatColorArgs = {
  collectionId: Scalars['String']['input'];
  color: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type MutationSetCollectionFormatObjectModelArgs = {
  collectionId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  expectedEntryCount?: InputMaybe<Scalars['Int']['input']>;
  expectedVersion: Scalars['Int']['input'];
  formatId: Scalars['String']['input'];
};


export type MutationSetCollectionFormatWorkflowArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  input: WorkflowDefinitionInput;
};


export type MutationSetCollectionTaskCompletedArgs = {
  collectionId: Scalars['String']['input'];
  done: Scalars['Boolean']['input'];
  entryId: Scalars['String']['input'];
  viewId: Scalars['String']['input'];
};


export type MutationSetFieldSensitivityArgs = {
  collectionId: Scalars['String']['input'];
  expectedVersion: Scalars['Int']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  level: SensitivityLevel;
};


export type MutationSetFormatSensitivityArgs = {
  collectionId: Scalars['String']['input'];
  expectedVersion: Scalars['Int']['input'];
  formatId: Scalars['String']['input'];
  level: SensitivityLevel;
};


export type MutationSetMinimumAggregateSizeArgs = {
  collectionId: Scalars['String']['input'];
  minimum: Scalars['Int']['input'];
};


export type MutationSetStockNegativePolicyArgs = {
  allowNegative: Scalars['Boolean']['input'];
  collectionId: Scalars['String']['input'];
};


export type MutationShareCollectionObjectArgs = {
  includeSensitive?: InputMaybe<Scalars['Boolean']['input']>;
  mode: Scalars['String']['input'];
  objectId: Scalars['String']['input'];
  propertyFieldIds: Array<Scalars['String']['input']>;
  targetCollectionId: Scalars['String']['input'];
};


export type MutationStartBackgroundJobArgs = {
  collectionId: Scalars['String']['input'];
  input: StartBackgroundJobInput;
};


export type MutationSubmitContributionArgs = {
  input: SubmitContributionInput;
  token: Scalars['String']['input'];
};


export type MutationTransitionWorkflowEntryArgs = {
  entryId: Scalars['String']['input'];
  expectedUpdatedAt: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type MutationUnregisterPushDeviceArgs = {
  id: Scalars['String']['input'];
};


export type MutationUpdateCollectionFormatArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  input: UpdateCollectionFormatInput;
};


export type MutationUpdateEntryArgs = {
  id: Scalars['String']['input'];
  input: SaveEntryInput;
};


export type MutationUpdateNoteArgs = {
  id: Scalars['String']['input'];
  input: UpdateNoteInput;
};


export type MutationUpdateProfileArgs = {
  input: ProfileInput;
};


export type MutationUseCollectionObjectArgs = {
  objectId: Scalars['String']['input'];
  targetFieldId: Scalars['String']['input'];
  targetFormatId: Scalars['String']['input'];
};

export type Note = {
  __typename?: 'Note';
  content: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type ObjectModelTemplate = {
  __typename?: 'ObjectModelTemplate';
  description: Scalars['String']['output'];
  fields: Array<CollectionField>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ObjectPropertySnapshot = {
  __typename?: 'ObjectPropertySnapshot';
  fieldId: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  unitSnapshot?: Maybe<UnitSnapshot>;
  value: Scalars['String']['output'];
};

export type ObjectReferenceSnapshot = {
  __typename?: 'ObjectReferenceSnapshot';
  capturedAt: Scalars['DateTime']['output'];
  formatId: Scalars['String']['output'];
  formatVersion: Scalars['Float']['output'];
  objectId: Scalars['String']['output'];
  properties: Array<ObjectPropertySnapshot>;
};

export type ProfileInput = {
  fieldOfStudy: Scalars['String']['input'];
  hobbies: Array<Scalars['String']['input']>;
  interests: Array<Scalars['String']['input']>;
  job: Scalars['String']['input'];
  name: Scalars['String']['input'];
  profession: Scalars['String']['input'];
};

export type PublicContributionField = {
  __typename?: 'PublicContributionField';
  id: Scalars['String']['output'];
  kind: FieldKind;
  name: Scalars['String']['output'];
  options?: Maybe<Array<Scalars['String']['output']>>;
};

export type PublicContributionForm = {
  __typename?: 'PublicContributionForm';
  allowAnonymous: Scalars['Boolean']['output'];
  consentEn: Scalars['String']['output'];
  consentFr: Scalars['String']['output'];
  fields: Array<PublicContributionField>;
  formatName: Scalars['String']['output'];
  titleEn: Scalars['String']['output'];
  titleFr: Scalars['String']['output'];
};

export type PushDevice = {
  __typename?: 'PushDevice';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  lastSeenAt: Scalars['DateTime']['output'];
  platform: Scalars['String']['output'];
  targetKind: Scalars['String']['output'];
};

export type QuantityConversion = {
  __typename?: 'QuantityConversion';
  fromSymbol: Scalars['String']['output'];
  rateDate?: Maybe<Scalars['DateTime']['output']>;
  toSymbol: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  analyseCollection: AnalysisResult;
  analysisOperations: Array<AnalysisOperationSpec>;
  backgroundJob: BackgroundJob;
  backgroundJobs: Array<BackgroundJob>;
  calculateCollectionFormula: FormulaResult;
  classificationCopyPreview: ClassificationCopyPreview;
  classificationMergePreview: ClassificationMergePreview;
  collectionAuditLogs: Array<AuditLog>;
  collectionAvailableUnits: Array<CollectionUnit>;
  collectionCalendarOccurrences: Array<CalendarOccurrence>;
  collectionDuplicateLinks: Array<Entry>;
  collectionEntries: Array<Entry>;
  collectionEntriesPage: EntryPage;
  collectionEntry: Entry;
  collectionEntryAsOfDate: Entry;
  collectionEntryLinks: Array<EntryLink>;
  collectionFormatImpact: CollectionFormatImpact;
  collectionGeoDistance: GeoDistance;
  collectionGeoPage: GeoPage;
  collectionGeoZoneSummary: Array<GeoZoneCount>;
  collectionMoveStatus: MoveOperationStatus;
  collectionObject: Entry;
  collectionObjectsPage: EntryPage;
  collectionQuantityConversion: QuantityConversion;
  collectionRelationImpact: RelationImpact;
  collectionRelationTotal: RelationTotal;
  collectionRelations: Array<EntryRelation>;
  collectionsList: Array<Collection>;
  contributionByReceipt: RespondentContribution;
  contributionLinks: Array<ContributionLink>;
  contributionSubmissions: Array<ContributionSubmission>;
  dataFormatCopyPreview: TransferPreview;
  entryAttachment: EntryAttachment;
  entryObjectReferences: Array<ResolvedObjectReference>;
  entryReminders: Array<EntryReminder>;
  exportGeoPoints: Scalars['String']['output'];
  forecastCollection: ForecastResult;
  health: Scalars['String']['output'];
  ledgerBalance: Scalars['String']['output'];
  ledgerProof: Scalars['String']['output'];
  linkedDataFormatUpdatePreview: LinkedFormatUpdatePreview;
  me: User;
  note?: Maybe<Note>;
  notesList: Array<Note>;
  objectCopyPreview: TransferPreview;
  objectModelTemplates: Array<ObjectModelTemplate>;
  objectMovePreview: TransferPreview;
  objectVariableProperty: ResolvedObjectVariable;
  previewClassificationCsv: ClassificationCsvPreview;
  previewEntryStockEffect: StockPreview;
  previewGeoImport: GeoImportResult;
  previewStockMovement: StockPreview;
  publicContributionForm: PublicContributionForm;
  pushDevices: Array<PushDevice>;
  reminderCapabilities: ReminderCapabilities;
  starterTemplates: Array<StarterTemplate>;
  stockDailyReport: Array<StockDailyRow>;
  stockLedgerProof: Scalars['String']['output'];
  stockMovements: Array<StockMovement>;
  stockPositions: Array<StockPosition>;
  verifyLedger: LedgerIntegrity;
  verifyStockLedger: LedgerIntegrity;
  workflowNotifications: Array<WorkflowNotification>;
  workspaceBackup: Scalars['String']['output'];
};


export type QueryAnalyseCollectionArgs = {
  collectionId: Scalars['String']['input'];
  input: AnalysisInput;
};


export type QueryBackgroundJobArgs = {
  jobId: Scalars['String']['input'];
};


export type QueryBackgroundJobsArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryCalculateCollectionFormulaArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  formulaId: Scalars['String']['input'];
};


export type QueryClassificationCopyPreviewArgs = {
  collectionId: Scalars['String']['input'];
  listId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type QueryClassificationMergePreviewArgs = {
  collectionId: Scalars['String']['input'];
  fromCode: Scalars['String']['input'];
  listId: Scalars['String']['input'];
  toCode: Scalars['String']['input'];
};


export type QueryCollectionAuditLogsArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryCollectionAvailableUnitsArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryCollectionCalendarOccurrencesArgs = {
  collectionId: Scalars['String']['input'];
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
  viewId: Scalars['String']['input'];
};


export type QueryCollectionDuplicateLinksArgs = {
  collectionId: Scalars['String']['input'];
  excludeEntryId?: InputMaybe<Scalars['String']['input']>;
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  url: Scalars['String']['input'];
};


export type QueryCollectionEntriesArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryCollectionEntriesPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  collectionId: Scalars['String']['input'];
  filters?: InputMaybe<Array<EntryFieldFilterInput>>;
  first?: Scalars['Int']['input'];
  formatId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  viewId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCollectionEntryArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
};


export type QueryCollectionEntryAsOfDateArgs = {
  asOfDate: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
};


export type QueryCollectionEntryLinksArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCollectionFormatImpactArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type QueryCollectionGeoDistanceArgs = {
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  firstEntryId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  secondEntryId: Scalars['String']['input'];
  unit: Scalars['String']['input'];
};


export type QueryCollectionGeoPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  filters?: InputMaybe<Array<EntryFieldFilterInput>>;
  first: Scalars['Int']['input'];
  formatId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  viewId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCollectionGeoZoneSummaryArgs = {
  collectionId: Scalars['String']['input'];
  filters?: InputMaybe<Array<EntryFieldFilterInput>>;
  positionFieldId: Scalars['String']['input'];
  positionFormatId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  viewId?: InputMaybe<Scalars['String']['input']>;
  zoneFieldId: Scalars['String']['input'];
  zoneFormatId: Scalars['String']['input'];
};


export type QueryCollectionMoveStatusArgs = {
  operationId: Scalars['String']['input'];
};


export type QueryCollectionObjectArgs = {
  id: Scalars['String']['input'];
};


export type QueryCollectionObjectsPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  collectionId: Scalars['String']['input'];
  first?: Scalars['Int']['input'];
  formatId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCollectionQuantityConversionArgs = {
  amount: Scalars['String']['input'];
  asOf?: InputMaybe<Scalars['String']['input']>;
  collectionId: Scalars['String']['input'];
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryCollectionRelationImpactArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  replacementId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCollectionRelationTotalArgs = {
  collectionId: Scalars['String']['input'];
  fieldName: Scalars['String']['input'];
  kind: RelationKind;
  rootId: Scalars['String']['input'];
};


export type QueryCollectionRelationsArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
};


export type QueryContributionByReceiptArgs = {
  receipt: Scalars['String']['input'];
};


export type QueryContributionLinksArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryContributionSubmissionsArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryDataFormatCopyPreviewArgs = {
  formatId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
  withEntries?: Scalars['Boolean']['input'];
};


export type QueryEntryAttachmentArgs = {
  entryId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
};


export type QueryEntryObjectReferencesArgs = {
  entryId: Scalars['String']['input'];
};


export type QueryEntryRemindersArgs = {
  entryId: Scalars['String']['input'];
};


export type QueryExportGeoPointsArgs = {
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  includeSensitive?: InputMaybe<Scalars['Boolean']['input']>;
  kind: Scalars['String']['input'];
};


export type QueryForecastCollectionArgs = {
  collectionId: Scalars['String']['input'];
  input: ForecastInput;
};


export type QueryLedgerBalanceArgs = {
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type QueryLedgerProofArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type QueryLinkedDataFormatUpdatePreviewArgs = {
  targetCollectionId: Scalars['String']['input'];
  targetFormatId: Scalars['String']['input'];
};


export type QueryNoteArgs = {
  id: Scalars['String']['input'];
};


export type QueryObjectCopyPreviewArgs = {
  objectId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type QueryObjectModelTemplatesArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
};


export type QueryObjectMovePreviewArgs = {
  objectId: Scalars['String']['input'];
  targetCollectionId: Scalars['String']['input'];
};


export type QueryObjectVariablePropertyArgs = {
  entryId: Scalars['String']['input'];
  objectId?: InputMaybe<Scalars['String']['input']>;
  propertyFieldId: Scalars['String']['input'];
  variableName: Scalars['String']['input'];
};


export type QueryPreviewClassificationCsvArgs = {
  csv: Scalars['String']['input'];
};


export type QueryPreviewEntryStockEffectArgs = {
  collectionId: Scalars['String']['input'];
  entryId: Scalars['String']['input'];
  ruleId: Scalars['String']['input'];
};


export type QueryPreviewGeoImportArgs = {
  collectionId: Scalars['String']['input'];
  fieldId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  text: Scalars['String']['input'];
};


export type QueryPreviewStockMovementArgs = {
  collectionId: Scalars['String']['input'];
  input: StockMovementInput;
};


export type QueryPublicContributionFormArgs = {
  token: Scalars['String']['input'];
};


export type QueryStarterTemplatesArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStockDailyReportArgs = {
  collectionId: Scalars['String']['input'];
  from: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  lot?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['String']['input'];
  timeZone: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryStockLedgerProofArgs = {
  collectionId: Scalars['String']['input'];
  productId: Scalars['String']['input'];
};


export type QueryStockMovementsArgs = {
  before?: InputMaybe<Scalars['String']['input']>;
  collectionId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  productId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStockPositionsArgs = {
  collectionId: Scalars['String']['input'];
};


export type QueryVerifyLedgerArgs = {
  collectionId: Scalars['String']['input'];
  formatId: Scalars['String']['input'];
};


export type QueryVerifyStockLedgerArgs = {
  collectionId: Scalars['String']['input'];
  productId: Scalars['String']['input'];
};


export type QueryWorkspaceBackupArgs = {
  includeSensitive?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type RelationImpact = {
  __typename?: 'RelationImpact';
  relations: Array<EntryRelation>;
  replacementAllowed: Scalars['Boolean']['output'];
};

export enum RelationKind {
  Association = 'ASSOCIATION',
  Component = 'COMPONENT',
  Parent = 'PARENT'
}

export type RelationTotal = {
  __typename?: 'RelationTotal';
  nodes: Scalars['Float']['output'];
  unit?: Maybe<Scalars['String']['output']>;
  value: Scalars['String']['output'];
};

export type ReminderCapabilities = {
  __typename?: 'ReminderCapabilities';
  email: Scalars['Boolean']['output'];
  push: Scalars['Boolean']['output'];
};

export type ResolvedObjectReference = {
  __typename?: 'ResolvedObjectReference';
  capturedAt?: Maybe<Scalars['DateTime']['output']>;
  fieldId: Scalars['String']['output'];
  missing: Scalars['Boolean']['output'];
  mode: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  objectId: Scalars['String']['output'];
  properties: Array<ObjectPropertySnapshot>;
};

export type ResolvedObjectVariable = {
  __typename?: 'ResolvedObjectVariable';
  capturedAt?: Maybe<Scalars['DateTime']['output']>;
  mode: Scalars['String']['output'];
  objectId: Scalars['String']['output'];
  property: ObjectPropertySnapshot;
  variableName: Scalars['String']['output'];
};

export type RespondentContribution = {
  __typename?: 'RespondentContribution';
  receivedAt: Scalars['DateTime']['output'];
  respondentEmail?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  values: Array<EntryValue>;
};

export type SaveEntryInput = {
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  expectedUpdatedAt?: InputMaybe<Scalars['String']['input']>;
  formatId?: InputMaybe<Scalars['String']['input']>;
  values: Array<EntryValueInput>;
};

export type SavedCollectionView = {
  __typename?: 'SavedCollectionView';
  calendarEndFieldId?: Maybe<Scalars['String']['output']>;
  calendarStartFieldId?: Maybe<Scalars['String']['output']>;
  calendarTimeZone?: Maybe<Scalars['String']['output']>;
  columnFieldIds: Array<Scalars['String']['output']>;
  filterFieldId?: Maybe<Scalars['String']['output']>;
  filterOperator?: Maybe<Scalars['String']['output']>;
  filterValue?: Maybe<Scalars['String']['output']>;
  formatIds: Array<Scalars['String']['output']>;
  groupByFormat: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  layout: Scalars['String']['output'];
  manualOrderFieldIds: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  search: Scalars['String']['output'];
  sort: Scalars['String']['output'];
  taskCompletedFieldId?: Maybe<Scalars['String']['output']>;
  taskDoneFieldId?: Maybe<Scalars['String']['output']>;
  taskDueFieldId?: Maybe<Scalars['String']['output']>;
  taskPriorityFieldId?: Maybe<Scalars['String']['output']>;
};

export type SavedCollectionViewInput = {
  calendarEndFieldId?: InputMaybe<Scalars['String']['input']>;
  calendarStartFieldId?: InputMaybe<Scalars['String']['input']>;
  calendarTimeZone?: InputMaybe<Scalars['String']['input']>;
  columnFieldIds: Array<Scalars['String']['input']>;
  filterFieldId?: InputMaybe<Scalars['String']['input']>;
  filterOperator?: InputMaybe<Scalars['String']['input']>;
  filterValue?: InputMaybe<Scalars['String']['input']>;
  formatIds: Array<Scalars['String']['input']>;
  groupByFormat: Scalars['Boolean']['input'];
  layout: Scalars['String']['input'];
  manualOrderFieldIds?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sort: Scalars['String']['input'];
  taskCompletedFieldId?: InputMaybe<Scalars['String']['input']>;
  taskDoneFieldId?: InputMaybe<Scalars['String']['input']>;
  taskDueFieldId?: InputMaybe<Scalars['String']['input']>;
  taskPriorityFieldId?: InputMaybe<Scalars['String']['input']>;
};

export enum SensitivityLevel {
  Ordinary = 'ORDINARY',
  Personal = 'PERSONAL',
  Sensitive = 'SENSITIVE'
}

export type SharedObjectGrant = {
  __typename?: 'SharedObjectGrant';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  mode: Scalars['String']['output'];
  objectId: Scalars['String']['output'];
  objectName: Scalars['String']['output'];
  propertyFieldIds: Array<Scalars['String']['output']>;
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  sensitiveFieldIds?: Maybe<Array<Scalars['String']['output']>>;
  snapshot: Array<ObjectPropertySnapshot>;
  sourceCollectionId: Scalars['String']['output'];
  sourceFormatId: Scalars['String']['output'];
  sourceFormatVersion: Scalars['Float']['output'];
  sourceName: Scalars['String']['output'];
};

export type StartBackgroundJobInput = {
  kind: Scalars['String']['input'];
  payload: Scalars['String']['input'];
  requestKey: Scalars['String']['input'];
};

export type StarterTemplate = {
  __typename?: 'StarterTemplate';
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type StockDailyRow = {
  __typename?: 'StockDailyRow';
  closing: Scalars['String']['output'];
  date: Scalars['String']['output'];
  incoming: Scalars['String']['output'];
  movements: Array<StockMovement>;
  opening: Scalars['String']['output'];
  outgoing: Scalars['String']['output'];
};

export type StockMovement = {
  __typename?: 'StockMovement';
  actorId: Scalars['String']['output'];
  baseQuantity: Scalars['String']['output'];
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  fromLocation: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  ledgerHash?: Maybe<Scalars['String']['output']>;
  ledgerPreviousHash?: Maybe<Scalars['String']['output']>;
  ledgerSequence?: Maybe<Scalars['Float']['output']>;
  lot: Scalars['String']['output'];
  occurredAt: Scalars['DateTime']['output'];
  packageFactor: Scalars['String']['output'];
  priceSnapshot?: Maybe<Scalars['String']['output']>;
  priceUnit?: Maybe<Scalars['String']['output']>;
  productId: Scalars['String']['output'];
  productName: Scalars['String']['output'];
  quantity: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  reversalOf?: Maybe<Scalars['String']['output']>;
  ruleId?: Maybe<Scalars['String']['output']>;
  sourceEntryId?: Maybe<Scalars['String']['output']>;
  sourceEntryUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  toLocation: Scalars['String']['output'];
};

export type StockMovementInput = {
  fromLocation?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  lot?: InputMaybe<Scalars['String']['input']>;
  occurredAt: Scalars['String']['input'];
  packageFactor?: InputMaybe<Scalars['String']['input']>;
  priceSnapshot?: InputMaybe<Scalars['String']['input']>;
  priceUnit?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['String']['input'];
  quantity: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  reversalOf?: InputMaybe<Scalars['String']['input']>;
  toLocation?: InputMaybe<Scalars['String']['input']>;
};

export type StockPosition = {
  __typename?: 'StockPosition';
  location: Scalars['String']['output'];
  lot: Scalars['String']['output'];
  productId: Scalars['String']['output'];
  productName: Scalars['String']['output'];
  quantity: Scalars['String']['output'];
};

export type StockPreview = {
  __typename?: 'StockPreview';
  afterFrom: Scalars['String']['output'];
  afterTo: Scalars['String']['output'];
  allowed: Scalars['Boolean']['output'];
  baseQuantity: Scalars['String']['output'];
  beforeFrom: Scalars['String']['output'];
  beforeTo: Scalars['String']['output'];
  existingMovementId?: Maybe<Scalars['String']['output']>;
  fromLocation: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  lot: Scalars['String']['output'];
  productId: Scalars['String']['output'];
  productName: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  toLocation: Scalars['String']['output'];
};

export type StockRule = {
  __typename?: 'StockRule';
  dateFieldId?: Maybe<Scalars['String']['output']>;
  formatId: Scalars['String']['output'];
  fromLocationFieldId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  lotFieldId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  packageFactor: Scalars['String']['output'];
  priceFieldId?: Maybe<Scalars['String']['output']>;
  productFieldId: Scalars['String']['output'];
  quantityFieldId: Scalars['String']['output'];
  reasonFieldId?: Maybe<Scalars['String']['output']>;
  toLocationFieldId?: Maybe<Scalars['String']['output']>;
  version: Scalars['Float']['output'];
};

export type StockRuleInput = {
  dateFieldId?: InputMaybe<Scalars['String']['input']>;
  expectedVersion?: InputMaybe<Scalars['Float']['input']>;
  formatId: Scalars['String']['input'];
  fromLocationFieldId?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  lotFieldId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  packageFactor?: InputMaybe<Scalars['String']['input']>;
  priceFieldId?: InputMaybe<Scalars['String']['input']>;
  productFieldId: Scalars['String']['input'];
  quantityFieldId: Scalars['String']['input'];
  reasonFieldId?: InputMaybe<Scalars['String']['input']>;
  toLocationFieldId?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitContributionInput = {
  consent: Scalars['Boolean']['input'];
  respondentEmail?: InputMaybe<Scalars['String']['input']>;
  values: Array<EntryValueInput>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type TransferPreview = {
  __typename?: 'TransferPreview';
  activeShares?: Maybe<Scalars['Float']['output']>;
  allowed: Scalars['Boolean']['output'];
  codeLists: Array<Scalars['String']['output']>;
  conflicts: Array<Scalars['String']['output']>;
  dataFormats: Array<Scalars['String']['output']>;
  entries: Scalars['Float']['output'];
  formulas: Array<Scalars['String']['output']>;
  inboundReferences?: Maybe<Scalars['Float']['output']>;
  objects: Scalars['Float']['output'];
  relations: Scalars['Float']['output'];
  sourceName: Scalars['String']['output'];
  stockMovementCount: Scalars['Float']['output'];
  targetName: Scalars['String']['output'];
  units: Array<Scalars['String']['output']>;
};

export type TransferResult = {
  __typename?: 'TransferResult';
  copiedEntries: Scalars['Float']['output'];
  copiedObjects: Scalars['Float']['output'];
  copiedRelations: Scalars['Float']['output'];
  dataFormatId?: Maybe<Scalars['String']['output']>;
  objectId?: Maybe<Scalars['String']['output']>;
  operationId?: Maybe<Scalars['String']['output']>;
  targetCollectionId: Scalars['String']['output'];
};

export type UnitSnapshot = {
  __typename?: 'UnitSnapshot';
  dimension: Scalars['String']['output'];
  factor: Scalars['String']['output'];
  id: Scalars['String']['output'];
  objectFormatId?: Maybe<Scalars['String']['output']>;
  root: Scalars['String']['output'];
  symbol: Scalars['String']['output'];
  version: Scalars['Float']['output'];
};

export type UnitSnapshotInput = {
  dimension: Scalars['String']['input'];
  factor: Scalars['String']['input'];
  id: Scalars['String']['input'];
  objectFormatId?: InputMaybe<Scalars['String']['input']>;
  root: Scalars['String']['input'];
  symbol: Scalars['String']['input'];
  version: Scalars['Float']['input'];
};

export type UpdateCollectionFieldInput = {
  codeListId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  kind: FieldKind;
  multiple?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  referenceMode?: InputMaybe<Scalars['String']['input']>;
  sensitivity?: InputMaybe<SensitivityLevel>;
  targetObjectFormatId?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  variableName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCollectionFormatInput = {
  expectedVersion: Scalars['Float']['input'];
  fields: Array<UpdateCollectionFieldInput>;
  name: Scalars['String']['input'];
};

export type UpdateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  fieldOfStudy?: Maybe<Scalars['String']['output']>;
  hobbies: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  interests: Array<Scalars['String']['output']>;
  job?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  profession?: Maybe<Scalars['String']['output']>;
  profileCompleted: Scalars['Boolean']['output'];
};

export type WorkflowAssignmentInput = {
  assigneeUserId?: InputMaybe<Scalars['String']['input']>;
  dueAt?: InputMaybe<Scalars['String']['input']>;
  expectedUpdatedAt: Scalars['String']['input'];
  reminderMinutesBefore?: InputMaybe<Scalars['Int']['input']>;
};

export type WorkflowDefinition = {
  __typename?: 'WorkflowDefinition';
  initialState: Scalars['String']['output'];
  requirements: Array<WorkflowRequirement>;
  stateFieldId: Scalars['String']['output'];
  transitions: Array<WorkflowTransition>;
};

export type WorkflowDefinitionInput = {
  expectedVersion: Scalars['Int']['input'];
  initialState: Scalars['String']['input'];
  requirements: Array<WorkflowRequirementInput>;
  stateFieldId: Scalars['String']['input'];
  transitions: Array<WorkflowTransitionInput>;
};

export type WorkflowEvent = {
  __typename?: 'WorkflowEvent';
  actorUserId: Scalars['String']['output'];
  assigneeUserId?: Maybe<Scalars['String']['output']>;
  at: Scalars['DateTime']['output'];
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  from: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type WorkflowEventImportInput = {
  actorUserId: Scalars['String']['input'];
  assigneeUserId?: InputMaybe<Scalars['String']['input']>;
  at: Scalars['String']['input'];
  dueAt?: InputMaybe<Scalars['String']['input']>;
  from: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  to: Scalars['String']['input'];
};

export type WorkflowNotification = {
  __typename?: 'WorkflowNotification';
  actorUserId: Scalars['String']['output'];
  collectionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  entryId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  recipientUserId: Scalars['String']['output'];
};

export type WorkflowRequirement = {
  __typename?: 'WorkflowRequirement';
  fieldIds: Array<Scalars['String']['output']>;
  state: Scalars['String']['output'];
};

export type WorkflowRequirementInput = {
  fieldIds: Array<Scalars['String']['input']>;
  state: Scalars['String']['input'];
};

export type WorkflowTransition = {
  __typename?: 'WorkflowTransition';
  from: Scalars['String']['output'];
  minimumRole: CollectionRole;
  to: Scalars['String']['output'];
};

export type WorkflowTransitionInput = {
  from: Scalars['String']['input'];
  minimumRole: CollectionRole;
  to: Scalars['String']['input'];
};

export type WorkspaceBackupPreview = {
  __typename?: 'WorkspaceBackupPreview';
  allowed: Scalars['Boolean']['output'];
  collections: Scalars['Float']['output'];
  conflicts: Array<Scalars['String']['output']>;
  entries: Scalars['Float']['output'];
  relations: Scalars['Float']['output'];
  restored: Scalars['Boolean']['output'];
  stockMovements: Scalars['Float']['output'];
  version: Scalars['Float']['output'];
};
