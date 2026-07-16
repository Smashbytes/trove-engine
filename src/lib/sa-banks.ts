// South African banks with their Paystack bank codes (country=south africa).
// Used for creating Paystack transfer recipients (type "basa"). Source:
// GET https://api.paystack.co/bank?country=south africa  (fetched 2026-06-26).
export interface SaBank {
  code: string;
  name: string;
}

export const SA_BANKS: SaBank[] = [
  { code: "632005", name: "Absa Bank" },
  { code: "430000", name: "African Bank" },
  { code: "470010", name: "Capitec Bank" },
  { code: "450105", name: "Capitec Business" },
  { code: "679000", name: "Discovery Bank" },
  { code: "250655", name: "First National Bank (FNB)" },
  { code: "201419", name: "FirstRand Bank" },
  { code: "580105", name: "Investec Bank" },
  { code: "198765", name: "Nedbank" },
  { code: "261251", name: "Rand Merchant Bank (RMB)" },
  { code: "222026", name: "RMB Private Bank" },
  { code: "683000", name: "Sasfin Bank" },
  { code: "051001", name: "Standard Bank" },
  { code: "678910", name: "TymeBank" },
  { code: "888000", name: "Bank Zero" },
  { code: "462005", name: "Bidvest Bank" },
  { code: "410506", name: "Access Bank South Africa" },
  { code: "800000", name: "Albaraka Bank" },
  { code: "431010", name: "Ubank" },
];
