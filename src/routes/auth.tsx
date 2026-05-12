import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const phoneSchema = z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Numéro de téléphone invalide");
const pwdSchema = z.string().min(6, "6 caractères minimum").max(72);
const nameSchema = z.string().trim().min(2, "Nom requis").max(100);

// Convert phone to a stable synthetic email used by Supabase auth.
function phoneToEmail(p: string): string {
  const clean = p.replace(/[^0-9]/g, "");
  return `tel${clean}@franckys.app`;
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // Sign-in: identifier can be phone OR email (admin BO)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) navigate({ to: "/" }); }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        nameSchema.parse(fullName);
        phoneSchema.parse(phone);
        pwdSchema.parse(password);
        if (password !== confirm) throw new Error("Les mots de passe ne correspondent pas");
        const email = phoneToEmail(phone);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        toast.success("Compte créé ! Vous êtes connecté.");
      } else {
        const id = identifier.trim();
        const isEmail = id.includes("@");
        const email = isEmail ? id : phoneToEmail(id);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Identifiants invalides");
        toast.success("Bienvenue !");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{mode === "signin" ? "Bon retour 🌭" : "Créer un compte"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Connectez-vous pour commander" : "Rejoignez la famille Francky's"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" ? (
          <>
            <div>
              <Label htmlFor="name">Nom et prénom *</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
            </div>
            <div>
              <Label htmlFor="phone">Numéro de téléphone *</Label>
              <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+261 …" required />
            </div>
            <div>
              <Label htmlFor="pwd">Mot de passe *</Label>
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cf">Confirmer le mot de passe *</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="id">Téléphone ou email</Label>
              <Input id="id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="+261… ou email" required />
            </div>
            <div>
              <Label htmlFor="pwd">Mot de passe</Label>
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </>
        )}
        <Button type="submit" className="btn-hero w-full" disabled={busy}>
          {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary underline-offset-2 hover:underline">
          {mode === "signin" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
