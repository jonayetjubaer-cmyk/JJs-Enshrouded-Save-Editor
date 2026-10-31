// Accept legacy Portuguese message keys and English keys from the JJ interface.
// Dictionaries never alter model IDs, file paths, saved bytes, or player names.

import en from './i18n/en.json' with { type: 'json' };
import it from './i18n/it.json' with { type: 'json' };
import fr from './i18n/fr.json' with { type: 'json' };
import de from './i18n/de.json' with { type: 'json' };
import errors from './i18n/errors.json' with { type: 'json' };

export const IDIOMAS = [
  { codigo: 'en', nome: 'English', locale: 'en-US', campo: 'en' },
  { codigo: 'pt-BR', nome: 'Português', locale: 'pt-BR', campo: 'pt' },
  { codigo: 'it', nome: 'Italiano', locale: 'it-IT', campo: 'it', dicionario: it },
  { codigo: 'fr', nome: 'Français', locale: 'fr-FR', campo: 'fr', dicionario: fr },
  { codigo: 'de', nome: 'Deutsch', locale: 'de-DE', campo: 'de', dicionario: de },
];

export const LANGUAGE_STORAGE_KEY = 'enshrouded-save-editor:idioma';
const CHAVE_GUARDADA = LANGUAGE_STORAGE_KEY;
export function detectLanguage(saved, system = '') {
  if (IDIOMAS.some((i) => i.codigo === saved)) return saved;
  const base = system.toLowerCase().split(/[-_]/)[0];
  return IDIOMAS.find((i) => i.codigo.toLowerCase().split('-')[0] === base)?.codigo || 'en';
}

function inicial() {
  try {
    const salvo = localStorage.getItem(CHAVE_GUARDADA);
    if (salvo && IDIOMAS.some((i) => i.codigo === salvo)) return salvo;
  } catch { /* navegador sem armazenamento: segue no padrão */ }
  // Detect the system language on first launch; a saved choice takes precedence.
  const sistema = (typeof navigator !== 'undefined' && navigator.language) || '';
  return detectLanguage(null, sistema);
}

let atual = inicial();
const ouvintes = new Set();

export const idiomaAtual = () => atual;
export const localeAtual = () => IDIOMAS.find((i) => i.codigo === atual)?.locale ?? 'pt-BR';

// Game names/descriptions are the game's own localization, stored separately
// from editor messages. Never translate identifiers used by the save format.
export const campoDeNome = () => IDIOMAS.find((i) => i.codigo === atual)?.campo || 'en';
const reverse = Object.fromEntries(Object.entries(en).map(([pt, english]) => [english, pt]));

// o `lang` do documento guia leitor de tela, hifenização e correção ortográfica dos campos
function marcarNoDocumento() {
  if (typeof document !== 'undefined') document.documentElement.lang = localeAtual();
}
marcarNoDocumento();

export function definirIdioma(codigo) {
  if (!IDIOMAS.some((i) => i.codigo === codigo) || codigo === atual) return;
  atual = codigo;
  try { localStorage.setItem(CHAVE_GUARDADA, codigo); } catch { /* sem armazenamento: vale só nesta sessão */ }
  marcarNoDocumento();
  for (const f of ouvintes) f(codigo);
}

export function assinarIdioma(f) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** t('nível {n}', { n: 5 }). Sem tradução, devolve a própria chave. */
export function t(texto, vars) {
  if (typeof texto !== 'string') return texto;
  const dic = IDIOMAS.find((i) => i.codigo === atual)?.dicionario;
  const canonical = en[texto] || errors[texto] || texto;
  const translated = atual === 'pt-BR' ? reverse[canonical] || texto : dic?.[canonical] || canonical;
  // Interpolate once: braces in a character name or path must remain literal.
  return translated.replace(/\{([^{}]+)\}/g, (match, key) => vars && Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

export function tn(one, many, count, vars = {}) {
  return t(new Intl.PluralRules(localeAtual()).select(count) === 'one' ? one : many, { v0: count, ...vars });
}

const errorPatterns = Object.entries(errors).filter(([key]) => key.includes('{detail}')).map(([key, value]) => ({
  pattern: new RegExp('^' + key.split('{detail}').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]+)') + '$'), value,
}));
export function displayError(error) {
  const text = error?.message || String(error);
  for (const { pattern, value } of errorPatterns) { const match = text.match(pattern); if (match) return t(value, { detail: match[1] }); }
  return t(text);
}

export const dataHora = (ms) => new Date(ms).toLocaleString(localeAtual());
export const hora = (ms) => new Date(ms).toLocaleTimeString(localeAtual());
