import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/branding")({ component: AdminBranding });

function AdminBranding() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    supabase.from("app_settings").select("value").eq("key", "logo_url").maybeSingle()
      .then(({ data }) => setLogoUrl((data?.value as string) ?? null));
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Image uniquement");
    if (file.size > 2 * 1024 * 1024) return toast.error("Max 2 Mo");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const { error: upErr } = await supabase.from("app_settings").upsert({ key: "logo_url", value: pub.publicUrl, updated_at: new Date().toISOString() });
    setUploading(false);
    if (upErr) return toast.error(upErr.message);
    toast.success("Logo mis à jour");
    setLogoUrl(pub.publicUrl);
    window.dispatchEvent(new Event("francky:logo-changed"));
  };

  const remove = async () => {
    if (!confirm("Supprimer le logo personnalisé ?")) return;
    const { error } = await supabase.from("app_settings").upsert({ key: "logo_url", value: null, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    setLogoUrl(null);
    window.dispatchEvent(new Event("francky:logo-changed"));
    toast.success("Logo réinitialisé");
  };

  return (
    <div className="card-pop space-y-4 rounded-2xl p-5">
      <div>
        <h2 className="font-display text-xl font-bold">Logo de l'application</h2>
        <p className="text-sm text-muted-foreground">Format PNG ou JPG, max 2 Mo. Le logo s'affiche dans l'en-tête de l'app.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-secondary">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-4xl">🌭</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-hero inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            {uploading ? "Envoi…" : "Choisir une image"}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
          {logoUrl && (
            <Button variant="ghost" size="sm" onClick={remove} className="gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
