import type { SelectedCharge, Charge, Addition, PenalCode } from '@/stores/charge-store';
import additionsData from '../../data/additions.json';
import config from '../../data/config.json';

const formatTimeInMinutes = (time: { days: number; hours: number; min: number }) => {
  if (!time) return 0;
  return time.days * 1440 + time.hours * 60 + time.min;
};

export interface ChargeResult {
  row: SelectedCharge;
  chargeDetails: Charge;
  additionDetails?: Addition;
  isModified: boolean;
  original: { minTime: number; maxTime: number; points: number };
  modified: { minTime: number; maxTime: number; points: number };
  fine: number;
  impound: number;
  suspension: number;
  bailAuto: any;
  bailCost: number;
}

export interface CalculationTotals {
  original: { minTime: number; maxTime: number; points: number };
  modified: { minTime: number; maxTime: number; points: number };
  fine: number;
  impound: number;
  suspension: number;
  bailStatus: { eligible: boolean; discretionary: boolean; noBail: boolean; hasBailCharge: boolean };
  highestBail: number;
}

export interface ArrestCalculation {
  calculationResults: ChargeResult[];
  extras: { title: string; extra: string }[];
  totals: CalculationTotals;
  bailStatus: string;
  minTimeCapped: number;
  maxTimeCapped: number;
  isCapped: boolean;
}

export async function calculateArrest(report: SelectedCharge[]): Promise<ArrestCalculation> {
  const penalCode: PenalCode = await fetch(`${config.CONTENT_DELIVERY_NETWORK}?file=gtaw_penal_code.json`).then(res => res.json());
  const additions: Addition[] = additionsData.additions;

  const extras = report.map(row => {
    const chargeDetails = penalCode[row.chargeId!];
    if (chargeDetails && chargeDetails.extra && chargeDetails.extra !== 'N/A') {
      const typePrefix = `${chargeDetails.type}${row.class}`;
      const title = `${typePrefix} ${chargeDetails.id}. ${chargeDetails.charge}${row.offense !== '1' ? ` (Offence #${row.offense})` : ''}`;
      return { title, extra: chargeDetails.extra };
    }
    return null;
  }).filter(Boolean) as { title: string; extra: string }[];

  const calculationResults = report.map(row => {
    const chargeDetails = penalCode[row.chargeId!];
    if (!chargeDetails) return null;

    const additionDetails = additions.find(a => a.name === row.addition);
    const sentenceMultiplier = additionDetails?.sentence_multiplier ?? 1;
    const pointsMultiplier = additionDetails?.points_multiplier ?? 1;

    const isDrugCharge = !!chargeDetails.drugs;

    const getTime = (timeObj: any) => {
      if (!timeObj) return { days: 0, hours: 0, min: 0 };
      if (isDrugCharge && row.category) {
        return timeObj[row.category] || { days: 0, hours: 0, min: 0 };
      }
      return timeObj;
    };

    const getFine = (fineObj: any) => {
      if (!fineObj) return 0;
      if (isDrugCharge && row.category) return fineObj[row.category] || 0;
      return fineObj[row.offense!] || 0;
    };

    const originalMinTime = formatTimeInMinutes(getTime(chargeDetails.time));
    let originalMaxTime = formatTimeInMinutes(getTime(chargeDetails.maxtime));
    if (originalMaxTime < originalMinTime) {
      originalMaxTime = originalMinTime;
    }
    const originalPoints = chargeDetails.points?.[row.class as keyof typeof chargeDetails.points] ?? 0;

    const modifiedMinTime = originalMinTime * sentenceMultiplier;
    const modifiedMaxTime = originalMaxTime * sentenceMultiplier;
    const modifiedPoints = originalPoints * pointsMultiplier;

    const fine = getFine(chargeDetails.fine);
    const impound = chargeDetails.impound?.[row.offense as keyof typeof chargeDetails.impound] || 0;
    const suspension = chargeDetails.suspension?.[row.offense as keyof typeof chargeDetails.suspension] || 0;

    const getBailAuto = () => (typeof chargeDetails.bail.auto === 'object' && row.category) ? chargeDetails.bail.auto[row.category] : chargeDetails.bail.auto;
    const getBailCost = () => (typeof chargeDetails.bail.cost === 'object' && row.category) ? chargeDetails.bail.cost[row.category] : chargeDetails.bail.cost;
    const bailAuto = chargeDetails.bail ? getBailAuto() : null;
    const bailCost = chargeDetails.bail && bailAuto !== false ? getBailCost() : 0;

    return {
      row,
      chargeDetails,
      additionDetails,
      isModified: sentenceMultiplier !== 1 || pointsMultiplier !== 1,
      original: { minTime: originalMinTime, maxTime: originalMaxTime, points: originalPoints },
      modified: { minTime: modifiedMinTime, maxTime: modifiedMaxTime, points: modifiedPoints },
      fine,
      impound,
      suspension,
      bailAuto,
      bailCost,
    } as ChargeResult;
  }).filter(Boolean) as ChargeResult[];

  const totals = calculationResults.reduce(
    (acc, result) => {
      acc.original.minTime += result.original.minTime;
      acc.original.maxTime += result.original.maxTime;
      acc.original.points += result.original.points;

      acc.modified.minTime += result.modified.minTime;
      acc.modified.maxTime += result.modified.maxTime;
      acc.modified.points += result.modified.points;

      acc.fine += result.fine;
      acc.impound += result.impound;
      acc.suspension += result.suspension;

      if (result.bailAuto !== null) {
        acc.bailStatus.hasBailCharge = true;
        if (result.bailAuto === false) acc.bailStatus.noBail = true;
        if (result.bailAuto === 2) acc.bailStatus.discretionary = true;
        if (result.bailAuto === true) acc.bailStatus.eligible = true;
      }
      if (result.bailAuto !== false && result.bailCost > acc.highestBail) {
        acc.highestBail = result.bailCost;
      }

      return acc;
    },
    {
      original: { minTime: 0, maxTime: 0, points: 0 },
      modified: { minTime: 0, maxTime: 0, points: 0 },
      fine: 0,
      impound: 0,
      suspension: 0,
      bailStatus: { eligible: false, discretionary: false, noBail: false, hasBailCharge: false },
      highestBail: 0,
    } as CalculationTotals
  );

  const getBailStatus = () => {
    if (!totals.bailStatus.hasBailCharge) return 'N/A';
    if (totals.bailStatus.noBail) return 'NOT ELIGIBLE';
    if (totals.bailStatus.discretionary) return 'DISCRETIONARY';
    if (totals.bailStatus.eligible) return 'ELIGIBLE';
    return 'N/A';
  };

  const maxSentenceMinutes = config.MAX_SENTENCE_DAYS * 1440;
  const minTimeCapped = Math.min(totals.modified.minTime, maxSentenceMinutes);
  const maxTimeCapped = Math.min(totals.modified.maxTime, maxSentenceMinutes);
  const isCapped = totals.modified.minTime > maxSentenceMinutes || totals.modified.maxTime > maxSentenceMinutes;

  return {
    calculationResults,
    extras,
    totals,
    bailStatus: getBailStatus(),
    minTimeCapped,
    maxTimeCapped,
    isCapped,
  };
}

