import { getRequest, postRequest, patchRequest, putRequest, deleteRequest } from '../APICalls.ts';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { CampagneModel } from '../models/index.ts';
import type {
  Campagne,
  CreateCampagneData,
  UpdateCampagneData,
  AgentAffecte,
  AddAgentCampagneData,
  TransfertAgentData,
  StatutCampagne,
  CampaignInvoicePaStatus,
  ClientAccountBillingMode,
  InvoiceAdjustment,
  BillingPreview,
} from '../../utils/types/index.ts';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const getAllCampagnesService = async (): Promise<CampagneModel[]> => {
  const response: AxiosResponse<ApiResponse<Campagne[]>> = await getRequest('/campagnes');
  if (response.data.success && Array.isArray(response.data.data)) {
    return response.data.data.map(c => CampagneModel.fromJSON(c));
  }
  throw new Error(response.data.message || 'Impossible de récupérer les campagnes');
};

export const getCampagneByIdService = async (id: number): Promise<CampagneModel> => {
  const response: AxiosResponse<ApiResponse<Campagne>> = await getRequest(`/campagnes/${id}`);
  if (response.data.success && response.data.data) {
    return CampagneModel.fromJSON(response.data.data);
  }
  throw new Error(response.data.message || 'Impossible de récupérer la campagne');
};

export const createCampagneService = async (data: CreateCampagneData): Promise<CampagneModel> => {
  const response: AxiosResponse<ApiResponse<Campagne>> = await postRequest('/campagnes', data);
  if (response.data.success && response.data.data) {
    return CampagneModel.fromJSON(response.data.data);
  }
  throw new Error(response.data.message || 'Impossible de créer la campagne');
};

export const updateCampagneService = async (id: number, data: UpdateCampagneData): Promise<CampagneModel> => {
  const response: AxiosResponse<ApiResponse<Campagne>> = await putRequest(`/campagnes/${id}`, data);
  if (response.data.success && response.data.data) {
    return CampagneModel.fromJSON(response.data.data);
  }
  throw new Error(response.data.message || 'Impossible de mettre à jour la campagne');
};

export const updateStatutCampagneService = async (id: number, statut: StatutCampagne): Promise<CampagneModel> => {
  const response: AxiosResponse<ApiResponse<Campagne>> = await patchRequest(`/campagnes/${id}/statut`, { statut });
  if (response.data.success && response.data.data) {
    return CampagneModel.fromJSON(response.data.data);
  }
  throw new Error(response.data.message || 'Impossible de mettre à jour le statut');
};

export const getAgentsCampagneService = async (id: number): Promise<AgentAffecte[]> => {
  const response: AxiosResponse<ApiResponse<AgentAffecte[]>> = await getRequest(`/campagnes/${id}/agents`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Impossible de récupérer les agents');
};

export const addAgentCampagneService = async (id: number, data: AddAgentCampagneData): Promise<AgentAffecte> => {
  const response: AxiosResponse<ApiResponse<AgentAffecte>> = await postRequest(`/campagnes/${id}/agents`, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Impossible d\'affecter l\'agent');
};

export const removeAgentCampagneService = async (idCampagne: number, idEmploye: number): Promise<void> => {
  const response: AxiosResponse<ApiResponse<void>> = await deleteRequest(`/campagnes/${idCampagne}/agents/${idEmploye}`);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Impossible de retirer l\'agent');
  }
};

export const transfererAgentService = async (
  idCampagneSource: number,
  idEmploye: number,
  data: TransfertAgentData
): Promise<void> => {
  const response: AxiosResponse<ApiResponse<void>> = await patchRequest(
    `/campagnes/${idCampagneSource}/agents/${idEmploye}/transferer`,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.message || 'Impossible de transférer l\'agent');
  }
};

export const downloadCampagneFacturXDocumentService = async (
  idCampagne: number,
  payload: { adjustments?: InvoiceAdjustment[]; date_debut: string; date_fin: string; mode?: string; lot_quantity?: number; account_quantity?: number; account_mode?: ClientAccountBillingMode }
): Promise<Blob> => {
  const response = await axios.post(`/campagnes/${idCampagne}/facturation/factur-x`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    responseType: 'blob' as const,
    withCredentials: true,
  });

  return response.data;
};

export const sendCampagneFacturationEmailService = async (
  idCampagne: number,
  payload: { adjustments?: InvoiceAdjustment[]; date_debut: string; date_fin: string; recipient_email: string; account_quantity?: number; account_mode?: ClientAccountBillingMode }
): Promise<{ success: boolean; message?: string }> => {
  const response: AxiosResponse<{ success: boolean; message?: string }> = await postRequest(
    `/campagnes/${idCampagne}/facturation/email`,
    payload,
  );

  return response.data;
};

export const getCampagneFacturationPaStatusService = async (
  idCampagne: number,
  params: { date_debut: string; date_fin: string; refresh?: boolean },
): Promise<CampaignInvoicePaStatus | null> => {
  const searchParams = new URLSearchParams({
    date_debut: params.date_debut,
    date_fin: params.date_fin,
  });
  if (params.refresh) searchParams.set('refresh', 'true');

  const response: AxiosResponse<ApiResponse<CampaignInvoicePaStatus | null>> = await getRequest(
    `/campagnes/${idCampagne}/facturation/pa?${searchParams.toString()}`,
  );
  if (!response.data.success) {
    throw new Error(response.data.message || 'Impossible de récupérer le statut PA de la facture');
  }

  return response.data.data ?? null;
};

export const issueCampagneFacturationThroughPaService = async (
  idCampagne: number,
  payload: { adjustments?: InvoiceAdjustment[]; date_debut: string; date_fin: string; account_quantity?: number; account_mode?: ClientAccountBillingMode },
): Promise<CampaignInvoicePaStatus> => {
  const response: AxiosResponse<ApiResponse<CampaignInvoicePaStatus>> = await postRequest(
    `/campagnes/${idCampagne}/facturation/pa`,
    payload,
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Impossible de créer la facture sur VosFactures');
  }

  return response.data.data;
};

export const testCampagneFacturationThroughPaService = async (
  idCampagne: number,
  payload: { adjustments?: InvoiceAdjustment[]; date_debut: string; date_fin: string; account_quantity?: number; account_mode?: ClientAccountBillingMode },
): Promise<CampaignInvoicePaStatus> => {
  const response: AxiosResponse<ApiResponse<CampaignInvoicePaStatus>> = await postRequest(
    `/campagnes/${idCampagne}/facturation/pa/test`,
    payload,
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Impossible de créer la facture de test sur VosFactures');
  }

  return response.data.data;
};

export const getCampagneFacturationPreviewService = async (idCampagne: number, period: { date_debut: string; date_fin: string }): Promise<BillingPreview> => {
  const query = new URLSearchParams(period);
  const response: AxiosResponse<ApiResponse<BillingPreview>> = await getRequest(`/campagnes/${idCampagne}/facturation/preview?${query.toString()}`);
  if (response.data.success && response.data.data) return response.data.data;
  throw new Error(response.data.message || 'Impossible de charger l’aperçu de facturation.');
};
