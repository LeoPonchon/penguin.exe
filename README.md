# penguin.exe

Application de messagerie sociale web inspirée des plateformes communautaires modernes, construite avec **React** et **Supabase**.

Le projet gère l'authentification, les serveurs et canaux, les messages, les amis, les conversations privées et la personnalisation de profil.

## Fonctionnalités

- inscription / connexion ;
- session utilisateur via Supabase ;
- création et affichage de serveurs ;
- canaux de discussion ;
- messagerie ;
- liste d'amis ;
- messages privés ;
- profils utilisateurs ;
- upload d'avatar et de bannière ;
- interface de dashboard/chat.

## Stack

- React 19
- Supabase JS
- date-fns
- Create React App

## Installation

```bash
git clone https://github.com/LeoPonchon/penguin.exe.git
cd penguin.exe
npm install
```

Copiez le fichier de configuration d'exemple :

```bash
cp .env.example .env
```

Sous Windows, créez simplement `.env` à partir de `.env.example`.

Renseignez votre projet Supabase, puis lancez :

```bash
npm start
```

## Build

```bash
npm run build
```

## Architecture

L'application s'organise autour de providers/contextes dédiés à l'authentification, aux serveurs, aux canaux, aux amis, aux messages privés et au chat. `App.js` affiche l'expérience de chat lorsqu'un utilisateur est authentifié et l'écran d'authentification sinon.

## Supabase

La sécurité ne doit pas reposer sur le frontend. Configurez correctement les politiques **Row Level Security (RLS)** côté Supabase pour les tables et buckets utilisés par l'application.
