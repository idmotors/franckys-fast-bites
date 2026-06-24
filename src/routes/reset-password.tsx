import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and emits PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY" || sess) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("6 caractères minimum");
    if (pwd !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!ready) return <div className="py-10 text-center text-muted-foreground">Chargement…</div>;

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <h1 className="font-display text-2xl font-bold">Lien invalide ou expiré</h1>
        <p className="text-sm text-muted-foreground">Demandez un nouveau lien de réinitialisation.</p>
        <Button onClick={() => navigate({ to: "/auth" })} className="btn-hero">Retour</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez un nouveau mot de passe.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="pwd">Mot de passe *</Label>
          <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="cf">Confirmer *</Label>
          <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="btn-hero w-full" disabled={busy}>
          {busy ? "..." : "Mettre à jour"}
        </Button>
      </form>
    </div>
  );
}
