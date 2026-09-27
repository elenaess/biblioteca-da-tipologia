// Public client configuration. Access is enforced by Supabase Auth and RLS.
// Never put service-role keys or OAuth client secrets in this file.
export const projectConfig = {
  supabaseUrl: "https://ghendeqnxybayhzhsjgz.supabase.co",
  supabasePublishableKey: "sb_publishable_viEiVYReiibxFFdN_qALZA_x1eQYWYa",
  webUrl: "https://elenaess.github.io/biblioteca-da-tipologia/",
  mobileRedirectUrl: "bibliotecadatipologia://auth/callback",
} as const;
