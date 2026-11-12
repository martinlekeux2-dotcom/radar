"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Save, Shield } from "lucide-react";
import { getSupabaseClient } from "../../../src/lib/supabase";

export default function ResetPasswordPage() {
  const [supabase, setSupabase] = useState(null);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let client;

    try {
      client = getSupabaseClient();
      setSupabase(client);
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : "Supabase n’est pas configuré.");
      setReady(true);
      return undefined;
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSession(Boolean(session));
    });

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(`Impossible de vérifier le lien : ${sessionError.message}`);
      setHasSession(Boolean(data.session));
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    try {
      if (!supabase) throw new Error("Supabase n’est pas configuré.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmPassword("");
      setNotice("Votre mot de passe a été modifié. Vous pouvez maintenant accéder à l’administration.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de modifier le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="reset-password-title">
        <Link className="admin-login-brand" href="/" aria-label="Retour à RADAR">
          <Image src="/radar-logo.png" alt="RADAR" width={168} height={113} priority />
        </Link>
        <p className="admin-eyebrow"><Shield size={14} /> Espace sécurisé</p>
        <h1 id="reset-password-title">Nouveau mot de passe</h1>
        {!ready ? (
          <p className="admin-muted"><LoaderCircle className="admin-spinner" size={16} /> Vérification du lien…</p>
        ) : hasSession ? (
          <>
            <p className="admin-muted">Choisissez un nouveau mot de passe pour votre compte.</p>
            <form className="admin-form" onSubmit={updatePassword}>
              <label>
                Nouveau mot de passe
                <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              </label>
              <label>
                Confirmer le mot de passe
                <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
              </label>
              {error && <p className="admin-alert" role="alert">{error}</p>}
              {notice && <p className="admin-notice" role="status">{notice}</p>}
              <button className="admin-primary-button" disabled={busy || Boolean(notice)} type="submit">
                {busy ? <LoaderCircle className="admin-spinner" size={17} /> : <Save size={17} />}
                {busy ? "Modification…" : "Modifier le mot de passe"}
              </button>
            </form>
          </>
        ) : (
          <p className="admin-alert" role="alert">
            {error || "Ce lien est invalide, expiré ou déjà utilisé. Retournez à la connexion pour demander un nouveau lien."}
          </p>
        )}
        {hasSession && <Link className="admin-back-link" href="/admin">Accéder à l’administration</Link>}
        {!hasSession && ready && <Link className="admin-back-link" href="/admin"><ArrowLeft size={15} /> Retour à la connexion</Link>}
      </section>
    </main>
  );
}
