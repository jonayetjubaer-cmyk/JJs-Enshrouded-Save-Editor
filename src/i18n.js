// Tradução da interface.
//
// A chave é o próprio texto em português. Isso tem duas consequências boas: o português não precisa
// de arquivo de tradução, e um texto sem tradução aparece em português em vez de aparecer como
// "menu.botao.salvar" na tela. A consequência ruim é que mudar o texto em português quebra a chave —
// quando isso acontecer, atualize a chave nos arquivos de idioma.
//
// PARA CONTRIBUIR COM UM IDIOMA
//
// 1. copie `src/i18n/en.json` para `src/i18n/<código>.json` (ex.: `es.json`, `de.json`)
// 2. traduza os valores, deixando as chaves em português intactas
// 3. mantenha os marcadores `{assim}` no lugar: eles são substituídos por números e nomes
// 4. registre o idioma em IDIOMAS, abaixo
//
// Chave que você não traduzir pode ficar de fora do arquivo; ela cai no português.

import en from './i18n/en.json';

export const IDIOMAS = [
  { codigo: 'pt-BR', nome: 'Português', locale: 'pt-BR', dicionario: null },
  { codigo: 'en', nome: 'English', locale: 'en-US', dicionario: en },
];

const CHAVE_GUARDADA = 'enshrouded-save-editor:idioma';

function inicial() {
  try {
    const salvo = localStorage.getItem(CHAVE_GUARDADA);
    if (salvo && IDIOMAS.some((i) => i.codigo === salvo)) return salvo;
  } catch { /* navegador sem armazenamento: segue no padrão */ }
  // sem escolha salva, tenta o idioma do sistema e cai no português
  const sistema = (typeof navigator !== 'undefined' && navigator.language) || '';
  if (sistema.toLowerCase().startsWith('pt')) return 'pt-BR';
  return IDIOMAS.find((i) => sistema.toLowerCase().startsWith(i.codigo.toLowerCase()))?.codigo ?? 'pt-BR';
}

let atual = inicial();
const ouvintes = new Set();

export const idiomaAtual = () => atual;
export const localeAtual = () => IDIOMAS.find((i) => i.codigo === atual)?.locale ?? 'pt-BR';

// Nome de item e de habilidade não é traduzido aqui: o jogo já traz os dois, e `data/items.json`
// guarda `pt` e `en` por item. Isto diz de qual campo ler. Um idioma que não seja português cai no
// inglês, porque é a outra localização que temos — o README avisa.
export const campoDeNome = () => (atual === 'pt-BR' ? 'pt' : 'en');

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

/**
 * Traduz um texto. `vars` substitui os marcadores: t('nível {n}', { n: 5 }).
 * Sem tradução para a chave, devolve o próprio texto em português.
 */
export function t(texto, vars) {
  const dic = IDIOMAS.find((i) => i.codigo === atual)?.dicionario;
  let s = (dic && dic[texto]) || texto;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** Data e hora no idioma escolhido. */
export const dataHora = (ms) => new Date(ms).toLocaleString(localeAtual());
export const hora = (ms) => new Date(ms).toLocaleTimeString(localeAtual());
