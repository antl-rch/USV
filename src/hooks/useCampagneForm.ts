import { useState, useEffect, useRef } from 'react';
import { useLeadBookingSchedule } from './index.ts';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCampagneByIdService,
  createCampagneService,
  updateCampagneService,
} from '../API/services/index.ts';
import {
  uploadCampagneLogoService,
  deleteCampagneLogoService,
} from '../API/services/index.ts';
import type {
  Campagne,
  LeadBookingWeekday,
  ModePaiement,
} from '../utils/types/index.ts';
import {
  CAMPAGNE_PAYMENT_OPTIONS,
  INITIAL_CAMPAGNE_FORM,
  buildCampagneFormState,
  buildCampagnePayload,
  validateCampagneForm,
  validateCampagneLogoFile,
  CAMPAIGN_VARIANTS,
  MMA_LEAD_PRICING_CAMPAIGN_ID,
  normalizeCampaignVariant,
} from '../utils/scripts/index.ts';
import type { CampagneFormState, CampaignVariant } from '../utils/scripts/index.ts';

export function useCampagneForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState<CampagneFormState>(INITIAL_CAMPAGNE_FORM);
  const leadSchedule = useLeadBookingSchedule(form, (slots, interval, allowManual) => {
    setForm((previous) => ({ ...previous,
      lead_booking_weekly_slots: slots,
      lead_booking_interval_minutes: interval,
      lead_booking_allow_manual_time: allowManual,
      lead_booking_open_weekdays: [1, 2, 3, 4, 5, 6, 7],
    }));
  });
  const [existing, setExisting] = useState<Campagne | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoFileName, setLogoFileName] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const campagneId = existing?.id_campagne ?? null;
  const isLeadCampaign = normalizeCampaignVariant(form.type_campagne) === CAMPAIGN_VARIANTS.lead_b2b;
  const isClientAccountCampaign = normalizeCampaignVariant(form.type_campagne) === CAMPAIGN_VARIANTS.client_account;
  const usesEmployeeCountLeadPricing = campagneId === MMA_LEAD_PRICING_CAMPAIGN_ID;

  // Charger la campagne existante si édition
  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const campagne = await getCampagneByIdService(Number(id));

        setExisting(campagne);
        setForm(buildCampagneFormState(campagne));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setIsFetching(false);
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVariantChange = (variant: CampaignVariant) => {
    setForm((previous) => ({ ...previous, type_campagne: variant }));
  };

  // Gestion du select multiple pour modes_paiement
  const handleModesPaiementChange = (
    selectedOptions: ReadonlyArray<{ value: ModePaiement; label: string }> | null,
  ) => {
    const modes = (selectedOptions ?? []).map((opt) => opt.value) as ModePaiement[];
    const modesString = modes.join(',');
    setForm(prev => ({ ...prev, modes_paiement: modesString }));
  };

  const handleLeadBookingWeekdayChange = (weekday: LeadBookingWeekday, checked: boolean) => {
    setForm((previous) => ({
      ...previous,
      lead_booking_open_weekdays: checked
        ? [...previous.lead_booking_open_weekdays, weekday]
            .filter((value, index, values) => values.indexOf(value) === index)
            .sort((left, right) => left - right)
        : previous.lead_booking_open_weekdays.filter((value) => value !== weekday),
    }));
  };

  // Ouverture de la modale d'upload de logo
  const handleOpenLogoModal = () => {
    setIsLogoModalOpen(true);
    setLogoFileName(existing?.logo_file_name || '');
    setSelectedLogoFile(null);
    setLogoUploadError(null);
    setLogoUploadSuccess(null);
  };

  const handleCloseLogoModal = () => {
    setIsLogoModalOpen(false);
    setIsLogoDragging(false);
    setSelectedLogoFile(null);
    setLogoUploadError(null);
    setLogoUploadSuccess(null);
  };

  // Gestion de la sélection de fichier pour le logo
  const handleLogoFileSelect = (file: File) => {
    const validationError = validateCampagneLogoFile(file);
    if (validationError) {
      setLogoUploadError(validationError);
      return;
    }

    setSelectedLogoFile(file);
    setLogoFileName(file.name);
    setLogoUploadError(null);
  };

  const handleLogoDragOver = () => setIsLogoDragging(true);
  const handleLogoDragLeave = () => setIsLogoDragging(false);
  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsLogoDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoFileSelect(file);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleLogoFileSelect(e.target.files[0]);
    }
  };

  // Upload du logo
  const handleLogoUpload = async () => {
    if (!selectedLogoFile || !logoFileName.trim() || !campagneId) return;

    setIsLogoUploading(true);
    setLogoUploadError(null);
    setLogoUploadSuccess(null);

    try {
      await uploadCampagneLogoService(campagneId, selectedLogoFile, logoFileName.trim());

      setLogoUploadSuccess('Logo uploadé avec succès !');

      setTimeout(async () => {
        handleCloseLogoModal();
        try {
          const campagne = await getCampagneByIdService(campagneId);
          if (campagne) {
            setExisting(campagne);
            setLogoFileName(campagne.logo_file_name || '');
          }
        } catch (err) {
          console.error('Erreur lors du rechargement:', err);
        }
      }, 1500);
    } catch (error) {
      setLogoUploadError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'upload');
    } finally {
      setIsLogoUploading(false);
    }
  };

  // Suppression du logo
  const handleDeleteLogo = async () => {
    if (!campagneId || !existing?.logo_path) return;

    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer le logo de cette campagne ?');
    if (!confirmed) return;

    try {
      await deleteCampagneLogoService(campagneId);
      setExisting(prev => prev ? { ...prev, logo_path: null, logo_file_name: null } : null);
    } catch {
      alert('Impossible de supprimer le logo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateCampagneForm(form, campagneId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const payload = buildCampagnePayload(form, campagneId);

      if (isEdit) {
        await updateCampagneService(Number(id), payload);
        setSuccess('Campagne mise à jour avec succès');
        setTimeout(() => { void navigate('/campagnes'); }, 1500);
      } else {
        await createCampagneService(payload);
        setSuccess('Campagne créée avec succès');
        void navigate('/campagnes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    leadSchedule,
    existing,
    isEdit,
    isLoading,
    isFetching,
    error,
    success,
    isLeadCampaign,
    isClientAccountCampaign,
    usesEmployeeCountLeadPricing,
    isCreantlCampaign: campagneId === 15,
    handleChange,
    handleVariantChange,
    handleModesPaiementChange,
    handleLeadBookingWeekdayChange,
    paymentOptions: CAMPAGNE_PAYMENT_OPTIONS,
    handleSubmit,
    // Logo management
    isLogoModalOpen,
    logoFileName,
    setLogoFileName,
    selectedLogoFile,
    setSelectedLogoFile,
    isLogoDragging,
    isLogoUploading,
    logoUploadError,
    logoUploadSuccess,
    fileInputRef,
    handleOpenLogoModal,
    handleCloseLogoModal,
    handleLogoDragOver,
    handleLogoDragLeave,
    handleLogoDrop,
    handleLogoFileChange,
    handleLogoUpload,
    handleDeleteLogo,
  };
}
