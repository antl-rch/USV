import type { ReactElement } from 'react';
import { MdArrowBack } from 'react-icons/md';

import './campagneForm.scss';

import { useCampagneFormView } from '../../../hooks/index.ts';
import { WithAuth } from '../../../utils/middleware/index.ts';
import {
  BackToTop,
  Button,
  CampagneAgentsPanel,
  CampagneBillingSettings,
  CampagneCompanyDocumentation,
  CampagneGeneralFields,
  CampagneInvoiceRecipient,
  CampagneLogoModal,
  CampagneScriptDocuments,
  CampagneLeadSchedule,
  Header,
  SubNav,
} from '../../components/index.ts';

function CampagneForm(): ReactElement {
  const viewModel = useCampagneFormView();
  const { campaignForm } = viewModel;
  if (campaignForm.isFetching) {
    return <div id="campagneForm"><Header /><SubNav /><main><div className="campagneForm__loading">Chargement...</div></main></div>;
  }
  return (
    <div id="campagneForm">
      <Header /><SubNav />
      <main><div className="campagneForm__container">
        <div className="campagneForm__back"><Button style="back" onClick={viewModel.navigateToCampaigns}><MdArrowBack /><span>Retour aux campagnes</span></Button></div>
        <h1>{campaignForm.isEdit ? `Modifier "${campaignForm.existing?.nom_campagne}"` : 'Nouvelle campagne'}</h1>
        {campaignForm.error && <div className="campagneForm__error">{campaignForm.error}</div>}
        {campaignForm.success && <div className="campagneForm__success">{campaignForm.success}</div>}
        <div className="campagneForm__layout">
          <div className="campagneForm__column">
            <form onSubmit={campaignForm.handleSubmit} className="campagneForm__form">
              <fieldset><legend>Informations générales</legend>
                <CampagneGeneralFields viewModel={viewModel} />
                <CampagneCompanyDocumentation viewModel={viewModel} />
                <CampagneInvoiceRecipient viewModel={viewModel} />
                <CampagneBillingSettings viewModel={viewModel} />
                <div className="campagneForm__actions"><Button style="grey" type="button" onClick={viewModel.navigateToCampaigns}>Annuler</Button><Button style="gradient" type="submit" disabled={campaignForm.isLoading}>{campaignForm.isLoading ? 'Enregistrement...' : campaignForm.isEdit ? 'Mettre à jour' : 'Créer la campagne'}</Button></div>
              </fieldset>
            </form>
            {campaignForm.existing && <CampagneScriptDocuments
              key={campaignForm.existing.id_campagne}
              campaignId={campaignForm.existing.id_campagne}
            />}
          </div>
          {campaignForm.isEdit && <CampagneAgentsPanel viewModel={viewModel} />}
        </div>
      </div></main>
      <BackToTop /><CampagneLogoModal viewModel={viewModel} /><CampagneLeadSchedule viewModel={viewModel} />
    </div>
  );
}

const AuthenticatedCampagneForm = WithAuth(CampagneForm);
export default function CampagneFormRoute(): ReactElement {
  return <AuthenticatedCampagneForm />;
}
