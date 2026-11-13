"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  BarChart3,
  Bold,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clapperboard,
  FileText,
  Heading2,
  Italic,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Lightbulb,
  Mail,
  MessageSquare,
  NotebookPen,
  Plus,
  Quote,
  Radio,
  Rss,
  Save,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getSupabaseClient } from "../../src/lib/supabase";
import { actuCategories, actuRegions } from "../../src/lib/actu-rss-config";
import { mainMenuSections, quickInfoIcons, slugifyContent } from "../../src/lib/content-config";
import { Upload } from "tus-js-client";

const navigation = [
  { id: "overview", label: "Vue d’ensemble", Icon: LayoutDashboard },
  { id: "articles", label: "Articles", Icon: FileText },
  { id: "reportages", label: "Reportages", Icon: BookOpen },
  { id: "videos", label: "Vidéos", Icon: Clapperboard },
  { id: "events", label: "Événements", Icon: CalendarDays },
  { id: "quickInfos", label: "Infos rapides", Icon: Lightbulb },
  { id: "liveUpdate", label: "En direct", Icon: Radio },
  { id: "aboutUs", label: "Qui sommes-nous ?", Icon: Users },
  { id: "dailyFact", label: "Chiffre du jour", Icon: Sparkles },
  { id: "rss", label: "Flux RSS", Icon: Rss },
  { id: "notes", label: "Bloc-notes", Icon: NotebookPen },
  { id: "comments", label: "Commentaires", Icon: MessageSquare },
  { id: "profile", label: "Mon profil", Icon: UserRound },
  { id: "accounts", label: "Gestion des comptes", Icon: Users, adminOnly: true },
  { id: "statistics", label: "Statistiques", Icon: BarChart3 },
];

const articleStatusLabels = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const commentStatusLabels = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

const emptyArticle = {
  title: "",
  slug: "",
  category: "",
  author_name: "",
  excerpt: "",
  content: "",
  location: "",
  cover_image_url: "",
  cover_image_caption: "",
  show_on_home: false,
  featured_on_home: false,
  show_as_reportage: false,
  menu_section: "",
  status: "draft",
};

async function adminRequest(path, { method = "GET", body } = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Impossible de vérifier la session : ${error.message}`);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Votre session a expiré. Reconnectez-vous.");

  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(`Le serveur a renvoyé une réponse vide (HTTP ${response.status}).`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Le serveur a renvoyé une réponse invalide (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(
      typeof result?.error === "string" ? result.error : `La requête a échoué (HTTP ${response.status}).`,
    );
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Le serveur a renvoyé une réponse JSON inattendue.");
  }
  return result;
}

function readVideoMetadata(source) {
  const video = document.createElement("video");
  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : null;

  return new Promise((resolve, reject) => {
    let timeoutId;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("La vidéo n’a pas pu être lue. Vérifiez son URL ou son format."));
    }, 15000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      };
      cleanup();
      resolve(metadata);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("La vidéo n’a pas pu être lue. Vérifiez son URL ou son format."));
    };
    video.src = objectUrl ?? source;
    video.load();
  });
}

async function assertVerticalVideo(source) {
  const { width, height } = await readVideoMetadata(source);
  if (!width || !height || height <= width) {
    throw new Error("La vidéo doit être au format vertical (hauteur supérieure à la largeur).");
  }
}

async function uploadMedia(file, kind, onProgress) {
  if (kind === "video") await assertVerticalVideo(file);
  const signedUpload = await adminRequest("media", {
    method: "POST",
    body: { kind, mimeType: file.type, size: file.size },
  });

  const supabase = getSupabaseClient();
  if (kind === "image") {
    const { error } = await supabase.storage
      .from(signedUpload.bucket)
      .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, { contentType: file.type });
    if (error) throw new Error(`Impossible d’envoyer l’image : ${error.message}`);
    onProgress(100);
  } else {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Impossible de vérifier la session : ${sessionError.message}`);
    const accessToken = sessionData.session?.access_token;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!accessToken) throw new Error("Votre session a expiré. Reconnectez-vous.");
    if (!apiKey) throw new Error("La clé publique Supabase n’est pas configurée.");

    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!projectUrl) throw new Error("Supabase n’est pas complètement configuré.");
    const supabaseUrl = new URL(projectUrl);
    if (supabaseUrl.hostname.endsWith(".supabase.co") && !supabaseUrl.hostname.endsWith(".storage.supabase.co")) {
      supabaseUrl.hostname = supabaseUrl.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
    }
    const endpoint = `${supabaseUrl.origin}/storage/v1/upload/resumable`;

    await new Promise((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint,
        headers: {
          authorization: `Bearer ${accessToken}`,
          apikey: apiKey,
        },
        metadata: {
          bucketName: signedUpload.bucket,
          objectName: signedUpload.path,
          contentType: file.type,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        onProgress(bytesUploaded, bytesTotal) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onError: reject,
        onSuccess: resolve,
      });
      upload.start();
    });
  }

  return supabase.storage.from(signedUpload.bucket).getPublicUrl(signedUpload.path).data.publicUrl;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({ label, value, detail, Icon }) {
  return (
    <article className="admin-metric-card">
      <div className="admin-metric-icon"><Icon size={19} aria-hidden="true" /></div>
      <p className="admin-muted">{label}</p>
      <p className="admin-metric-value">{value ?? "—"}</p>
      <p className="admin-muted admin-metric-detail">{detail}</p>
    </article>
  );
}

function StatusBadge({ children, status }) {
  return <span className={`admin-status admin-status-${status}`}>{children}</span>;
}

function AdminLogin({ supabase, configError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(configError);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (!supabase) throw new Error("Configurez Supabase avant de vous connecter.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.");
      return;
    }
    setBusy(true);
    try {
      if (!supabase) throw new Error("Configurez Supabase avant de réinitialiser votre mot de passe.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice("Si cette adresse possède un compte, un lien de réinitialisation lui sera envoyé.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Impossible d’envoyer le lien.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <Link className="admin-login-brand" href="/" aria-label="Retour à RADAR">
          <Image src="/radar-logo.png" alt="RADAR" width={168} height={113} priority />
        </Link>
        <p className="admin-eyebrow"><Shield size={14} /> Espace sécurisé</p>
        <h1 id="admin-login-title">Connexion à l’administration</h1>
        <p className="admin-muted">Connectez-vous avec votre compte Supabase autorisé.</p>
        <form className="admin-form" onSubmit={signIn}>
          <label>
            Adresse e-mail
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            Mot de passe
            <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error && <p className="admin-alert" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          <button className="admin-primary-button" disabled={busy || !supabase} type="submit">
            {busy ? <LoaderCircle className="admin-spinner" size={17} /> : <Shield size={17} />}
            Se connecter
          </button>
        </form>
        <button className="admin-text-button" disabled={busy || !supabase} onClick={resetPassword} type="button">
          Mot de passe oublié ?
        </button>
        <Link className="admin-back-link" href="/"><ArrowLeft size={15} /> Retour au site</Link>
      </section>
    </main>
  );
}

function OverviewView({ data, onNavigate }) {
  const metrics = data?.metrics;
  return (
    <>
      <div className="admin-metric-grid">
        <MetricCard label="Articles" value={metrics?.articles} detail={`${metrics?.publishedArticles ?? 0} publiés`} Icon={FileText} />
        <MetricCard label="À modérer" value={metrics?.pendingComments} detail={`${metrics?.comments ?? 0} commentaires au total`} Icon={MessageSquare} />
        <MetricCard label="Brouillons" value={metrics?.draftArticles} detail={`${metrics?.archivedArticles ?? 0} archivés`} Icon={Save} />
        <MetricCard label="Comptes équipe" value={metrics?.accounts} detail="Accès à l’administration" Icon={Users} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">Récemment modifiés</p><h2>Derniers articles</h2></div>
          <button className="admin-secondary-button" onClick={() => onNavigate("articles")} type="button">Tous les articles <ChevronRight size={15} /></button>
        </div>
        <ArticleTable articles={data?.recentArticles ?? []} compact />
      </section>
      <section className="admin-quick-links">
        <button onClick={() => onNavigate("articles")} type="button"><Plus size={18} /> Rédiger un article</button>
        <button onClick={() => onNavigate("comments")} type="button"><MessageSquare size={18} /> Modérer les commentaires</button>
        <button onClick={() => onNavigate("statistics")} type="button"><BarChart3 size={18} /> Consulter les statistiques</button>
      </section>
    </>
  );
}

function ArticleTable({ articles, compact = false, onEdit, onDelete }) {
  if (!articles.length) {
    return <p className="admin-empty">Aucun article pour le moment.</p>;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Titre</th><th>Rubrique</th><th>Emplacements</th><th>Statut</th><th>Modifié le</th>{!compact && <th>Actions</th>}</tr></thead>
        <tbody>
          {articles.map((article, index) => (
            <tr key={`${article.id || article.slug || article.title || "article"}-${index}`}>
              <td><strong>{article.title}</strong><span className="admin-table-subtitle">/{article.slug}</span></td>
              <td>{article.category}{article.location && <span className="admin-table-subtitle">{article.location}</span>}</td>
              <td>
                {article.show_on_home && <span className="admin-table-subtitle">Accueil</span>}
                {article.featured_on_home && <span className="admin-table-subtitle">À la une</span>}
                {article.show_as_reportage && <span className="admin-table-subtitle">Bulle Reportages</span>}
                {article.menu_section && <span className="admin-table-subtitle">{mainMenuSections.find((section) => section.slug === article.menu_section)?.label ?? article.menu_section}</span>}
                {article.cover_image_url && article.status !== "published" && <span className="admin-table-subtitle">Photo importée · prête pour publication</span>}
                {!article.show_on_home && !article.featured_on_home && !article.show_as_reportage && !article.menu_section && "—"}
              </td>
              <td><StatusBadge status={article.status}>{articleStatusLabels[article.status] ?? article.status}</StatusBadge></td>
              <td>{formatDate(article.updated_at)}</td>
              {!compact && (
                <td>
                  <div className="admin-row-actions">
                    <button aria-label={`Modifier ${article.title}`} onClick={() => onEdit(article)} type="button"><FileText size={16} /></button>
                    <button aria-label={`Supprimer ${article.title}`} className="admin-danger-icon" onClick={() => onDelete(article)} type="button"><Trash2 size={16} /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MediaUploadControl({ kind, onUploaded, onUploadingChange }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    onUploadingChange?.(true);
    try {
      onUploaded(await uploadMedia(file, kind, setProgress));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Impossible d’envoyer le fichier.");
    } finally {
      setUploading(false);
      setProgress(0);
      onUploadingChange?.(false);
      event.target.value = "";
    }
  }

  return (
    <div className="admin-upload-control">
      <label>
        Importer {kind === "video" ? "une vidéo verticale (1 Go max, limite Supabase appliquée)" : "une image (20 Mo max)"}
        <input accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"} disabled={uploading} onChange={handleUpload} type="file" />
      </label>
      {uploading && <span className="admin-muted">Envoi en cours… {progress} %</span>}
      {error && <span className="admin-alert" role="alert">{error}</span>}
    </div>
  );
}

function VideoThumbnailCreator({ videoUrl, onCreated, onUploadingChange }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setError("");
  }, [videoUrl]);

  async function createThumbnail() {
    const video = videoRef.current;
    if (!video || !duration) return;
    setError("");
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const scale = Math.min(1, 1280 / video.videoHeight, 720 / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de préparer l’image miniature.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => result
            ? resolve(result)
            : reject(new Error("Impossible de créer l’image miniature à cette position.")),
          "image/jpeg",
          0.9,
        );
      });
      const file = new File([blob], "miniature-video.jpg", { type: "image/jpeg" });
      onCreated(await uploadMedia(file, "image", setProgress));
    } catch (thumbnailError) {
      setError(thumbnailError instanceof Error
        ? thumbnailError.message
        : "Impossible de créer la miniature. Vous pouvez aussi importer une image.");
    } finally {
      setUploading(false);
      setProgress(0);
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="video-thumbnail-creator">
      <strong>Créer une miniature à partir de la vidéo</strong>
      <p className="admin-muted">Choisissez une image dans la vidéo, puis enregistrez-la comme miniature.</p>
      {videoUrl ? (
        <>
          <video
            crossOrigin="anonymous"
            key={videoUrl}
            onError={() => setError("Impossible de lire cette vidéo ici. Vous pouvez importer une image miniature à la place.")}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (video.videoHeight <= video.videoWidth) {
                setError("La vidéo doit être au format vertical (hauteur supérieure à la largeur).");
                return;
              }
              const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
              setDuration(videoDuration);
              const startTime = Math.min(1, videoDuration);
              video.currentTime = startTime;
              setCurrentTime(startTime);
              setError("");
            }}
            onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
            playsInline
            preload="metadata"
            ref={videoRef}
            src={videoUrl}
          />
          {duration > 0 && (
            <label>
              Image à {currentTime.toFixed(1)} s
              <input
                max={duration}
                min={0}
                onChange={(event) => {
                  const time = Number(event.target.value);
                  setCurrentTime(time);
                  if (videoRef.current) videoRef.current.currentTime = time;
                }}
                step="0.1"
                type="range"
                value={currentTime}
              />
            </label>
          )}
          <button className="admin-secondary-button" disabled={uploading || duration <= 0} onClick={createThumbnail} type="button">
            {uploading ? `Création… ${progress} %` : "Créer cette miniature"}
          </button>
        </>
      ) : (
        <p className="admin-muted">Importez une vidéo verticale ou renseignez son URL pour choisir une image.</p>
      )}
      {error && <span className="admin-alert" role="alert">{error}</span>}
    </div>
  );
}

function ArticleEditor({ article, onClose, onSave, busy, error }) {
  const [form, setForm] = useState(article);
  const [slugTouched, setSlugTouched] = useState(Boolean(article.id));
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [uploadCount, setUploadCount] = useState(0);
  const contentRef = useRef(null);
  const excerptRef = useRef(null);
  const onUploadingChange = (isUploading) => setUploadCount((count) => count + (isUploading ? 1 : -1));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === "menu_section") {
        const section = mainMenuSections.find((item) => item.slug === value);
        if (section) updated.category = section.label;
      }
      if (name === "title" && !slugTouched) {
        updated.slug = value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return updated;
    });
  }

  async function generateSummary() {
    setSummaryBusy(true);
    setSummaryError("");
    try {
      const result = await adminRequest("articles/summarize", {
        method: "POST",
        body: { title: form.title, content: form.content },
      });
      setForm((current) => ({ ...current, excerpt: result.summary }));
    } catch (requestError) {
      setSummaryError(requestError instanceof Error ? requestError.message : "Impossible de générer le résumé.");
    } finally {
      setSummaryBusy(false);
    }
  }

  function insertFormatting(prefix, suffix = prefix) {
    const textarea = contentRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = form.content.slice(selectionStart, selectionEnd) || "texte";
    const replacement = `${prefix}${selected}${suffix}`;
    const content = `${form.content.slice(0, selectionStart)}${replacement}${form.content.slice(selectionEnd)}`;
    setForm((current) => ({ ...current, content }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length + selected.length);
    });
  }

  function insertExcerptFormatting() {
    const textarea = excerptRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const excerptText = form.excerpt ?? "";
    const selected = excerptText.slice(selectionStart, selectionEnd) || "texte";
    const prefix = "**";
    const excerpt = `${excerptText.slice(0, selectionStart)}${prefix}${selected}${prefix}${excerptText.slice(selectionEnd)}`;
    setForm((current) => ({ ...current, excerpt }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length + selected.length);
    });
  }

  function insertImage(url) {
    const textarea = contentRef.current;
    const content = form.content ?? "";
    const selectionStart = textarea?.selectionStart ?? content.length;
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionStart);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const description = "Légende de la photo";
    const markdown = `![${description}](${url})`;
    const suffix = after && !after.startsWith("\n") ? "\n" : "";
    const inserted = `${prefix}${markdown}${suffix}`;

    setForm((current) => ({
      ...current,
      content: `${before}${inserted}${after}`,
    }));
    requestAnimationFrame(() => {
      if (!textarea) return;
      const descriptionStart = selectionStart + prefix.length + 2;
      textarea.focus();
      textarea.setSelectionRange(descriptionStart, descriptionStart + description.length);
    });
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-editor-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">{article.id ? "Modification" : "Rédaction"}</p><h2>{article.id ? "Modifier l’article" : "Nouvel article"}</h2></div>
          <button aria-label="Fermer" className="admin-icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="admin-form-grid">
          <label className="admin-form-wide">Titre<input name="title" onChange={updateField} required value={form.title} /></label>
          <label>Slug<input name="slug" onChange={(event) => { setSlugTouched(true); updateField(event); }} required value={form.slug} /></label>
          <label>Nom du journaliste<input name="author_name" onChange={updateField} value={form.author_name ?? ""} /></label>
          <label>Lieu<input name="location" onChange={updateField} value={form.location ?? ""} /></label>
          <label className="admin-form-wide">Image de couverture (URL)<input name="cover_image_url" onChange={updateField} value={form.cover_image_url ?? ""} /></label>
          <div className="admin-form-wide"><MediaUploadControl kind="image" onUploaded={(url) => setForm((current) => ({ ...current, cover_image_url: url }))} onUploadingChange={onUploadingChange} /></div>
          {form.cover_image_url && (
            <p className="admin-notice admin-form-wide" role="status">
              {form.status === "published" ? "Photo enregistrée avec l’article publié." : "Photo importée et prête ; elle restera associée à l’article jusqu’à sa publication."}
            </p>
          )}
          <label className="admin-form-wide">Légende de la photo<input name="cover_image_caption" onChange={updateField} value={form.cover_image_caption ?? ""} /></label>
          <label>Statut
            <select name="status" onChange={updateField} value={form.status}>
              <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
            </select>
          </label>
          <label>
            Rattacher à une rubrique existante
            <select name="menu_section" onChange={updateField} value={form.menu_section ?? ""}>
              <option value="">Aucune rubrique</option>
              {mainMenuSections.map((section) => <option key={section.slug} value={section.slug}>{section.label}</option>)}
            </select>
          </label>
          <label className="admin-toggle-field">
            <input checked={form.show_on_home ?? false} name="show_on_home" onChange={(event) => setForm((current) => ({
              ...current,
              show_on_home: event.target.checked,
            }))} type="checkbox" />
            Afficher dans les dernières actualités de l’accueil
          </label>
          <label className="admin-toggle-field">
            <input checked={form.featured_on_home ?? false} name="featured_on_home" onChange={(event) => setForm((current) => ({
              ...current,
              featured_on_home: event.target.checked,
            }))} type="checkbox" />
            Fixer dans le grand cadre « À la une »
          </label>
          <label className="admin-toggle-field">
            <input checked={form.show_as_reportage ?? false} name="show_as_reportage" onChange={(event) => setForm((current) => ({ ...current, show_as_reportage: event.target.checked }))} type="checkbox" />
            Ajouter aux bulles « Reportages » de l’accueil
          </label>
          <div className="admin-form-wide admin-excerpt-field">
            <label htmlFor="article-excerpt">Chapeau</label>
            <textarea id="article-excerpt" name="excerpt" onChange={updateField} ref={excerptRef} rows={2} value={form.excerpt ?? ""} />
            <div className="admin-excerpt-tools">
              <p>Générez un résumé à partir du titre et du contenu de l’article.</p>
              <button aria-label="Mettre en gras le texte sélectionné du chapeau" className="admin-secondary-button" onClick={insertExcerptFormatting} type="button"><Bold size={15} /> Gras</button>
              <button
                className="admin-secondary-button admin-generate-summary"
                disabled={summaryBusy || busy || !form.title.trim() || form.content.trim().length < 40}
                onClick={generateSummary}
                type="button"
              >
                {summaryBusy ? <LoaderCircle className="admin-summary-spinner" size={15} /> : <Sparkles size={15} />}
                {summaryBusy ? "Génération…" : "Générer avec l’IA"}
              </button>
            </div>
            {summaryError && <p className="admin-alert admin-summary-error" role="alert">{summaryError}</p>}
          </div>
          <div className="admin-form-wide admin-article-content">
            <label htmlFor="article-content">Corps de l’article</label>
            <div className="admin-format-toolbar" aria-label="Mise en forme du texte">
              <button aria-label="Gras" onClick={() => insertFormatting("**")} type="button"><Bold size={16} /></button>
              <button aria-label="Italique" onClick={() => insertFormatting("*")} type="button"><Italic size={16} /></button>
              <button onClick={() => insertFormatting("\n## ", "\n")} type="button"><Heading2 size={16} /> Intertitre</button>
              <button onClick={() => insertFormatting("\n> ", "\n")} type="button"><Quote size={16} /> Exergue</button>
            </div>
            <MediaUploadControl kind="image" onUploaded={insertImage} onUploadingChange={onUploadingChange} />
            <textarea className="admin-content-field" id="article-content" name="content" onChange={updateField} ref={contentRef} rows={10} value={form.content ?? ""} />
            <p className="admin-muted">Importez une photo pour l’insérer dans l’article. Le texte sélectionné sert de texte alternatif et de légende sous la photo.</p>
          </div>
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" onClick={onClose} type="button">Annuler</button>
          <button className="admin-primary-button" disabled={busy || uploadCount > 0} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

function emptyContentItem(kind) {
  if (kind === "video") {
    return {
      title: "",
      slug: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      duration_seconds: "",
      category: "",
      featured_position: "",
      status: "published",
    };
  }
  if (kind === "event") {
    return {
      title: "",
      slug: "",
      description: "",
      category: "",
      venue: "",
      city: "",
      starts_at: "",
      ends_at: "",
      ticket_url: "",
      image_url: "",
      featured_position: "",
      status: "draft",
    };
  }
  return { category: "", icon: "lightbulb", title: "", copy: "", position: 0, status: "published" };
}

function emptyReportage() {
  return {
    title: "",
    slug: "",
    category: "",
    author_name: "",
    image_url: "",
    image_description: "",
    content: "",
    position: 0,
    show_on_home: true,
    status: "draft",
  };
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ContentEditor({ kind, item, onClose, onSave, busy, error }) {
  const [form, setForm] = useState(() => ({
    ...emptyContentItem(kind),
    ...(item ?? {}),
    ...(kind === "event" && item
      ? { starts_at: localDateTime(item.starts_at), ends_at: localDateTime(item.ends_at) }
      : {}),
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(item?.id));
  const [uploadCount, setUploadCount] = useState(0);
  const [videoValidationError, setVideoValidationError] = useState("");
  const onUploadingChange = (isUploading) => setUploadCount((count) => count + (isUploading ? 1 : -1));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === "title" && !slugTouched) updated.slug = slugifyContent(value);
      return updated;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (kind === "video") {
      setVideoValidationError("");
      try {
        await assertVerticalVideo(form.video_url);
      } catch (validationError) {
        setVideoValidationError(validationError instanceof Error
          ? validationError.message
          : "Impossible de vérifier le format de la vidéo.");
        return;
      }
    }
    const values = { ...form };
    if (kind === "event") {
      values.starts_at = new Date(form.starts_at).toISOString();
      values.ends_at = form.ends_at ? new Date(form.ends_at).toISOString() : null;
    }
    if (await onSave(kind, values)) onClose();
  }

  const isVideo = kind === "video";
  const isEvent = kind === "event";
  const title = isVideo ? "vidéo" : isEvent ? "événement" : "info rapide";

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-editor-modal" onSubmit={submit}>
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">{item?.id ? "Modification" : "Création"}</p><h2>{item?.id ? `Modifier ${title}` : `Ajouter ${title}`}</h2></div>
          <button aria-label="Fermer" className="admin-icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="admin-form-grid">
          {isEvent || isVideo ? (
            <>
              <label className="admin-form-wide">Titre<input name="title" onChange={updateField} required value={form.title} /></label>
              <label>Slug<input name="slug" onChange={(event) => { setSlugTouched(true); updateField(event); }} required value={form.slug} /></label>
            </>
          ) : (
            <>
              <label>Catégorie<input name="category" onChange={updateField} required value={form.category} /></label>
              <label>Icône
                <select name="icon" onChange={updateField} value={form.icon}>
                  {quickInfoIcons.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                </select>
              </label>
              <label className="admin-form-wide">Titre<input name="title" onChange={updateField} required value={form.title} /></label>
              <label className="admin-form-wide">Texte<textarea name="copy" onChange={updateField} required rows={3} value={form.copy} /></label>
              <label>Ordre d’affichage<input min={0} name="position" onChange={updateField} required type="number" value={form.position} /></label>
              <label>Statut
                <select name="status" onChange={updateField} value={form.status}>
                  <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
                </select>
              </label>
            </>
          )}
          {isVideo && (
            <>
              <label>Catégorie<input name="category" onChange={updateField} value={form.category ?? ""} /></label>
              <label>Durée (secondes)<input min={1} name="duration_seconds" onChange={updateField} type="number" value={form.duration_seconds ?? ""} /></label>
              <label className="admin-form-wide">Vidéo (URL)<input name="video_url" onChange={updateField} required type="url" value={form.video_url ?? ""} /></label>
              <div className="admin-form-wide"><MediaUploadControl kind="video" onUploaded={(url) => setForm((current) => ({ ...current, video_url: url }))} onUploadingChange={onUploadingChange} /></div>
              {videoValidationError && <p className="admin-alert admin-form-wide" role="alert">{videoValidationError}</p>}
              <label className="admin-form-wide">Image miniature (URL)<input name="thumbnail_url" onChange={updateField} type="url" value={form.thumbnail_url ?? ""} /></label>
              <div className="admin-form-wide"><MediaUploadControl kind="image" onUploaded={(url) => setForm((current) => ({ ...current, thumbnail_url: url }))} onUploadingChange={onUploadingChange} /></div>
              <div className="admin-form-wide">
                <VideoThumbnailCreator
                  onCreated={(url) => setForm((current) => ({ ...current, thumbnail_url: url }))}
                  onUploadingChange={onUploadingChange}
                  videoUrl={form.video_url}
                />
              </div>
              <label className="admin-form-wide">Description<textarea name="description" onChange={updateField} rows={2} value={form.description ?? ""} /></label>
              <label>Position parmi les trois vidéos mises en avant
                <select name="featured_position" onChange={updateField} value={form.featured_position ?? ""}>
                  <option value="">Aucune</option><option value="1">1 — Vidéo du moment</option><option value="2">2 — Deuxième</option><option value="3">3 — Troisième</option>
                </select>
              </label>
              <label>Statut
                <select name="status" onChange={updateField} value={form.status}>
                  <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
                </select>
              </label>
              <p className="admin-muted admin-form-wide">Seules les vidéos verticales publiées apparaissent sur le site. Les formats MP4, WebM et MOV sont acceptés ; le MP4 est recommandé pour une lecture compatible avec la plupart des navigateurs.</p>
            </>
          )}
          {isEvent && (
            <>
              <label>Catégorie<input name="category" onChange={updateField} value={form.category ?? ""} /></label>
              <label>Début<input name="starts_at" onChange={updateField} required type="datetime-local" value={form.starts_at ?? ""} /></label>
              <label>Fin<input name="ends_at" onChange={updateField} type="datetime-local" value={form.ends_at ?? ""} /></label>
              <label>Lieu<input name="venue" onChange={updateField} value={form.venue ?? ""} /></label>
              <label>Ville<input name="city" onChange={updateField} value={form.city ?? ""} /></label>
              <label className="admin-form-wide">Lien billetterie<input name="ticket_url" onChange={updateField} type="url" value={form.ticket_url ?? ""} /></label>
              <label className="admin-form-wide">Image (URL)<input name="image_url" onChange={updateField} type="url" value={form.image_url ?? ""} /></label>
              <div className="admin-form-wide"><MediaUploadControl kind="image" onUploaded={(url) => setForm((current) => ({ ...current, image_url: url }))} onUploadingChange={onUploadingChange} /></div>
              <label className="admin-form-wide">Description<textarea name="description" onChange={updateField} rows={2} value={form.description ?? ""} /></label>
              <label>Position dans les bulles à la une
                <select name="featured_position" onChange={updateField} value={form.featured_position ?? ""}>
                  <option value="">Aucune (sélection automatique)</option>
                  <option value="1">1 — Première bulle</option>
                  <option value="2">2 — Deuxième bulle</option>
                  <option value="3">3 — Troisième bulle</option>
                </select>
              </label>
              <label>Statut
                <select name="status" onChange={updateField} value={form.status}>
                  <option value="draft">Brouillon</option><option value="published">Publié</option><option value="cancelled">Annulé</option>
                </select>
              </label>
            </>
          )}
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" onClick={onClose} type="button">Annuler</button>
          <button className="admin-primary-button" disabled={busy || uploadCount > 0} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

function ReportageEditor({ reportage, onClose, onSave, busy, error }) {
  const [form, setForm] = useState({ ...emptyReportage(), ...reportage });
  const [slugTouched, setSlugTouched] = useState(Boolean(reportage.id));
  const [uploadCount, setUploadCount] = useState(0);
  const onUploadingChange = (isUploading) => setUploadCount((count) => count + (isUploading ? 1 : -1));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === "title" && !slugTouched) updated.slug = slugifyContent(value);
      return updated;
    });
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-editor-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">{reportage.id ? "Modification" : "Création"}</p><h2>{reportage.id ? "Modifier le reportage" : "Nouveau reportage"}</h2></div>
          <button aria-label="Fermer" className="admin-icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="admin-form-grid">
          <label className="admin-form-wide">Titre<input name="title" onChange={updateField} required value={form.title} /></label>
          <label>Slug<input name="slug" onChange={(event) => { setSlugTouched(true); updateField(event); }} required value={form.slug} /></label>
          <label>Catégorie<input name="category" onChange={updateField} required value={form.category} /></label>
          <label>Auteur<input name="author_name" onChange={updateField} required value={form.author_name} /></label>
          <label>Ordre des bulles<input min={0} name="position" onChange={updateField} required type="number" value={form.position} /></label>
          <label className="admin-form-wide">Image (URL)<input name="image_url" onChange={updateField} type="url" value={form.image_url ?? ""} /></label>
          <div className="admin-form-wide"><MediaUploadControl kind="image" onUploaded={(url) => setForm((current) => ({ ...current, image_url: url }))} onUploadingChange={onUploadingChange} /></div>
          <label className="admin-form-wide">Description de l’image<input name="image_description" onChange={updateField} value={form.image_description ?? ""} /></label>
          <label className="admin-form-wide">Texte du reportage<textarea className="admin-content-field" name="content" onChange={updateField} required rows={10} value={form.content} /></label>
          <label>Statut
            <select name="status" onChange={updateField} value={form.status}>
              <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
            </select>
          </label>
          <label className="admin-toggle-field">
            <input checked={form.show_on_home} name="show_on_home" onChange={(event) => setForm((current) => ({ ...current, show_on_home: event.target.checked }))} type="checkbox" />
            Afficher dans les bulles de la page d’accueil
          </label>
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" onClick={onClose} type="button">Annuler</button>
          <button className="admin-primary-button" disabled={busy || uploadCount > 0} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

function ReportagesView({ items, busy, error, onSave, onDelete }) {
  const [editor, setEditor] = useState(null);
  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">Publication</p><h2>Gérer les reportages</h2></div>
          <button className="admin-primary-button" onClick={() => setEditor(emptyReportage())} type="button"><Plus size={16} /> Ajouter</button>
        </div>
        <p className="admin-muted">Les reportages publiés peuvent apparaître dans les bulles de la page d’accueil. Les brouillons restent masqués.</p>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        {!items.length ? <p className="admin-empty">Aucun reportage enregistré.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Titre</th><th>Catégorie</th><th>Accueil</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong><span className="admin-table-subtitle">/{item.slug}</span></td>
                  <td>{item.category}</td>
                  <td>{item.show_on_home ? `Bulle ${item.position + 1}` : "Masqué"}</td>
                  <td><StatusBadge status={item.status}>{articleStatusLabels[item.status] ?? item.status}</StatusBadge></td>
                  <td><div className="admin-row-actions">
                    <button aria-label={`Modifier ${item.title}`} onClick={() => setEditor({ ...item })} type="button"><FileText size={16} /></button>
                    <button aria-label={`Supprimer ${item.title}`} className="admin-danger-icon" onClick={() => onDelete(item)} type="button"><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      {editor && <ReportageEditor reportage={editor} busy={busy} error={error} onClose={() => setEditor(null)} onSave={async (values) => { if (await onSave(values)) setEditor(null); }} />}
    </>
  );
}

function ContentManagerView({ kind, items, onSave, onDelete, busy, error }) {
  const [editor, setEditor] = useState(null);
  const isVideo = kind === "video";
  const isEvent = kind === "event";
  const label = isVideo ? "vidéo" : isEvent ? "événement" : "info rapide";
  const pluralLabel = isVideo ? "Vidéos" : isEvent ? "Événements" : "Infos rapides";

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="admin-eyebrow">Publication</p><h2>Gérer {pluralLabel.toLocaleLowerCase("fr")}</h2></div>
          <button className="admin-primary-button" onClick={() => setEditor(emptyContentItem(kind))} type="button"><Plus size={16} /> Ajouter</button>
        </div>
        <p className="admin-muted">
          {isVideo
            ? "Importez uniquement des vidéos verticales MP4, WebM ou MOV (jusqu’à 1 Go, dans la limite de votre forfait Supabase ; 50 Mo maximum sur le forfait gratuit), puis choisissez jusqu’à trois positions de mise en avant."
            : isEvent
              ? "Les événements publiés à venir apparaissent dans les bulles de la page d’accueil."
              : "Les infos rapides publiées apparaissent dans la pile de cartes de la page d’accueil."}
        </p>
        {!items.length ? <p className="admin-empty">Aucun contenu enregistré.</p> : (
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Titre</th><th>Détail</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong><span className="admin-table-subtitle">/{item.slug ?? item.id}</span></td>
                <td>{isVideo
                  ? item.featured_position ? `Mise en avant ${item.featured_position}/3` : item.category || "Non classée"
                  : isEvent
                    ? `${item.featured_position ? `Bulle ${item.featured_position} · ` : ""}${formatDate(item.starts_at)} · ${[item.venue, item.city].filter(Boolean).join(", ")}`
                    : `${item.category} · position ${item.position}`}</td>
                <td><StatusBadge status={item.status}>{item.status === "published" ? "Publié" : item.status === "cancelled" ? "Annulé" : articleStatusLabels[item.status] ?? item.status}</StatusBadge></td>
                <td><div className="admin-row-actions">
                  <button aria-label={`Modifier ${label} ${item.title}`} onClick={() => setEditor(item)} type="button"><FileText size={16} /></button>
                  <button aria-label={`Supprimer ${label} ${item.title}`} className="admin-danger-icon" onClick={() => onDelete(kind, item)} type="button"><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {editor && (
        <ContentEditor
          busy={busy}
          item={editor.id ? editor : null}
          kind={kind}
          onClose={() => setEditor(null)}
          onSave={onSave}
          error={error}
        />
      )}
    </>
  );
}

function CommentsView({ comments, onModerate, onDelete }) {
  if (!comments.length) return <p className="admin-empty admin-panel">Aucun commentaire à afficher.</p>;
  return (
    <div className="admin-comment-list">
      {comments.map((comment) => (
        <article className="admin-comment-card" key={comment.id}>
          <div className="admin-comment-topline">
            <div><strong>{comment.author_name}</strong><span>{comment.author_email || "E-mail non renseigné"}</span></div>
            <StatusBadge status={comment.status}>{commentStatusLabels[comment.status]}</StatusBadge>
          </div>
          <p className="admin-comment-content">{comment.content}</p>
          <div className="admin-comment-footer">
            <span>{comment.articles?.title ?? "Article supprimé"} · {formatDate(comment.created_at)}</span>
            <div className="admin-row-actions">
              {comment.status !== "approved" && <button aria-label="Approuver le commentaire" onClick={() => onModerate(comment.id, "approved")} type="button"><Check size={16} /></button>}
              {comment.status !== "rejected" && <button aria-label="Refuser le commentaire" className="admin-danger-icon" onClick={() => onModerate(comment.id, "rejected")} type="button"><X size={16} /></button>}
              <button aria-label="Supprimer le commentaire" className="admin-danger-icon" onClick={() => onDelete(comment)} type="button"><Trash2 size={16} /></button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProfileView({ profile, onSave, busy }) {
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setEmail(profile?.email ?? "");
  }, [profile]);

  function save(event) {
    event.preventDefault();
    onSave({ fullName: fullName.trim(), email: email.trim(), password });
  }

  return (
    <form className="admin-panel admin-profile-form" onSubmit={save}>
      <div className="admin-panel-heading"><div><p className="admin-eyebrow">Vos informations</p><h2>Mon profil</h2></div><StatusBadge status="approved">{profile?.role === "admin" ? "Administrateur" : "Éditeur"}</StatusBadge></div>
      <label>Nom affiché<input autoComplete="name" onChange={(event) => setFullName(event.target.value)} value={fullName} /></label>
      <label>Adresse e-mail<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
      <label>Nouveau mot de passe <span className="admin-muted">(facultatif, 8 caractères minimum)</span><input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
      <p className="admin-muted">La modification de l’adresse e-mail peut nécessiter une confirmation envoyée par Supabase.</p>
      <button className="admin-primary-button" disabled={busy} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer le profil"}</button>
    </form>
  );
}

function getAccountIdentifier(account) {
  return account.email || account.phone || `Compte ${account.id.slice(0, 8)}`;
}

function AccountsView({ accounts, currentUserId, onInvite, onRoleChange, onDelete, busy }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const adminAccessCount = accounts.filter((account) => account.role).length;

  function invite(event) {
    event.preventDefault();
    onInvite({ email, role }, () => setEmail(""));
  }

  return (
    <>
      <form className="admin-panel admin-invite-form" onSubmit={invite}>
        <div><p className="admin-eyebrow">Équipe</p><h2>Inviter un compte</h2><p className="admin-muted">Supabase enverra une invitation. Pour un utilisateur Auth déjà existant, attribuez son rôle dans la liste ci-dessous.</p></div>
        <label>Adresse e-mail<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label>Rôle<select onChange={(event) => setRole(event.target.value)} value={role}><option value="editor">Éditeur</option><option value="admin">Administrateur</option></select></label>
        <button className="admin-primary-button" disabled={busy} type="submit"><Mail size={16} /> Envoyer l’invitation</button>
      </form>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="admin-eyebrow">Supabase Auth</p>
            <h2>Comptes d’authentification</h2>
            <p className="admin-muted">Tous les comptes Auth sont listés. Seuls ceux avec un rôle ont accès à l’administration.</p>
          </div>
          <span className="admin-muted">{accounts.length} compte{accounts.length > 1 ? "s" : ""} · {adminAccessCount} accès admin</span>
        </div>
        {!accounts.length ? <p className="admin-empty">Aucun compte Supabase Auth.</p> : (
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Compte</th><th>Création</th><th>Dernière connexion</th><th>Accès au site</th><th>Actions</th></tr></thead>
            <tbody>{accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <strong>{getAccountIdentifier(account)}</strong>
                  <span className="admin-table-subtitle">
                    {account.email
                      ? account.confirmed ? "E-mail confirmé" : "E-mail non confirmé"
                      : account.phone
                        ? account.confirmed ? "Téléphone confirmé" : "Téléphone non confirmé"
                        : "Compte Supabase Auth"}
                  </span>
                </td>
                <td>{formatDate(account.createdAt)}</td><td>{formatDate(account.lastSignInAt)}</td>
                <td>
                  <select
                    aria-label={`Accès admin de ${getAccountIdentifier(account)}`}
                    disabled={busy || account.id === currentUserId}
                    onChange={(event) => onRoleChange(account.id, event.target.value)}
                    value={account.role ?? "none"}
                  >
                    <option value="none">Aucun accès</option>
                    <option value="editor">Éditeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td>
                  <button
                    aria-label={`Supprimer définitivement ${getAccountIdentifier(account)}`}
                    className="admin-row-button admin-danger-icon"
                    disabled={busy || account.id === currentUserId}
                    onClick={() => onDelete(account)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

function StatisticsView({ data }) {
  const metrics = data?.metrics;
  const categories = useMemo(() => Object.entries(data?.categories ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const maxCount = Math.max(1, ...categories.map(([, count]) => count));
  return (
    <>
      <div className="admin-metric-grid">
        <MetricCard label="Total articles" value={metrics?.articles} detail={`${metrics?.publishedArticles ?? 0} publiés`} Icon={FileText} />
        <MetricCard label="Commentaires" value={metrics?.comments} detail={`${metrics?.pendingComments ?? 0} en attente`} Icon={MessageSquare} />
        <MetricCard label="Comptes équipe" value={metrics?.accounts} detail="Rôles administrateur et éditeur" Icon={Users} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Répartition</p><h2>Articles par rubrique</h2></div><ArrowDownToLine size={19} /></div>
        {categories.length ? <div className="admin-stat-bars">{categories.map(([category, count]) => (
          <div className="admin-stat-row" key={category}>
            <span>{category}</span><div className="admin-stat-track"><span style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }} /></div><strong>{count}</strong>
          </div>
        ))}</div> : <p className="admin-empty">Aucune donnée d’article à afficher.</p>}
        <p className="admin-muted admin-stat-note">Les statistiques reflètent les données actuellement enregistrées dans Supabase.</p>
      </section>
    </>
  );
}

function DailyFactEditor({ dailyFact, onSave, busy, error }) {
  const [form, setForm] = useState({ value: "", suffix: "", description: "", ...dailyFact });

  useEffect(() => {
    setForm({ value: "", suffix: "", description: "", ...dailyFact });
  }, [dailyFact]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><p className="admin-eyebrow">Accueil</p><h2>Modifier le chiffre du jour</h2></div>
      </div>
      <form className="admin-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <label>Chiffre<input maxLength={60} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} required value={form.value} /></label>
        <label>Unité ou précision<input maxLength={60} onChange={(event) => setForm((current) => ({ ...current, suffix: event.target.value }))} value={form.suffix} /></label>
        <label className="admin-form-wide">Texte d’accompagnement<textarea maxLength={240} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required rows={3} value={form.description} /></label>
        {error && <p className="admin-alert admin-form-wide" role="alert">{error}</p>}
        <div className="admin-modal-actions admin-form-wide">
          <button className="admin-primary-button" disabled={busy} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </section>
  );
}

function LiveUpdateEditor({ liveUpdate, onSave, busy, error }) {
  const [form, setForm] = useState({
    title: "",
    copy: "",
    link_url: "",
    link_label: "Suivre l’actualité",
    is_published: false,
    ...liveUpdate,
  });

  useEffect(() => {
    setForm({
      title: "",
      copy: "",
      link_url: "",
      link_label: "Suivre l’actualité",
      is_published: false,
      ...liveUpdate,
    });
  }, [liveUpdate]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><p className="admin-eyebrow">Accueil</p><h2>Modifier l’information « En direct »</h2></div>
      </div>
      <p className="admin-muted">Une seule information à la fois. Cochez l’option d’affichage pour la publier sur la page d’accueil. Elle remplace alors le contenu de la carte « En direct » sans modifier l’article « À la une ».</p>
      <form className="admin-form-grid" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <label className="admin-form-wide">Titre<input maxLength={120} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} /></label>
        <label className="admin-form-wide">Texte<textarea maxLength={600} onChange={(event) => setForm((current) => ({ ...current, copy: event.target.value }))} rows={5} value={form.copy} /></label>
        <label className="admin-form-wide">Lien facultatif (URL complète)<input maxLength={2048} onChange={(event) => setForm((current) => ({ ...current, link_url: event.target.value }))} type="url" value={form.link_url} /></label>
        <label className="admin-form-wide">Texte du lien<input maxLength={50} onChange={(event) => setForm((current) => ({ ...current, link_label: event.target.value }))} value={form.link_label} /></label>
        <label className="admin-toggle-field admin-form-wide">
          <input checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} type="checkbox" />
          Afficher cette information dans la carte « En direct »
        </label>
        {error && <p className="admin-alert admin-form-wide" role="alert">{error}</p>}
        <div className="admin-modal-actions admin-form-wide">
          <button className="admin-primary-button" disabled={busy} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </section>
  );
}

function AboutUsEditor({ aboutUs, onSave, busy, error }) {
  const [form, setForm] = useState({
    title: "",
    first_name_1: "",
    photo_1_url: "",
    photo_1_alt: "",
    text_1: "",
    first_name_2: "",
    photo_2_url: "",
    photo_2_alt: "",
    text_2: "",
    first_name_3: "",
    photo_3_url: "",
    photo_3_alt: "",
    text_3: "",
    is_published: false,
    ...aboutUs,
  });
  const [uploadCount, setUploadCount] = useState(0);

  useEffect(() => {
    setForm({
      title: "",
      first_name_1: "",
      photo_1_url: "",
      photo_1_alt: "",
      text_1: "",
      first_name_2: "",
      photo_2_url: "",
      photo_2_alt: "",
      text_2: "",
      first_name_3: "",
      photo_3_url: "",
      photo_3_alt: "",
      text_3: "",
      is_published: false,
      ...aboutUs,
    });
  }, [aboutUs]);

  const photos = [
    { number: 1, firstName: "first_name_1", url: "photo_1_url", alt: "photo_1_alt", text: "text_1" },
    { number: 2, firstName: "first_name_2", url: "photo_2_url", alt: "photo_2_alt", text: "text_2" },
    { number: 3, firstName: "first_name_3", url: "photo_3_url", alt: "photo_3_alt", text: "text_3" },
  ];

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><p className="admin-eyebrow">Page d’accueil</p><h2>Qui sommes-nous ?</h2></div>
      </div>
      <p className="admin-muted">Pour chaque personne, renseignez le prénom, la photo et le texte qui apparaîtra sous celle-ci.</p>
      <form className="admin-form-grid" onSubmit={submit}>
        <label className="admin-form-wide">Titre de la section
          <input maxLength={120} name="title" onChange={updateField} required={form.is_published} value={form.title} />
        </label>
        <div className="admin-about-photos admin-form-wide">
          {photos.map(({ number, firstName, url, alt, text }) => (
            <div className="admin-about-photo-field" key={firstName}>
              <h3>Personne 0{number}</h3>
              <label>Prénom<input maxLength={80} name={firstName} onChange={updateField} required={form.is_published} value={form[firstName]} /></label>
              <label>Adresse de la photo<input maxLength={2048} name={url} onChange={updateField} required={form.is_published} type="url" value={form[url]} /></label>
              <MediaUploadControl
                kind="image"
                onUploaded={(uploadedUrl) => setForm((current) => ({ ...current, [url]: uploadedUrl }))}
                onUploadingChange={(isUploading) => setUploadCount((count) => count + (isUploading ? 1 : -1))}
              />
              <label>Description de la photo (accessibilité)
                <input maxLength={160} name={alt} onChange={updateField} value={form[alt]} />
              </label>
              <label>Texte sous la photo
                <textarea maxLength={1200} name={text} onChange={updateField} required={form.is_published} rows={4} value={form[text]} />
              </label>
            </div>
          ))}
        </div>
        <label className="admin-toggle-field admin-form-wide">
          <input checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} type="checkbox" />
          Afficher cette section sur le site
        </label>
        {error && <p className="admin-alert admin-form-wide" role="alert">{error}</p>}
        <div className="admin-modal-actions admin-form-wide">
          <button className="admin-primary-button" disabled={busy || uploadCount > 0} type="submit">
            <Save size={16} />{busy ? "Enregistrement…" : uploadCount > 0 ? "Envoi des photos…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}

function NotesView({ note, onSave, onSummarize, busy }) {
  const [content, setContent] = useState(note?.content ?? "");
  const [summary, setSummary] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    setContent(note?.content ?? "");
  }, [note?.content]);

  async function summarizeNote() {
    setSummaryBusy(true);
    setSummaryError("");
    setSummary("");
    try {
      const result = await onSummarize(content);
      setSummary(result.summary);
    } catch (requestError) {
      setSummaryError(requestError instanceof Error ? requestError.message : "Impossible de résumer cette note.");
    } finally {
      setSummaryBusy(false);
    }
  }

  return (
    <section className="admin-panel admin-note-panel">
      <div className="admin-panel-heading">
        <div><p className="admin-eyebrow">Personnel</p><h2>Mon bloc-notes</h2></div>
        <span className="admin-muted">{note?.updatedAt ? `Enregistré le ${formatDate(note.updatedAt)}` : "Pas encore enregistré"}</span>
      </div>
      <p className="admin-muted">Cette note est privée et sauvegardée dans votre compte. Limite : 20 000 caractères.</p>
      <label className="admin-note-field" htmlFor="admin-note-content">Votre note
        <textarea
          id="admin-note-content"
          maxLength={20000}
          onChange={(event) => {
            setContent(event.target.value);
            setSummary("");
            setSummaryError("");
          }}
          placeholder="Écrivez vos idées, rappels ou éléments à retenir…"
          rows={12}
          value={content}
        />
      </label>
      <div className="admin-note-meta">
        <span>{content.length.toLocaleString("fr-FR")} / 20 000 caractères</span>
      </div>
      <div className="admin-note-actions">
        <button className="admin-primary-button" disabled={busy} onClick={() => onSave(content)} type="button">
          <Save size={16} /> {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button className="admin-secondary-button" disabled={busy || summaryBusy || !content.trim()} onClick={summarizeNote} type="button">
          {summaryBusy ? <LoaderCircle className="admin-summary-spinner" size={15} /> : <Sparkles size={15} />}
          {summaryBusy ? "Résumé en cours…" : "Résumer avec l’IA"}
        </button>
      </div>
      {summaryError && <p className="admin-alert admin-note-error" role="alert">{summaryError}</p>}
      {summary && (
        <div className="admin-note-summary" role="status">
          <p className="admin-eyebrow"><Sparkles size={14} /> Résumé de votre note</p>
          <p>{summary}</p>
        </div>
      )}
    </section>
  );
}

function RssView({
  items,
  category,
  region,
  onCategoryChange,
  onRegionChange,
  onGenerate,
  busy,
}) {
  return (
    <>
      <section className="admin-panel admin-rss-intro">
        <p className="admin-eyebrow">Flux RSS Actu.fr</p>
        <h2>Actualités par rubrique</h2>
        <p className="admin-muted">
          Le flux Actu.fr regroupe l’actualité nationale, régionale et locale. Les cartes affichent les titres et résumés RSS.
          La génération crée une brève originale à partir de ces informations ; le texte intégral et les images ne sont pas repris.
          Le lien source ouvre l’article original sur Actu.fr.
        </p>
      </section>
      <nav className="admin-rss-categories" aria-label="Rubriques Actu.fr">
        {actuCategories.map((item) => (
          <button
            aria-pressed={category === item.id}
            className={category === item.id ? "is-active" : ""}
            key={item.id}
            onClick={() => onCategoryChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      {category === "regions" && (
        <label className="admin-rss-region">
          Choisir une région
          <select onChange={(event) => onRegionChange(event.target.value)} value={region}>
            {actuRegions.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
          </select>
        </label>
      )}
      {!items.length ? (
        <p className="admin-empty admin-panel">Aucun article n’est disponible pour cette rubrique.</p>
      ) : (
        <div className="admin-rss-list">
          {items.map((item, index) => {
            const description = typeof item.description === "string" ? item.description.trim() : "";
            return (
              <article
                className="admin-rss-card"
                key={`${item.link || item.title || "rss-item"}-${index}`}
              >
                <div className="admin-rss-card-heading">
                  <div>
                    <p className="admin-eyebrow">
                      {item.sourceName} · {item.regionLabel || item.categoryLabel}
                      {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
                    </p>
                    <h3>{item.title}</h3>
                  </div>
                  <button
                    className={item.generated ? "admin-secondary-button" : "admin-primary-button"}
                    disabled={busy || item.generated || !description}
                    onClick={() => onGenerate(item)}
                    type="button"
                  >
                    {busy ? <LoaderCircle className="admin-summary-spinner" size={15} /> : item.generated ? <Check size={15} /> : <Sparkles size={15} />}
                    {busy ? "Génération…" : item.generated ? "Déjà généré" : description ? "Générer l’article" : "Résumé absent"}
                  </button>
                </div>
                <p className="admin-rss-description">{description || "Aucun résumé RSS fourni pour cet article."}</p>
                <a className="admin-rss-source-link" href={item.link} rel="noopener noreferrer" target="_blank">
                  Lire sur Actu.fr <ChevronRight size={14} />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function AdminWorkspace({ session, supabase }) {
  const [section, setSection] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [loadedData, setLoadedData] = useState({ key: null, value: null });
  const [busy, setBusy] = useState(false);
  const [loadingSection, setLoadingSection] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [rssCategory, setRssCategory] = useState("all");
  const [rssRegion, setRssRegion] = useState(actuRegions[0].slug);

  const canManageAccounts = profile?.role === "admin";
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || canManageAccounts);
  const rssQueryCategory = section === "rss" ? rssCategory : "";
  const rssQueryRegion = section === "rss" ? rssRegion : "";
  const endpoint = section === "statistics"
    ? "overview"
    : section === "quickInfos"
      ? "quick-infos"
    : section === "aboutUs"
      ? "about-us"
      : section === "liveUpdate"
        ? "live-update"
      : section === "dailyFact"
        ? "daily-fact"
        : section;
  const requestPath = section === "rss"
    ? `rss?category=${encodeURIComponent(rssQueryCategory)}&region=${encodeURIComponent(rssQueryRegion)}`
    : endpoint;
  const dataKey = `${section}:${requestPath}`;
  const data = loadedData.key === dataKey ? loadedData.value : null;

  useEffect(() => {
    let active = true;
    adminRequest("profile")
      .then((result) => { if (active) setProfile(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setLoadingSection(true);
    setError("");
    setNotice("");
    setLoadedData({ key: null, value: null });
    if (section === "profile") {
      adminRequest("profile")
        .then((result) => { if (active) setProfile(result); })
        .catch((requestError) => { if (active) setError(requestError.message); })
        .finally(() => { if (active) setLoadingSection(false); });
      return () => { active = false; };
    }

    adminRequest(requestPath)
      .then((result) => {
        if (!active) return;
        let value;
        if (section === "overview" || section === "statistics") value = result;
        else if (section === "articles") value = result.articles;
        else if (section === "notes") value = result.note;
        else if (section === "comments") value = result.comments;
        else if (section === "accounts") {
          if (!Array.isArray(result.accounts)) {
            throw new Error("La réponse du serveur pour les comptes est invalide.");
          }
          value = result.accounts;
        } else if (section === "videos") value = result.videos;
        else if (section === "events") value = result.events;
        else if (section === "quickInfos") value = result.quickInfos;
        else if (section === "aboutUs") value = result.aboutUs;
        else if (section === "liveUpdate") value = result.liveUpdate;
        else if (section === "dailyFact") value = result.dailyFact;
        else if (section === "reportages") value = result.reportages;
        else if (section === "rss") value = result.items;
        setLoadedData({ key: dataKey, value });
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadingSection(false); });
    return () => { active = false; };
  }, [section, refresh, rssQueryCategory, rssQueryRegion]);

  const refreshSection = useCallback(() => setRefresh((value) => value + 1), []);

  async function runAction(action, successMessage, { refresh = true } = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      if (refresh) refreshSection();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "L’action a échoué.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveArticle(article) {
    const isEditing = Boolean(article.id);
    const saved = await runAction(
      () => adminRequest("articles", { method: isEditing ? "PATCH" : "POST", body: article }),
      isEditing ? "Article modifié." : "Article créé.",
    );
    if (saved) setEditor(null);
  }

  async function saveContent(kind, values) {
    const path = kind === "video" ? "videos" : kind === "event" ? "events" : "quick-infos";
    return runAction(
      () => adminRequest(path, { method: values.id ? "PATCH" : "POST", body: values }),
      `${kind === "video" ? "Vidéo" : kind === "event" ? "Événement" : "Info rapide"} enregistré${kind === "event" ? "" : "e"}.`,
    );
  }

  async function saveReportage(reportage) {
    const isEditing = Boolean(reportage.id);
    return runAction(
      () => adminRequest("reportages", { method: isEditing ? "PATCH" : "POST", body: reportage }),
      isEditing ? "Reportage modifié." : "Reportage créé.",
    );
  }

  async function deleteReportage(reportage) {
    if (!window.confirm(`Supprimer définitivement le reportage « ${reportage.title} » ?`)) return;
    await runAction(
      () => adminRequest("reportages", { method: "DELETE", body: { id: reportage.id } }),
      "Reportage supprimé.",
    );
  }

  async function deleteContent(kind, item) {
    const label = kind === "video" ? "cette vidéo" : kind === "event" ? "cet événement" : "cette info rapide";
    if (!window.confirm(`Supprimer définitivement ${label} « ${item.title} » ?`)) return;
    const path = kind === "video" ? "videos" : kind === "event" ? "events" : "quick-infos";
    await runAction(
      () => adminRequest(path, { method: "DELETE", body: { id: item.id } }),
      "Contenu supprimé.",
    );
  }

  async function saveNote(content) {
    await runAction(async () => {
      const result = await adminRequest("notes", { method: "PUT", body: { content } });
      setLoadedData({ key: dataKey, value: result.note });
    }, "Bloc-notes enregistré.", { refresh: false });
  }

  async function saveDailyFact(values) {
    await runAction(
      () => adminRequest("daily-fact", { method: "PUT", body: values }),
      "Chiffre du jour enregistré.",
    );
  }

  async function saveLiveUpdate(values) {
    await runAction(
      async () => {
        const result = await adminRequest("live-update", { method: "PUT", body: values });
        setLoadedData({ key: dataKey, value: result.liveUpdate });
      },
      "Information « En direct » enregistrée.",
      { refresh: false },
    );
  }

  async function saveAboutUs(values) {
    await runAction(
      async () => {
        const result = await adminRequest("about-us", { method: "PUT", body: values });
        setLoadedData({ key: dataKey, value: result.aboutUs });
      },
      "La section « Qui sommes-nous ? » a été enregistrée.",
      { refresh: false },
    );
  }

  async function summarizeNote(content) {
    return adminRequest("notes/summarize", { method: "POST", body: { content } });
  }

  async function generateRssArticle(item) {
    await runAction(
      () => adminRequest("rss/generate", {
        method: "POST",
        body: { link: item.link, category: item.categoryId, region: item.regionSlug },
      }),
      "Article enregistré en brouillon. Relisez-le avant publication.",
    );
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Supprimer définitivement « ${article.title} » ?`)) return;
    await runAction(() => adminRequest("articles", { method: "DELETE", body: { id: article.id } }), "Article supprimé.");
  }

  async function moderateComment(id, status) {
    await runAction(
      () => adminRequest("comments", { method: "PATCH", body: { id, status } }),
      status === "approved" ? "Commentaire approuvé." : "Commentaire refusé.",
    );
  }

  async function deleteComment(comment) {
    if (!window.confirm(`Supprimer le commentaire de ${comment.author_name} ?`)) return;
    await runAction(() => adminRequest("comments", { method: "DELETE", body: { id: comment.id } }), "Commentaire supprimé.");
  }

  async function saveProfile(values) {
    await runAction(async () => {
      const updates = { data: { full_name: values.fullName } };
      if (values.email !== profile?.email) updates.email = values.email;
      if (values.password) updates.password = values.password;
      const { data: updated, error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) throw updateError;
      setProfile((current) => ({
        ...current,
        email: updated.user.email,
        fullName: updated.user.user_metadata?.full_name ?? values.fullName,
      }));
    }, "Profil enregistré.");
  }

  async function inviteAccount(values, clearEmail) {
    await runAction(async () => {
      await adminRequest("accounts", { method: "POST", body: values });
      clearEmail();
    }, "Invitation envoyée.");
  }

  async function changeAccountRole(id, role) {
    await runAction(() => adminRequest("accounts", { method: "PATCH", body: { id, role } }), "Rôle mis à jour.");
  }

  async function deleteAccount(account) {
    const identifier = getAccountIdentifier(account);
    if (!window.confirm(`Supprimer définitivement le compte Supabase ${identifier} ? Cette action est irréversible.`)) return;
    await runAction(() => adminRequest("accounts", { method: "DELETE", body: { id: account.id } }), "Compte supprimé.");
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(`Impossible de fermer la session : ${signOutError.message}`);
  }

  const heading = navigation.find(({ id }) => id === section)?.label ?? "Administration";
  const profileName = profile?.fullName || profile?.email || session.user.email;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-logo" href="/" aria-label="Retour à RADAR"><Image src="/radar-logo.png" alt="RADAR" width={112} height={76} priority /></Link>
        <p className="admin-sidebar-caption">Administration</p>
        <nav className="admin-sidebar-nav" aria-label="Navigation admin">
          {visibleNavigation.map(({ id, label, Icon }) => (
            <button aria-current={section === id ? "page" : undefined} className={section === id ? "is-active" : ""} key={id} onClick={() => setSection(id)} type="button">
              <Icon size={18} /><span>{label}</span>{id === "comments" && data?.metrics?.pendingComments > 0 && section === "overview" && <span className="admin-nav-count">{data.metrics.pendingComments}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user-chip"><span className="admin-avatar">{profileName.charAt(0).toUpperCase()}</span><span><strong>{profileName}</strong><small>{profile?.role === "admin" ? "Administrateur" : "Éditeur"}</small></span></div>
          <button className="admin-sidebar-signout" onClick={signOut} type="button"><LogOut size={17} /> Déconnexion</button>
          <Link className="admin-back-link" href="/"><ArrowLeft size={15} /> Retour au site</Link>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><p className="admin-eyebrow">RADAR · Administration</p><h1>{heading}</h1></div><span className="admin-online"><span /> Connecté</span></header>
        <div className="admin-content">
          {error && <p className="admin-alert" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          {loadingSection || (!error && loadedData.key !== dataKey)
            ? <div className="admin-loading"><LoaderCircle className="admin-spinner" size={22} /> Chargement…</div> : (
            <>
              {section === "overview" && <OverviewView data={data} onNavigate={setSection} />}
              {section === "articles" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><p className="admin-eyebrow">Publication</p><h2>Articles</h2></div><button className="admin-primary-button" onClick={() => setEditor({ ...emptyArticle, author_name: profile?.fullName ?? "" })} type="button"><Plus size={17} /> Nouvel article</button></div>
                  <ArticleTable articles={data ?? []} onEdit={(article) => setEditor({ ...article })} onDelete={deleteArticle} />
                </section>
              )}
              {section === "reportages" && (
                <ReportagesView
                  busy={busy}
                  error={error}
                  items={data ?? []}
                  onDelete={deleteReportage}
                  onSave={saveReportage}
                />
              )}
              {section === "videos" && <ContentManagerView busy={busy} error={error} items={data ?? []} kind="video" onDelete={deleteContent} onSave={saveContent} />}
              {section === "events" && <ContentManagerView busy={busy} error={error} items={data ?? []} kind="event" onDelete={deleteContent} onSave={saveContent} />}
              {section === "quickInfos" && <ContentManagerView busy={busy} error={error} items={data ?? []} kind="quickInfo" onDelete={deleteContent} onSave={saveContent} />}
              {section === "liveUpdate" && <LiveUpdateEditor busy={busy} error={error} liveUpdate={data} onSave={saveLiveUpdate} />}
              {section === "aboutUs" && <AboutUsEditor aboutUs={data} busy={busy} error={error} onSave={saveAboutUs} />}
              {section === "dailyFact" && <DailyFactEditor busy={busy} dailyFact={data} error={error} onSave={saveDailyFact} />}
              {section === "rss" && (
                <RssView
                  items={data ?? []}
                  category={rssCategory}
                  region={rssRegion}
                  onCategoryChange={setRssCategory}
                  onRegionChange={setRssRegion}
                  onGenerate={generateRssArticle}
                  busy={busy}
                />
              )}
              {section === "notes" && <NotesView note={data} onSave={saveNote} onSummarize={summarizeNote} busy={busy} />}
              {section === "comments" && <CommentsView comments={data ?? []} onModerate={moderateComment} onDelete={deleteComment} />}
              {section === "profile" && <ProfileView profile={profile} onSave={saveProfile} busy={busy} />}
              {section === "accounts" && (canManageAccounts
                ? <AccountsView accounts={data ?? []} currentUserId={session.user.id} onInvite={inviteAccount} onRoleChange={changeAccountRole} onDelete={deleteAccount} busy={busy} />
                : <p className="admin-alert">La gestion des comptes est réservée aux administrateurs.</p>)}
              {section === "statistics" && <StatisticsView data={data} />}
            </>
          )}
        </div>
      </main>
      {editor && <ArticleEditor article={editor} busy={busy} error={error} onClose={() => setEditor(null)} onSave={saveArticle} />}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    let client;
    try {
      client = getSupabaseClient();
      setSupabase(client);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Supabase n’est pas configuré.");
      setLoading(false);
      return undefined;
    }

    let active = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setConfigError(`Impossible de lire la session : ${error.message}`);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <main className="admin-login-page"><div className="admin-loading"><LoaderCircle className="admin-spinner" size={22} /> Vérification de la session…</div></main>;
  }
  if (!supabase) {
    return <AdminLogin supabase={null} configError={configError} />;
  }
  return session
    ? <AdminWorkspace key={session.user.id} session={session} supabase={supabase} />
    : <AdminLogin supabase={supabase} configError={configError} />;
}
