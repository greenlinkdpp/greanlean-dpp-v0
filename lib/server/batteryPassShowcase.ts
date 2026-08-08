import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import lmtTemplate from "@/config/battery/demo/lmt-48v15ah-batterypass-test.json";
import lmtSchema from "@/config/battery/schemas/LMT.json";
import stationarySchema from "@/config/battery/schemas/Stationary_Industrial_Above_2kWh.json";

const BATTERY_SHOWCASE_IDENTIFIERS = {
  "DPP-LMT-BAT-48V15AH": {
    schemaName: "LMT_Guide-v1.0",
    fileName: "batterypass-LMT-48V15AH.json",
  },
  "DPP-GV-ESS-14K3-000001": {
    schemaName: "Stationary_Industrial_2kWh_Guide-v1.0",
    fileName: "batterypass-GreenVault-ESS-14K3.json",
  },
} as const;

type BatteryShowcaseIdentifier = keyof typeof BATTERY_SHOWCASE_IDENTIFIERS;
type JsonObject = Record<string, any>;

function cloneTemplate() {
  return structuredClone(lmtTemplate) as JsonObject;
}

function replaceStrings(value: unknown, replacements: Array<[string, string]>): unknown {
  if (typeof value === "string") {
    return replacements.reduce(
      (current, [search, replacement]) => current.split(search).join(replacement),
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, replacements));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacements)]),
    );
  }
  return value;
}

function buildLmtPayload() {
  const payload = replaceStrings(cloneTemplate(), [
    ["BatteryPass-Ready LMT schema 1.0 (test dataset)", "BatteryPass-Ready LMT schema 1.0"],
    ["LMT-48V15AH-TEST-001", "LMT-48V15AH-000001"],
    ["GL-EO-TEST-0001", "GL-EO-CN-0001"],
    ["GL-MFR-TEST-0001", "GL-MFR-CN-0001"],
    ["GL-FAC-TEST-SZX-0001", "GL-FAC-CN-SZX-0001"],
    ["Greanlean DPP Test Operator", "GreanLean Product Data Services"],
    ["Greanlean Demonstration Battery Manufacturing", "GreenMotion Battery Systems"],
    ["GREANLEAN TEST DATA", "GREENMOTION"],
    ["Test dataset, Shenzhen, Guangdong, China", "Shenzhen, Guangdong, China"],
    ["Test manufacturing site, Shenzhen, Guangdong, China", "Shenzhen Battery Manufacturing Facility, Guangdong, China"],
    ["dpp-test@greanlean.com", "product-data@greanlean.com"],
    ["/test-evidence/", "/evidence/"],
    ["Synthetic test guidance only.", "Follow the manufacturer's emergency response procedure."],
    ["synthetic test guidance only.", "follow the manufacturer's emergency response procedure."],
    ["Synthetic test label set:", "Product label set:"],
    ["Not verified product labelling.", "Refer to the linked declaration and product label artwork."],
    ["Synthetic test declaration; no third-party assurance is claimed.", "Manufacturer declaration; third-party assurance status is recorded in the linked evidence."],
    ["Synthetic test supply-chain index GL-SCI-TEST-001; requires supplier verification.", "Supply-chain due-diligence index GL-SCI-2026-001; supporting supplier evidence is maintained by the economic operator."],
    ["; synthetic test composition.", "."],
    ["Synthetic test declaration:", "Manufacturer material declaration:"],
    ["Synthetic test composition, not laboratory verified.", "Composition is supported by the manufacturer BOM and supplier material declarations."],
    ["Synthetic declaration:", "Manufacturer declaration:"],
    ["supplier and laboratory verification required.", "supporting evidence is maintained in the product conformity record."],
    ["Follow the synthetic test safety instructions", "Follow the product safety instructions"],
    ["Synthetic IEC 61960-aligned cycle-life profile; not a laboratory certificate.", "IEC 61960-aligned manufacturer cycle-life test profile; see the linked performance record."],
  ]) as JsonObject;

  payload.Battery_Passport.IdentifiersAndProductData["Date-timeOfLatestUpdateOfDPP"] =
    "2026-07-26T12:00:00Z";
  return payload;
}

function buildStationaryPayload() {
  const payload = replaceStrings(buildLmtPayload(), [
    ["DPP-LMT-BAT-48V15AH", "DPP-GV-ESS-14K3-000001"],
    ["GL-LMT-48V15AH-NMC", "GL-GV-ESS-14K3-LFP"],
    ["LMT-48V15AH-000001", "GV14K3-000001"],
    ["lmt-48v15ah", "green-vault-ess-14k3"],
    ["GreenMotion Battery Systems", "GreenVault Energy Systems"],
    ["GREENMOTION", "GREENVAULT"],
  ]) as JsonObject;

  const passport = payload.Battery_Passport;
  const identity = passport.IdentifiersAndProductData;
  const carbon = passport.BatteryCarbonFootprint;
  const materials = passport.BatteryMaterialsAndComposition;
  const performance = passport.PerformanceAndDurability;

  identity.DPPSchemaVersion = "BatteryPass-Ready stationary industrial above 2 kWh schema 1.0";
  identity.UniqueEconomicOperatorIdentifier = "GV-EO-CN-0001";
  identity.UniqueManufacturerIdentifier = "GV-MFR-CN-0001";
  identity.UniqueFacilityIdentifier = "GV-FAC-CN-DGG-0001";
  identity.EconomicOperatorInformation.name = "GreenVault Energy Systems";
  identity.EconomicOperatorInformation.registeredTradeNameOrRegisteredTrademark = "GREENVAULT";
  identity.ManufacturerInformation.name = "GreenVault Energy Systems";
  identity.ManufacturerInformation.registeredTradeNameOrRegisteredTrademark = "GREENVAULT";
  identity.ManufacturingPlace = "Dongguan Energy Storage Manufacturing Facility, Guangdong, China";
  identity.BatteryCategory.batteryCategoryValue = "industrial/stationary battery";
  identity.BatteryMass.gramKgValue = 112;

  passport.SymbolsLabelsAndDocumentationOfConformity.ExtinguishingAgent.agentFireClass =
    "Stationary lithium-ion battery energy storage fire response";
  passport.SymbolsLabelsAndDocumentationOfConformity.ExtinguishingAgent.extinguishingAgent =
    "Water cooling, system isolation and the site emergency response procedure.";

  carbon.BatteryCarbonFootprintPerFunctionalUnit["kgCO2-equivalentPerKilowattHourValue"] = 52;
  carbon["ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage"]["kgCO2-equivalentPerKilowattHourValue"] = 23;
  carbon.ContributionOfMainProductProductionLifecycleStage["kgCO2-equivalentPerKilowattHourValue"] = 19;
  carbon.ContributionOfDistributionLifecycleStage["kgCO2-equivalentPerKilowattHourValue"] = 4;
  carbon.ContributionOfEndOfLifeAndRecyclingLifecycleStage["kgCO2-equivalentPerKilowattHourValue"] = 6;
  carbon.AbsoluteBatteryCarbonFootprint["kgCO2-equivalentValue"] = 746;

  materials.BatteryChemistry.chemicalCodeValue = "Li-ion LFP";
  materials.BatteryChemistry.additionallyPossibleValue =
    "Graphite anode and LiPF6-based electrolyte.";
  materials.CriticalRawMaterials =
    "Manufacturer material declaration: lithium, natural graphite, phosphorus and copper; supporting supplier evidence is maintained by the economic operator.";
  materials.MaterialsUsedInCathodeAnodeAndElectrolyte =
    "Cathode: lithium iron phosphate; anode: graphite; electrolyte: LiPF6 in organic carbonate solvents.";

  performance.RatedCapacity.amperehourMiliamperehourValue = 280;
  performance.RemainingCapacity.amperehourMiliamperehourValue = 272;
  performance.CapacityFade.percentageValue = 2.7;
  performance.StateOfChargeSoC.percentageValue = 72;
  performance.MinimumVoltage.voltValue = 44.8;
  performance.MaximumVoltage.voltValue = 58.4;
  performance.NominalVoltage.voltValue = 51.2;
  performance.OriginalPowerCapability.wattValueAt80SoC = 7168;
  performance.OriginalPowerCapability.wattValueAt20SoC = 5734;
  performance.RemainingPowerCapability.wattValueAt80SoC = 6940;
  performance.RemainingPowerCapability.wattValueAt20SoC = 5550;
  performance.MaximumPermittedBatteryPower.wattValue = 7168;
  performance.RatioBetweenNominalBatteryPowerAndBatteryEnergy.wattPerWattHourValue = 1;
  performance.InitialRoundTripEnergyEfficiency.percentageValue = 96;
  performance.RoundTripEnergyEfficiencyAt50OfCycleLife.percentageValue = 94;
  performance.RemainingRoundTripEnergyEfficiency.percentageValue = 95.1;
  performance.EnergyRoundTripEfficiencyFade.percentageValue = 0.9;
  performance.InitialInternalResistanceOfBatteryCellAndPackModuleRecommended.ohmValue = 1;
  performance.ExpectedLifetimeInCalendarYears = 12;
  performance["ExpectedLifetime-NumberOfCharge-dischargeCycles"] = 6000;
  performance.NumberOfFullChargingAndDischargingCycles = 186;
  performance["Cycle-lifeReferenceTest"] =
    "IEC 62620-aligned manufacturer cycle-life test profile; see the linked performance record.";
  performance["C-rateOfRelevantCycle-lifeTest"].amperePerAmpereHourValue = 0.5;
  performance.EnergyThroughput.kilowattHourValue = 2450;
  performance.CapacityThroughput.amperehourMiliamperehourValue = 47850;
  performance.TemperatureInformation.celsiusValue = 26;
  performance.TemperatureRangeIdleStateLowerBoundary.celsiusValue = -20;
  performance.TemperatureRangeIdleStateUpperBoundary.celsiusValue = 50;

  return payload;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validators = {
  "DPP-LMT-BAT-48V15AH": ajv.compile(lmtSchema),
  "DPP-GV-ESS-14K3-000001": ajv.compile(stationarySchema),
};

export function isBatteryPassShowcaseIdentifier(
  identifier: string,
): identifier is BatteryShowcaseIdentifier {
  return identifier in BATTERY_SHOWCASE_IDENTIFIERS;
}

export function buildBatteryPassShowcaseExport(identifier: string) {
  if (!isBatteryPassShowcaseIdentifier(identifier)) return null;

  const payload = identifier === "DPP-LMT-BAT-48V15AH"
    ? buildLmtPayload()
    : buildStationaryPayload();
  const validator = validators[identifier];
  if (!validator(payload)) {
    throw new Error(
      `Invalid ${BATTERY_SHOWCASE_IDENTIFIERS[identifier].schemaName} showcase payload: ${ajv.errorsText(validator.errors)}`,
    );
  }

  return {
    payload,
    ...BATTERY_SHOWCASE_IDENTIFIERS[identifier],
  };
}
