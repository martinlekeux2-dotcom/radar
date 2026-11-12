# Configuration de l’espace d’administration

1. Dans Supabase, activez **Authentication** et créez le premier utilisateur dans **Authentication → Users**.
2. Exécutez `supabase/schema.sql` dans le **SQL Editor**. Réexécutez-le après les mises à jour du site pour ajouter les champs et tables nécessaires. Il crée le bucket public `radar-media` : l’envoi passe par l’admin, tandis que la lecture des médias est publique. Les vidéos acceptées sont MP4, WebM ou MOV (1 Go maximum, sous réserve de la limite du forfait Supabase) et sont envoyées par morceaux reprenables ; les images sont JPEG, PNG ou WebP (8 Mo maximum).
3. Accordez le rôle administrateur au premier utilisateur en remplaçant l’adresse e-mail ci-dessous :

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'admin'
   from auth.users
   where email = 'admin@exemple.fr'
   on conflict (user_id) do update set role = 'admin';
   ```

4. Configurez les variables dans `.env.local` à partir de `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` et `OPENAI_API_KEY` sont des clés secrètes : elles ne doivent jamais être préfixées par `NEXT_PUBLIC_` ni exposées au navigateur. La clé OpenAI est utilisée uniquement par la route serveur de résumé.
5. Dans **Authentication → URL Configuration**, ajoutez `/admin` et `/admin/reset-password` aux URL de redirection autorisées pour votre environnement local et votre domaine de production.
6. Redémarrez Next.js et ouvrez `/admin`. Le lien **Mot de passe oublié ?** envoie vers `/admin/reset-password`, où le nouveau mot de passe peut être défini après validation du lien par e-mail. **Gestion des comptes** liste tous les utilisateurs de Supabase Auth. Les invitations envoyées depuis cette section créent un utilisateur Auth et lui attribuent le rôle choisi. Les autres comptes Auth restent visibles sans accès à l’administration jusqu’à ce qu’un administrateur leur attribue un rôle. Choisir **Aucun accès** retire le rôle sans supprimer le compte Auth ; l’action de suppression efface définitivement le compte Supabase.
Dans **Articles**, choisissez la catégorie affichée, la rubrique existante du menu principal où l’article doit être listé, et s’il doit aussi apparaître à la une sur l’accueil. Les articles peuvent rester en brouillon ou être publiés. La barre d’outils du corps insère le gras, l’italique, les intertitres et les exergues. Les sections **Vidéos**, **Événements** et **Infos rapides** gèrent les contenus visibles sur la page d’accueil ; une vidéo publiée peut occuper l’une des trois positions mises en avant.

L’espace utilise les articles de `public.articles`, les commentaires de `public.comments` et les blocs-notes privés de `public.admin_notes`. Si la base est déjà configurée, exécutez à nouveau `supabase/schema.sql` pour créer la table du bloc-notes. Les commentaires et les notes sont privés sous RLS et leur accès passe par les routes serveur protégées.

La rubrique **Flux RSS** de l’administration utilise le flux général d’Actu.fr (`https://actu.fr/rss.xml`) et filtre les articles selon leurs catégories RSS et leurs tags régionaux. La génération OpenAI n’utilise que le titre, le résumé et les métadonnées RSS ; le texte intégral et les images ne sont pas récupérés. Elle crée des brouillons structurés avec titre, chapeau, corps Markdown, catégorie, lieu et sources. Si les informations RSS ne suffisent pas à produire au moins 150 mots sans inventer de faits, aucun brouillon n’est créé.
