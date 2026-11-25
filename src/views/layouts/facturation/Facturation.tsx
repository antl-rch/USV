import type { ReactElement } from 'react';
import { MdArrowBack } from 'react-icons/md';

import './facturation.scss';

import { useFacturationView } from '../../../hooks/index.ts';
import { WithAuth } from '../../../utils/middleware/index.ts';
import {
  BackToTop,
  Button,
  FacturationConfiguration,
  FacturationEmailModal,
  FacturationFilters,
  FacturationPreparation,
  FacturationPreview,
  FacturationSummary,
  Header,
  Loader,
  SubNav,
} from '../../components/index.ts';

function Facturation(): ReactElement {
  const viewModel = useFacturationView();
  const { facturation } = viewModel;

  return (
    <div id="facturationView">
      <Header />
      <SubNav />
      <main>
        <div className="facturationView__container">
          <div className="facturationView__back"><Button style="back" onClick={viewModel.navigateBack}><MdArrowBack /><span>Retour</span></Button></div>
          <section className="facturationView__hero"><div><p className="facturationView__eyebrow">Commercial / Facturation</p><h1>Facturation campagnes</h1><p className="facturationView__subtitle">Espace de préparation pour la génération des factures B2B par campagne et par période.</p></div></section>
          {facturation.error && <div className="facturationView__error">{facturation.error}</div>}
          {facturation.isLoading ? <Loader /> : facturation.activeCampagnes.length === 0 ? (
            <section className="facturationView__empty"><h2>Aucune campagne disponible</h2><p>Créez une campagne dans l’USV pour préparer sa facturation.</p></section>
          ) : (
            <>
              <FacturationFilters state={facturation} />
              <FacturationSummary state={facturation} />
              <FacturationPreview state={facturation} />
              <section className="facturationView__grid"><FacturationConfiguration state={facturation} /><FacturationPreparation state={facturation} /></section>
            </>
          )}
        </div>
      </main>
      <BackToTop />
      <FacturationEmailModal state={facturation} />
    </div>
  );
}

const AuthenticatedFacturation = WithAuth(Facturation);
export default function FacturationRoute(): ReactElement {
  return <AuthenticatedFacturation />;
}
