import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LISTING_IMAGE_TYPES, useImportImageUrl, useUploadListingImage } from "@/lib/queries";
import { friendlyError } from "@/lib/errors";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  listingId?: string;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  listingId,
  label = "Cover image",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadListingImage();
  const importUrl = useImportImageUrl();
  const [link, setLink] = useState("");
  const busy = upload.isPending || importUrl.isPending;

  // A pasted link is copied into TROVE's storage; the copy is what gets saved.
  const handleLink = async () => {
    const url = link.trim();
    if (!url || importUrl.isPending) return;
    try {
      onChange(await importUrl.mutateAsync(url));
      setLink("");
      toast.success("Image copied.");
    } catch (error) {
      toast.error(friendlyError(error, "We couldn't copy that image."));
    }
  };

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, listingId });
      onChange(result.url);
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(friendlyError(error, "Upload failed."));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background/45">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePick}
            disabled={busy}
          >
            {upload.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {value ? "Replace image" : "Upload image"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP, up to 8 MB. Or paste a public image link and we&apos;ll copy it.
          </p>
          <div className="flex gap-2">
            <Input
              aria-label={`${label} link`}
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleLink();
                }
              }}
              placeholder="https://..."
              disabled={importUrl.isPending}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleLink} disabled={busy || !link.trim()}>
              {importUrl.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Copying…
                </>
              ) : (
                "Use link"
              )}
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={LISTING_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
