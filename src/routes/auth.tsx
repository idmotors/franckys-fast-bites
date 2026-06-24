import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resetClientPasswordByPhone } from "@/lib/password-reset.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const phoneSchema = z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Numéro de téléphone invalide");
const pwdSchema = z.string().min(6, "6 caractères minimum").max(72);
const nameSchema = z.string().trim().min(2, "Nom requis").max(100);

function phoneToEmail(p: string): string {
  const clean = p.replace(/[^0-9]/g, "");
  return `tel${clean}@franckys.app`;
}

type Mode = "signin" | "signup" | "forgot" | "forgot-client";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  // Forgot password fields
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetName, setResetName] = useState("");
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwd2, setResetPwd2] = useState("");

  useEffect(() => {
    if (!loading && user && (mode === "signin" || mode === "signup")) navigate({ to: "/" });
  }, [user, loading, navigate, mode]);

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
      } else if (mode === "signin") {
        const id = identifier.trim();
        const isEmail = id.includes("@");
        const email = isEmail ? id : phoneToEmail(id);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Identifiants invalides");
        toast.success("Bienvenue !");
      } else if (mode === "forgot") {
        const email = resetEmail.trim();
        if (!email.includes("@")) throw new Error("Email invalide");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email envoyé. Vérifiez votre boîte de réception.");
        setMode("signin");
      } else if (mode === "forgot-client") {
        phoneSchema.parse(resetPhone);
        nameSchema.parse(resetName);
        pwdSchema.parse(resetPwd);
        if (resetPwd !== resetPwd2) throw new Error("Les mots de passe ne correspondent pas");
        await resetClientPasswordByPhone({
          data: { phone: resetPhone, fullName: resetName, newPassword: resetPwd },
        });
        toast.success("Mot de passe réinitialisé. Connectez-vous.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signin" ? "Bon retour 🌭"
    : mode === "signup" ? "Créer un compte"
    : mode === "forgot" ? "Mot de passe oublié"
    : "Réinitialiser (client)";
  const subtitle =
    mode === "signin" ? "Connectez-vous pour commander"
    : mode === "signup" ? "Rejoignez la famille Francky's"
    : mode === "forgot" ? "Recevez un lien par email (comptes BO)"
    : "Vérifiez votre identité pour choisir un nouveau mot de passe";

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
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
        )}

        {mode === "signin" && (
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

        {mode === "forgot" && (
          <div>
            <Label htmlFor="rmail">Email du compte BO</Label>
            <Input id="rmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
          </div>
        )}

        {mode === "forgot-client" && (
          <>
            <div>
              <Label htmlFor="rphone">Numéro de téléphone *</Label>
              <Input id="rphone" inputMode="tel" value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} placeholder="+261 …" required />
            </div>
            <div>
              <Label htmlFor="rname">Nom et prénom (tel qu'à l'inscription) *</Label>
              <Input id="rname" value={resetName} onChange={(e) => setResetName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="rpwd">Nouveau mot de passe *</Label>
              <Input id="rpwd" type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="rpwd2">Confirmer *</Label>
              <Input id="rpwd2" type="password" value={resetPwd2} onChange={(e) => setResetPwd2(e.target.value)} required />
            </div>
          </>
        )}

        <Button type="submit" className="btn-hero w-full" disabled={busy}>
          {busy ? "..." :
            mode === "signin" ? "Se connecter" :
            mode === "signup" ? "Créer mon compte" :
            mode === "forgot" ? "Envoyer le lien" :
            "Réinitialiser"}
        </Button>
      </form>

      {mode === "signin" && (
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <div>
            <button onClick={() => setMode("forgot-client")} className="font-semibold text-primary underline-offset-2 hover:underline">
              Mot de passe oublié ? (client)
            </button>
            <span className="mx-2">·</span>
            <button onClick={() => setMode("forgot")} className="font-semibold text-primary underline-offset-2 hover:underline">
              Compte BO
            </button>
          </div>
          <p>
            Pas encore de compte ?{" "}
            <button onClick={() => setMode("signup")} className="font-semibold text-primary underline-offset-2 hover:underline">
              Créer un compte
            </button>
          </p>
        </div>
      )}

      {mode === "signup" && (
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <button onClick={() => setMode("signin")} className="font-semibold text-primary underline-offset-2 hover:underline">
            Se connecter
          </button>
        </p>
      )}

      {(mode === "forgot" || mode === "forgot-client") && (
        <p className="text-center text-sm text-muted-foreground">
          <button onClick={() => setMode("signin")} className="font-semibold text-primary underline-offset-2 hover:underline">
            Retour à la connexion
          </button>
        </p>
      )}
    </div>
  );
}
