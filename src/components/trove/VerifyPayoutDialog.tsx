import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Field } from "@/components/trove/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useHasKycDocument, useUploadKycDocument, useVerifyPayoutAccount } from "@/lib/queries";
import { SA_BANKS } from "@/lib/sa-banks";
import { friendlyError } from "@/lib/errors";

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm";

/**
 * Collects the owner's identity + bank details and provisions their TradeSafe
 * seller token, so escrow payouts for paid bookings reach their account.
 */
export function VerifyPayoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, hostProfile, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const verify = useVerifyPayoutAccount();
  const uploadKyc = useUploadKycDocument();
  const hasKyc = useHasKycDocument();

  const bankJson =
    hostProfile?.payout_bank_json &&
    typeof hostProfile.payout_bank_json === "object" &&
    !Array.isArray(hostProfile.payout_bank_json)
      ? (hostProfile.payout_bank_json as Record<string, unknown>)
      : {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [legalName, setLegalName] = useState("");
  const [registration, setRegistration] = useState("");
  const [idType, setIdType] = useState<"ID" | "PASSPORT">("ID");
  const [idNumber, setIdNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"CHEQUE" | "SAVINGS" | "CURRENT">("CHEQUE");
  const [file, setFile] = useState<File | null>(null);

  // Prefill from what we already know every time the dialog opens. Sensitive
  // values (ID + account number) are never stored, so they're always re-entered.
  useEffect(() => {
    if (!open) return;
    setContactPerson(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setLegalName(str(bankJson.legal_name) || hostProfile?.display_name || "");
    setRegistration(str(bankJson.registration));
    setBankCode(str(bankJson.bank_code));
    const t = str(bankJson.account_type);
    setAccountType(t === "SAVINGS" || t === "CURRENT" ? t : "CHEQUE");
    setIdNumber("");
    setAccountNumber("");
    setFile(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = verify.isPending || uploadKyc.isPending;
  const needsDoc = hasKyc.data === false;

  const submit = async () => {
    const bank = SA_BANKS.find((b) => b.code === bankCode);
    if (!bank) return toast.error("Choose your bank.");
    if (!/^\d{5,20}$/.test(accountNumber.replace(/\s+/g, ""))) {
      return toast.error("Account number must be 5–20 digits.");
    }
    if (idType === "ID" && !/^\d{13}$/.test(idNumber.trim())) {
      return toast.error("A South African ID number is 13 digits.");
    }
    if (!idNumber.trim() || !contactPerson.trim() || !phone.trim()) {
      return toast.error("Fill in the account holder's name, phone and ID.");
    }
    if (!legalName.trim() || !registration.trim()) {
      return toast.error("Legal name and registration number are required.");
    }
    if (needsDoc && !file) {
      return toast.error("Upload your ID or CIPC document so TradeSafe can release funds to you.");
    }

    try {
      if (file) {
        await uploadKyc.mutateAsync({ file, docType: registration.trim() ? "cipc" : "id" });
        await queryClient.invalidateQueries({ queryKey: ["kyc-documents"] });
      }
      const result = await verify.mutateAsync({
        contactPerson,
        phone,
        legalName,
        registration,
        idNumber,
        idType,
        bank: bank.name,
        bankCode: bank.code,
        accountNumber,
        accountType,
      });
      if (result.escrow_status === "escrow_ready") {
        toast.success("Account verified with TradeSafe — you're ready to receive payouts.");
        onOpenChange(false);
      } else if (result.missing.includes("kyc_document")) {
        toast.error("Bank account accepted, but we still need your ID or CIPC document.");
      } else {
        toast.error(result.error ?? "TradeSafe couldn't verify these details. Check them and retry.");
      }
    } catch (error) {
      toast.error(friendlyError(error, "Verification failed. Please retry."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify your payout account
          </DialogTitle>
          <DialogDescription>
            Guests pay into TradeSafe escrow. Once you're verified, TradeSafe releases your share
            straight to this bank account after each experience.
          </DialogDescription>
        </DialogHeader>

        {!isOwner ? (
          <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Only the Spot owner can verify the payout account, because it's tied to their ID.
            Ask the owner to sign in and verify from Settings.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account holder (full name)">
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </Field>
            <Field label="Mobile number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
              />
            </Field>
            <Field label="Registered legal name">
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As it appears on CIPC"
              />
            </Field>
            <Field label="Registration number">
              <Input
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="e.g. 2021/123456/07"
              />
            </Field>
            <Field label="ID type">
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as "ID" | "PASSPORT")}
                className={SELECT_CLASS}
              >
                <option value="ID">South African ID</option>
                <option value="PASSPORT">Passport</option>
              </select>
            </Field>
            <Field label={idType === "ID" ? "ID number" : "Passport number"}>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                inputMode={idType === "ID" ? "numeric" : "text"}
                autoComplete="off"
              />
            </Field>
            <Field label="Bank">
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select your bank…</option>
                {SA_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Account type">
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as "CHEQUE" | "SAVINGS" | "CURRENT")
                }
                className={SELECT_CLASS}
              >
                <option value="CHEQUE">Cheque / Business</option>
                <option value="CURRENT">Current</option>
                <option value="SAVINGS">Savings</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Account number">
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={
                    hostProfile?.tradesafe_bank_last4
                      ? `Currently ****${hostProfile.tradesafe_bank_last4} — re-enter to confirm`
                      : "Digits only"
                  }
                />
              </Field>
            </div>
            {needsDoc && (
              <div className="sm:col-span-2">
                <Field label="ID or CIPC document (PDF, PNG or JPG, max 10 MB)">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-input/40 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="truncate">{file ? file.name : "Choose a file…"}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </Field>
              </div>
            )}
            {hasKyc.data && (
              <p className="flex items-center gap-2 text-xs text-success sm:col-span-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verification document on file
              </p>
            )}
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground sm:col-span-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your ID and full account number go straight to TradeSafe, a registered South African
              escrow provider. TROVE only keeps the bank name and last 4 digits.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Later
          </Button>
          {isOwner && (
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadKyc.isPending ? "Uploading document…" : verify.isPending ? "Verifying with TradeSafe…" : "Verify account"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

