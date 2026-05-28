export const APP_NAME = 'PluvioApp';

// Behavior tags for precipitation types
export const BEHAVIOR_TAGS = ['granizo', 'lluvia_torrencial', 'lluvias_intermitentes', 'vientos_muy_fuertes'] as const;

export const TANK_DEFAULT_LIMITS = {
  day: 50,
  month: 300,
  semester: 1000,
} as const;

export const ANALYTICS_DEFAULTS = {
  drySeasonThresholdMm: 60,
} as const;

export const HELP_VIDEO_URL = 'https://example.com/pluvioapp-tutorial.mp4';

export const FAQ_ITEMS = [
  {
    id: 'faq-1',
    title: '¿Cómo registro una medición?',
    content:
      'Ve a Registro, ajusta fecha/hora si aplica, ingresa volumen o marca “No llovió hoy”, revisa el cálculo en mm y guarda.',
  },
  {
    id: 'faq-2',
    title: '¿Qué pasa si estoy sin conexión?',
    content:
      'La app guarda primero en SQLite local. Cuando vuelve la conexión, sincroniza automáticamente con Supabase.',
  },
  {
    id: 'faq-3',
    title: '¿Por qué no veo datos en mi dashboard?',
    content:
      'Si tu cuenta está pendiente o inactiva, el acceso está restringido. También verifica que tu pluviómetro esté configurado.',
  },
] as const;

export const BEHAVIOR_OPTIONS = [
  'granizo',
  'lluvia_torrencial',
  'lluvias_intermitentes',
  'incendio',
] as const;
