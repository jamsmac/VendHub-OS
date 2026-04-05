// Barrel export — all API modules re-exported for backwards compatibility.
// Import from "@/lib/api" continues to work; individual modules can also
// be imported directly, e.g. "@/lib/api/machines".

export { api, getAccessToken, setTokens, clearTokens } from "./client";
export type { QueryParams, RequestBody } from "./client";

export { authApi } from "./auth";
export { machinesApi, machineAccessApi, containersApi } from "./machines";
export {
  productsApi,
  inventoryApi,
  warehousesApi,
  warehouseApi,
  batchMovementsApi,
  openingBalancesApi,
} from "./products";
export {
  ordersApi,
  tasksApi,
  tripsApi,
  routesApi,
  vehiclesApi,
  collectionsApi,
  tripAnalyticsApi,
} from "./operations";
export {
  transactionsApi,
  paymentsApi,
  billingApi,
  reconciliationApi,
  purchaseHistoryApi,
  salesImportApi,
} from "./finance";
export { usersApi, organizationsApi, invitesApi } from "./users";
export { locationsApi } from "./locations";
export {
  equipmentApi,
  hopperTypesApi,
  sparePartsApi,
  washingSchedulesApi,
  maintenanceApi,
  materialRequestsApi,
} from "./equipment";
export { loyaltyApi, achievementsApi, questsApi, promoCodesApi } from "./loyalty";
export {
  incidentsApi,
  alertsApi,
  operatorRatingsApi,
  auditApi,
  workLogsApi,
} from "./monitoring";
export {
  settingsApi,
  integrationsApi,
  webhooksApi,
  websiteConfigApi,
  cmsApi,
  customFieldsApi,
  entityEventsApi,
} from "./settings";
export { referencesApi, directoriesApi } from "./references";
export {
  reportsApi,
  analyticsApi,
  importApi,
  fiscalApi,
  complaintsApi,
  contractorsApi,
  contractsApi,
  clientApi,
  hrApi,
  notificationsApi,
} from "./misc";
