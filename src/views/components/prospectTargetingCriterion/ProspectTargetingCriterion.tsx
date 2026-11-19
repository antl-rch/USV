import { useState, type ReactElement } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import CreatableSelect from "react-select/creatable";
import type {
  GuidedTargetingRow,
  TargetingChoice,
  TargetingChoiceGroup,
} from "../../../utils/types/index.ts";
import { createReactSelectStyles } from "../../../utils/styles/index.ts";
const singleStyles = createReactSelectStyles<TargetingChoice, false>();
const multiStyles = createReactSelectStyles<TargetingChoice, true>(true);
interface Props {
  row: GuidedTargetingRow;
  fields: TargetingChoiceGroup[];
  disabled: boolean;
}
export function ProspectTargetingCriterion({
  row,
  fields,
  disabled,
}: Props): ReactElement {
  const [showRawActivities, setShowRawActivities] = useState(false);
  return (
    <div className="targetingChoice">
      <div className="targetingChoice__heading">
        <label htmlFor={`choice-field-${row.key}`}>
          Filtre
          <Select<TargetingChoice, false>
            inputId={`choice-field-${row.key}`}
            aria-label={`Filtre ${row.key}`}
            options={fields}
            value={row.selectedField}
            onChange={(option) => {
              if (option) row.changeField(option.value);
            }}
            styles={singleStyles}
            isDisabled={disabled}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            className="targetingSelect"
            placeholder="Choisir une information"
            noOptionsMessage={() => "Aucun filtre trouvé"}
          />
        </label>
        {row.operators.length > 1 && (
          <label htmlFor={`choice-operator-${row.key}`}>
            Préciser
            <Select<TargetingChoice, false>
              inputId={`choice-operator-${row.key}`}
              aria-label={`Préciser ${row.key}`}
              options={row.operators}
              value={row.selectedOperator}
              onChange={(option) => {
                if (option) row.changeOperator(option.value);
              }}
              styles={singleStyles}
              isDisabled={disabled}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              className="targetingSelect"
            />
          </label>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={row.remove}
          aria-label={`Supprimer ${row.label}`}
        >
          Supprimer ce filtre
        </button>
      </div>
      {!row.noValue && row.type === "workforce" && (
        <div className="targetingWorkforce">
          <label>
            À partir de
            <input
              aria-label={`Effectif minimum ${row.key}`}
              type="number"
              min={0}
              value={row.minimum}
              placeholder="Sans minimum"
              onChange={(event) =>
                row.changeWorkforce("min", event.target.value)
              }
            />
          </label>
          <label>
            Jusqu’à
            <input
              aria-label={`Effectif maximum ${row.key}`}
              type="number"
              min={0}
              value={row.maximum}
              placeholder="Sans maximum"
              onChange={(event) =>
                row.changeWorkforce("max", event.target.value)
              }
            />
          </label>
          <label className="targetingCheck">
            <input
              type="checkbox"
              checked={row.includeUnknown}
              onChange={(event) =>
                row.changeWorkforce("include_unknown", event.target.checked)
              }
            />
            Accepter aussi les effectifs inconnus
          </label>
          <small>
            Les valeurs absentes, 0, 1 et « 1 à 2 » sont considérées comme
            inconnues, sauf lorsqu’un utilisateur a renseigné ou confirmé
            l’effectif.
          </small>
        </div>
      )}
      {!row.noValue && row.type === "radius" && (
        <div className="targetingGrid">
          <label>
            Autour du code postal
            <input
              value={row.postcode}
              maxLength={5}
              onChange={(event) =>
                row.changeRadius("postcode", event.target.value)
              }
              placeholder="Ex. 17300"
            />
          </label>
          <label>
            À moins de (km)
            <input
              type="number"
              min={1}
              max={500}
              value={row.km}
              onChange={(event) => row.changeRadius("km", event.target.value)}
            />
          </label>
        </div>
      )}
      {!row.noValue && row.needsList && (
        <label htmlFor={`choice-values-${row.key}`}>
          {row.label}
          {row.lookup ? (
            <AsyncSelect<TargetingChoice, true>
              key={`${row.selectedField?.value}-${showRawActivities}`}
              inputId={`choice-values-${row.key}`}
              aria-label={`Valeurs ${row.key}`}
              isMulti
              defaultOptions
              loadOptions={row.selectedField?.value === 'activite' && showRawActivities ? row.loadRawActivities : row.loadOptions}
              value={row.selectedOptions}
              onChange={row.changeList}
              closeMenuOnSelect={false}
              styles={multiStyles}
              isDisabled={disabled}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              placeholder="Choisir dans la liste ou rechercher"
              loadingMessage={() => "Chargement des valeurs…"}
              noOptionsMessage={() =>
                "Aucune valeur trouvée. Précisez votre recherche."
              }
            />
          ) : row.options.length ? (
            <Select<TargetingChoice, true>
              inputId={`choice-values-${row.key}`}
              aria-label={`Valeurs ${row.key}`}
              isMulti
              closeMenuOnSelect={false}
              options={row.options}
              value={row.selectedOptions}
              onChange={row.changeList}
              styles={multiStyles}
              isDisabled={disabled}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              placeholder="Choisir une ou plusieurs valeurs"
              noOptionsMessage={() => "Aucune valeur trouvée"}
            />
          ) : (
            <CreatableSelect<TargetingChoice, true>
              inputId={`choice-values-${row.key}`}
              aria-label={`Valeurs ${row.key}`}
              isMulti
              closeMenuOnSelect={false}
              value={row.selectedOptions}
              onChange={row.changeList}
              onCreateOption={row.createValues}
              formatCreateLabel={(value) => `Ajouter « ${value} »`}
              styles={multiStyles}
              isDisabled={disabled}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              placeholder="Saisir une valeur, puis Entrée"
              noOptionsMessage={() => "Saisissez une valeur à ajouter"}
            />
          )}
          {row.lookupError && <small role="alert">{row.lookupError}</small>}
          {row.hint && <small>{row.hint}</small>}
        </label>
      )}
      {row.selectedField?.value === 'activite' && row.needsList && (
        <div>
          <label className="targetingCheck">
            <input type="checkbox" checked={showRawActivities} onChange={(event) => setShowRawActivities(event.target.checked)} />
            Rechercher un libellé historique (mode avancé)
          </label>
          <small>Les fiches dont l’activité est imprécise peuvent nécessiter un code NAF ou un libellé historique.</small>
        </div>
      )}
      {!row.noValue &&
        !row.needsList &&
        ["category", "boolean"].includes(row.type) && (
          <label htmlFor={`choice-value-${row.key}`}>
            {row.label}
            <Select<TargetingChoice, false>
              inputId={`choice-value-${row.key}`}
              aria-label={`Valeur ${row.key}`}
              options={row.options}
              value={row.selectedOption}
              onChange={(option) => {
                if (option) row.changeChoice(option.value);
              }}
              styles={singleStyles}
              isDisabled={disabled}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {row.hint && <small>{row.hint}</small>}
          </label>
        )}
      {!row.noValue &&
        !row.needsList &&
        !["workforce", "radius", "category", "boolean"].includes(row.type) && (
          <label>
            Votre choix
            <input
              aria-label={`Valeur ${row.key}`}
              type={
                row.type === "number"
                  ? "number"
                  : row.type === "date"
                    ? "date"
                    : "text"
              }
              value={row.value}
              onChange={(event) => row.changeText(event.target.value)}
            />
          </label>
        )}
    </div>
  );
}
