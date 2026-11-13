import { createClient } from "@supabase/supabase-js";

let supabase;

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  if (!supabase) {
    supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

async function readRows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`Impossible de charger ${label} : ${error.message}`);
  return data ?? [];
}

export async function getPublishedArticles({ homeOnly = false, reportageOnly = false, menuSection = null } = {}) {
  const client = getPublicClient();
  if (!client) return null;

  let query = client
    .from("articles")
    .select("id, title, slug, excerpt, content, category, location, author_name, cover_image_url, cover_image_caption, tags, status, published_at, show_on_home, featured_on_home, show_as_reportage, menu_section")
    .eq("status", "published")
    .order("featured_on_home", { ascending: false })
    .order("published_at", { ascending: false });

  if (homeOnly) query = query.eq("show_on_home", true);
  if (reportageOnly) query = query.eq("show_as_reportage", true);
  if (menuSection) query = query.eq("menu_section", menuSection);
  return readRows(query, "les articles");
}

export async function getPublishedVideos() {
  const client = getPublicClient();
  if (!client) return null;

  const query = client
    .from("videos")
    .select("id, title, slug, description, video_url, thumbnail_url, duration_seconds, category, featured_position, published_at")
    .eq("status", "published")
    .order("featured_position", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: false });
  return readRows(query, "les vidéos");
}

export async function getPublishedEvents({ all = false } = {}) {
  const client = getPublicClient();
  if (!client) return null;

  let query = client
    .from("events")
    .select("id, title, slug, description, category, venue, city, starts_at, ends_at, ticket_url, image_url, featured_position")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString());
  if (all) {
    query = query.order("starts_at", { ascending: true });
  } else {
    query = query
      .order("featured_position", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: true })
      .limit(3);
  }
  const events = await readRows(query, "les événements");
  if (all) return events;
  const featuredEvents = events.filter((event) => event.featured_position !== null);
  return featuredEvents.length ? featuredEvents : events;
}

export async function getPublishedQuickInfos() {
  const client = getPublicClient();
  if (!client) return null;

  const query = client
    .from("quick_infos")
    .select("id, category, icon, title, copy, position")
    .eq("status", "published")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  return readRows(query, "les infos rapides");
}

export async function getDailyFact() {
  const client = getPublicClient();
  if (!client) return null;

  const { data, error } = await client
    .from("daily_fact")
    .select("value, suffix, description")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Impossible de charger le chiffre du jour : ${error.message}`);
  return data;
}

export async function getPublishedLiveUpdate() {
  const client = getPublicClient();
  if (!client) return null;

  const { data, error } = await client
    .from("live_update")
    .select("title, copy, link_url, link_label")
    .eq("id", 1)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(`Impossible de charger l’information « En direct » : ${error.message}`);
  return data;
}

export async function getPublishedAboutUs() {
  const client = getPublicClient();
  if (!client) return null;

  const { data, error } = await client
    .from("about_us")
    .select("title, first_name_1, photo_1_url, photo_1_alt, text_1, first_name_2, photo_2_url, photo_2_alt, text_2, first_name_3, photo_3_url, photo_3_alt, text_3, first_name_4, photo_4_url, photo_4_alt, text_4")
    .eq("id", 1)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(`Impossible de charger la section « Qui sommes-nous ? » : ${error.message}`);
  return data;
}

export async function getPublishedArticle(slug) {
  const client = getPublicClient();
  if (!client) return null;

  const { data, error } = await client
    .from("articles")
    .select("id, title, slug, excerpt, content, category, location, author_name, cover_image_url, cover_image_caption, published_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Impossible de charger l’article : ${error.message}`);
  return data;
}

export async function getPublishedReportages({ homeOnly = false } = {}) {
  const client = getPublicClient();
  if (!client) return null;

  let query = client
    .from("reportages")
    .select("id, title, slug, category, author_name, image_url, image_description, content, position, show_on_home, published_at")
    .eq("status", "published")
    .order("position", { ascending: true })
    .order("published_at", { ascending: false });
  if (homeOnly) query = query.eq("show_on_home", true);
  return readRows(query, "les reportages");
}
