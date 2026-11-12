"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MessageSquare,
  NotebookPen,
  Plus,
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

const navigation = [
  { id: "overview", label: "Vue d’ensemble", Icon: LayoutDashboard },
  { id: "articles", label: "Articles", Icon: FileText },
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
  excerpt: "",
  content: "",
  location: "",
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
        redirectTo: `${window.location.origin}/admin`,
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
        <thead><tr><th>Titre</th><th>Rubrique</th><th>Statut</th><th>Modifié le</th>{!compact && <th>Actions</th>}</tr></thead>
        <tbody>
          {articles.map((article, index) => (
            <tr key={`${article.id || article.slug || article.title || "article"}-${index}`}>
              <td><strong>{article.title}</strong><span className="admin-table-subtitle">/{article.slug}</span></td>
              <td>{article.category}{article.location && <span className="admin-table-subtitle">{article.location}</span>}</td>
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

function ArticleEditor({ article, onClose, onSave, busy }) {
  const [form, setForm] = useState(article);
  const [slugTouched, setSlugTouched] = useState(Boolean(article.id));
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
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
          <label>Rubrique<input name="category" onChange={updateField} required value={form.category} /></label>
          <label>Lieu<input name="location" onChange={updateField} value={form.location ?? ""} /></label>
          <label>Statut
            <select name="status" onChange={updateField} value={form.status}>
              <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
            </select>
          </label>
          <div className="admin-form-wide admin-excerpt-field">
            <label htmlFor="article-excerpt">Chapeau</label>
            <textarea id="article-excerpt" name="excerpt" onChange={updateField} rows={2} value={form.excerpt ?? ""} />
            <div className="admin-excerpt-tools">
              <p>Générez un résumé à partir du titre et du contenu de l’article.</p>
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
          <label className="admin-form-wide">Corps de l’article (Markdown)<textarea className="admin-content-field" name="content" onChange={updateField} rows={10} value={form.content ?? ""} /></label>
        </div>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" onClick={onClose} type="button">Annuler</button>
          <button className="admin-primary-button" disabled={busy} type="submit"><Save size={16} />{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
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

function AccountsView({ accounts, onInvite, onRoleChange, onDelete, busy }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");

  function invite(event) {
    event.preventDefault();
    onInvite({ email, role }, () => setEmail(""));
  }

  return (
    <>
      <form className="admin-panel admin-invite-form" onSubmit={invite}>
        <div><p className="admin-eyebrow">Équipe</p><h2>Inviter un compte</h2><p className="admin-muted">Supabase enverra un e-mail d’invitation à cette adresse.</p></div>
        <label>Adresse e-mail<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label>Rôle<select onChange={(event) => setRole(event.target.value)} value={role}><option value="editor">Éditeur</option><option value="admin">Administrateur</option></select></label>
        <button className="admin-primary-button" disabled={busy} type="submit"><Mail size={16} /> Envoyer l’invitation</button>
      </form>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Accès actifs</p><h2>Comptes de l’équipe</h2></div><span className="admin-muted">{accounts.length} compte{accounts.length > 1 ? "s" : ""}</span></div>
        {!accounts.length ? <p className="admin-empty">Aucun autre compte d’équipe.</p> : (
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Compte</th><th>Inscription</th><th>Dernière connexion</th><th>Rôle</th><th>Actions</th></tr></thead>
            <tbody>{accounts.map((account) => (
              <tr key={account.id}>
                <td><strong>{account.email}</strong><span className="admin-table-subtitle">{account.confirmed ? "E-mail confirmé" : "Invitation à confirmer"}</span></td>
                <td>{formatDate(account.createdAt)}</td><td>{formatDate(account.lastSignInAt)}</td>
                <td><select aria-label={`Rôle de ${account.email}`} disabled={busy} onChange={(event) => onRoleChange(account.id, event.target.value)} value={account.role}><option value="editor">Éditeur</option><option value="admin">Administrateur</option></select></td>
                <td><button aria-label={`Supprimer ${account.email}`} className="admin-row-button admin-danger-icon" disabled={busy} onClick={() => onDelete(account)} type="button"><Trash2 size={16} /></button></td>
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
  const [data, setData] = useState(null);
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
    setData(null);
    if (section === "profile") {
      adminRequest("profile")
        .then((result) => { if (active) setProfile(result); })
        .catch((requestError) => { if (active) setError(requestError.message); })
        .finally(() => { if (active) setLoadingSection(false); });
      return () => { active = false; };
    }

    const endpoint = section === "statistics" ? "overview" : section;
    const requestPath = section === "rss"
      ? `rss?category=${encodeURIComponent(rssQueryCategory)}&region=${encodeURIComponent(rssQueryRegion)}`
      : endpoint;
    adminRequest(requestPath)
      .then((result) => {
        if (!active) return;
        if (section === "overview" || section === "statistics") setData(result);
        else if (section === "articles") setData(result.articles);
        else if (section === "notes") setData(result.note);
        else if (section === "comments") setData(result.comments);
        else if (section === "accounts") setData(result.accounts);
        else if (section === "rss") setData(result.items);
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

  async function saveNote(content) {
    await runAction(async () => {
      const result = await adminRequest("notes", { method: "PUT", body: { content } });
      setData(result.note);
    }, "Bloc-notes enregistré.", { refresh: false });
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
    if (!window.confirm(`Supprimer définitivement le compte ${account.email} ? Cette action est irréversible.`)) return;
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
          {loadingSection ? <div className="admin-loading"><LoaderCircle className="admin-spinner" size={22} /> Chargement…</div> : (
            <>
              {section === "overview" && <OverviewView data={data} onNavigate={setSection} />}
              {section === "articles" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><p className="admin-eyebrow">Publication</p><h2>Articles</h2></div><button className="admin-primary-button" onClick={() => setEditor({ ...emptyArticle })} type="button"><Plus size={17} /> Nouvel article</button></div>
                  <ArticleTable articles={data ?? []} onEdit={(article) => setEditor({ ...article })} onDelete={deleteArticle} />
                </section>
              )}
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
                ? <AccountsView accounts={data ?? []} onInvite={inviteAccount} onRoleChange={changeAccountRole} onDelete={deleteAccount} busy={busy} />
                : <p className="admin-alert">La gestion des comptes est réservée aux administrateurs.</p>)}
              {section === "statistics" && <StatisticsView data={data} />}
            </>
          )}
        </div>
      </main>
      {editor && <ArticleEditor article={editor} busy={busy} onClose={() => setEditor(null)} onSave={saveArticle} />}
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
