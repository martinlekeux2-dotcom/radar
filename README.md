# RADAR

Site d'actualite construit avec Next.js. Le projet comprend des routes serveur
pour l'administration, Supabase et la generation de contenu avec OpenAI.

## Hebergement

GitHub sert a stocker le code ; GitHub Pages ne convient pas a ce projet, car il
ne peut pas executer les routes API et le serveur Next.js. Pour mettre le site en
ligne, hebergez le depot GitHub sur Vercel (ou sur un autre hebergeur compatible
avec Next.js et ses routes serveur).

### Deployer avec Vercel

1. Envoyez le code source sur GitHub. `.gitignore` exclut les fichiers `.env*`
   sauf `.env.example`, ainsi que les dependances et fichiers de compilation.
2. Dans Vercel, importez le depot GitHub et laissez la detection Next.js choisir
   la configuration de build par defaut.
3. Dans les parametres du projet Vercel, ajoutez les variables d'environnement
   suivantes pour l'environnement de production (et, si besoin, les previews) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Dans Supabase, configurez l'URL du site en production et les URL de
   redirection autorisees dans les parametres d'authentification.
5. Si necessaire, appliquez `supabase/schema.sql` et suivez
   [le guide de configuration admin](./supabase/ADMIN_SETUP.md).

Ne mettez jamais `.env.local`, une cle de service Supabase ou la cle OpenAI dans
le depot, dans le code ou dans une variable prefixee par `NEXT_PUBLIC_`.
Configurez les valeurs secretes uniquement dans les variables d'environnement
du fournisseur d'hebergement. `.env.example` ne contient que des valeurs
d'exemple ; il sert de modele pour le developpement local.

## Developpement local

Prerequis : Node.js 20.9 ou une version plus recente.

```powershell
npm ci
Copy-Item .env.example .env.local
# Remplacez les valeurs d'exemple dans .env.local par vos propres variables.
npm run dev
```

Le site sera disponible sur `http://localhost:3000`. Ne partagez pas et
n'ajoutez pas `.env.local` au depot.
