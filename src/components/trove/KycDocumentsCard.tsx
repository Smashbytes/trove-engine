import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyError } from "@/lib/errors";
import { useKycDocuments, useUploadKycDocument, type KycDocType } from "@/lib/queries";

const DOC_LABELS: Record<KycDocType, string> = {
  id: "SA ID document",
  passport: "Passport",
  cipc: "CIPC registration (CoR 14.3 / CoR 39)",
  bank_confirmation: "Bank confirmation letter",
  proof_of_address: "Proof of address",
};

const STATUS: Record<string, { label: string; className: string }> = {
  submitted: { label: "With TROVE", className: "text-amber-400" },
  approved: { label: "Accepted", className: "text-emerald-400" },
  rejected: { label: "Needs a new upload", className: "text-destructive" },
};

/**
 * The owner's verification documents and TROVE's decision on each, plus an upload for
 * new or replacement files. Files go to the private kyc-docs bucket, never by email or
 * WhatsApp (POPIA).
 */
export function KycDocumentsCard({ canUpload }: { canUpload: boolean }) {
  const documents = useKycDocuments();
  const upload = useUploadKycDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<KycDocType>("bank_confirmation");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload.mutateAsync({ file, docType });
      toast.success(`${DOC_LABELS[docType]} uploaded.`);
    } catch (error) {
      toast.error(friendlyError(error, "Could not upload the document."));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const rows = documents.data ?? [];

  return (
    <div className="mt-5 rounded-xl border border-border/60 bg-white/[0.02] p-4">
      <p className="text-sm font-medium">Your documents</p>
      {documents.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing uploaded yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/40">
          {rows.map((d) => {
            const s = STATUS[d.status] ?? STATUS.submitted;
            return (
              <li key={d.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{DOC_LABELS[d.doc_type] ?? d.doc_type}</span>
                  <span className={`text-xs ${s.className}`}>{s.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Uploaded{" "}
                  {new Date(d.created_at).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                {d.status === "rejected" && d.note && (
                  <p className="mt-1 text-xs text-destructive">{d.note}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canUpload && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={docType} onValueChange={(v) => setDocType(v as KycDocType)}>
            <SelectTrigger
              aria-label="Document type"
              className="h-10 rounded-lg border-border/60 bg-white/[0.03] text-sm sm:w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/60 bg-card text-foreground">
              {(Object.keys(DOC_LABELS) as KycDocType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-sm">
                  {DOC_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            aria-label="Choose a document to upload"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            disabled={upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="mr-2 h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      )}
      {canUpload && (
        <p className="mt-2 text-xs text-muted-foreground">
          PDF, PNG or JPG, up to 10 MB. Bank letters and proof of address must be from the last 3
          months.
        </p>
      )}
    </div>
  );
}
