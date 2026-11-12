# Configuration de l’espace d’administration

1. Dans Supabase, activez **Authentication** et créez le premier utilisateur dans **Authentication → Users**.
2. Exécutez `supabase/schema.sql` dans le **SQL Editor**.
3. Accordez le rôle administrateur au premier utilisateur en remplaçant l’adresse e-mail ci-dessous :

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'admin'
   from auth.users
   where email = 'admin@exemple.fr'
   on conflict (user_id) do update set role = 'admin';
   ```

4. Configurez les variables dans `.env.local` à partir de `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` et `OPENAI_API_KEY` sont des clés secrètes : elles ne doivent jamais être préfixées par `NEXT_PUBLIC_` ni exposées au navigateur. La clé OpenAI est utilisée uniquement par la route serveur de résumé.
5. Dans **Authentication → URL Configuration**, ajoutez `/admin` aux URL de redirection autorisées pour votre environnement local et votre domaine de production.
6. Redémarrez Next.js et ouvrez `/admin`. Les comptes ajoutés dans **Gestion des comptes** reçoivent une invitation Supabase. Seuls les comptes présents dans `admin_users` peuvent accéder à l’administration.

L’espace utilise les articles de `public.articles`, les commentaires de `public.comments` et les blocs-notes privés de `public.admin_notes`. Si la base est déjà configurée, exécutez à nouveau `supabase/schema.sql` pour créer la table du bloc-notes. Les commentaires et les notes sont privés sous RLS et leur accès passe par les routes serveur protégées.

La rubrique **Flux RSS** de l’administration utilise le flux général d’Actu.fr (`https://actu.fr/rss.xml`) et filtre les articles selon leurs catégories RSS et leurs tags régionaux. La génération OpenAI n’utilise que le titre, le résumé et les métadonnées RSS ; le texte intégral et les images ne sont pas récupérés. Elle crée des brouillons structurés avec titre, chapeau, corps Markdown, catégorie, lieu et sources. Si les informations RSS ne suffisent pas à produire au moins 150 mots sans inventer de faits, aucun brouillon n’est créé.
