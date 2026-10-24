# Enshrouded Save Editor

Lê e edita saves de personagem do Enshrouded, com a interface desenhada a partir das telas do próprio
jogo. Funciona nos **saves locais** e — se o servidor rodar o companheiro
[Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian) — nas **cópias de personagem guardadas
num servidor dedicado**.

*Read this in [English](README.md).*

> **Sem suporte.** Isto é publicado para a comunidade usar, ler e melhorar. Não há atendimento, nem
> correção garantida, nem planejamento de versões. Pegue, modifique, publique — a licença permite.
> Issues e pull requests podem ficar sem resposta.

## Funcionalidades

**Personagem**

- Nível e xp
- A árvore de habilidades — a de verdade, desenhada com o traçado e as posições do próprio jogo
- Ele se recusa a gravar uma árvore que o jogo rejeitaria, porque árvore inválida faz o jogo
  reembolsar todos os pontos na carga

**Mochila**

- Os 40 espaços principais, a barra ALT e a barra de ação, cada um no seu lugar
- O contêiner da mochila vestida, com o tamanho da mochila que você realmente tem equipada
- Acrescentar a partir de um catálogo com todos os itens do jogo, remover, arrastar para mover,
  duplicar
- Filtros por categoria, raridade e tier; busca por nome em português ou inglês

**Equipamento vestido**

- O boneco com os 16 espaços: armadura, aparência, anéis, protetor, gancho, planador, mochila
- Tirar uma peça vestida
- Ele impede tirar uma mochila vestida que ainda tem coisa dentro, porque isso apagaria o contêiner
  dela e tudo o que estava guardado

**Qualquer item em detalhe**

- Nível, quantidade, durabilidade, melhorias, raridade
- **A joia encaixada numa arma:** trocar, tirar, ou mudar o nível dela
- Item novo nasce com os campos extras que aquele tipo de item realmente guarda, medidos em saves
  reais — criar um com os campos errados produz um item quebrado no jogo

**Conhecimento**

- Descobertas e receitas, com busca por nome ou id e filtro por nível
- Mostra o que cada entrada é (item, receita, outro) e o estado dela

**Servidor dedicado** (precisa do [Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian))

- As cópias de personagem guardadas aparecem na mesma lista dos saves locais
- Edite uma cópia, expulse o jogador, e ele volta com a sua versão
- Lê o registro do guardião e explica, em palavras, por que um save foi recusado
- Atualização ao vivo enquanto um jogador está conectado, e se recusa a sobrescrever a sua edição
  pendente

**Geral**

- **Português e inglês**, com troca na barra de baixo e a escolha lembrada entre sessões.
  Acrescentar um idioma é um arquivo JSON — veja [Traduzindo](#traduzindo)
- Backup antes de cada gravação, restaurável de dentro do aplicativo
- Saves locais e cópias do servidor numa lista só

## Funciona com ou sem servidor

**Sem o guardião**, ele abre os `.ksd` que o seu jogo grava localmente. Faz backup antes de cada
gravação, e dá para restaurar de dentro do aplicativo.

**Com o guardião**, as cópias guardadas no servidor aparecem na mesma lista dos saves locais. O
caminho é:

1. Edite a cópia de um jogador e salve
2. Expulse o jogador (ou peça para ele relogar)
3. Na entrada seguinte o guardião impõe a cópia guardada — então ele volta com a sua versão

O editor também lê a pasta `recusados/` do guardião e explica, em palavras, o que um save recusado
trazia: diferença de nível e xp, itens que o cliente tinha a mais ou a menos, itens que só trocaram
de lugar entre contêineres, e descobertas que divergem. Quando o guardião não guardou a cópia de
referência daquele momento, ele diz isso em vez de produzir comparação enganosa.

O acesso ao servidor é por **SFTP**, configurado dentro do aplicativo (endereço, usuário, senha e a
pasta onde o guardião escreve). A chave do servidor é fixada na primeira conexão, então uma chave
diferente depois derruba a conexão em vez de ser aceita em silêncio.

## Instalação

Baixe o `enshrouded-save-editor.exe` na página de [Releases](../../releases) e rode. Não precisa
instalar nada: os recursos da interface vão dentro do executável.

Todo release é **compilado pelo GitHub Actions a partir deste repositório** e o log do build é
público — veja [`.github/workflows/build.yml`](.github/workflows/build.yml).

## Configurando com o guardião

Para editar as cópias de personagem de um servidor dedicado, o servidor precisa do
[Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian) rodando, e o editor precisa de acesso
SFTP à pasta do servidor. Nada é instalado na máquina dos jogadores — só no servidor.

### 1. No servidor

Instale o guardião: pare o servidor, ponha o `dbghelp.dll` dele ao lado do `enshrouded_server.exe`,
suba o servidor. **Peça para cada jogador entrar uma vez.** O guardião só tem a cópia de alguém
depois de ver o save daquele jogador, e até lá não há nada para o editor mostrar.

Para confirmar que funcionou, procure a pasta `guardiao-dados/` na pasta do servidor. Ela deve ter
uma subpasta por jogador, nomeada com a Steam ID dele.

### 2. Pegue os dados de SFTP

No painel do seu host. Em host gerenciado costumam estar em *File Manager → SFTP Details*, ou algo
parecido. Você precisa do endereço, da porta, do usuário e da senha. A porta **não** é 22 na maioria
dos hosts de jogo — na Nodecraft, por exemplo, é 2022.

Se você hospeda o servidor em casa, é o SSH/SFTP que você já tem naquela máquina.

### 3. No editor

Abra a aba **Servidor** e clique em **Configurar servidor**, depois preencha:

| campo | o que vai nele |
|---|---|
| **Endereço** | o endereço do servidor, sem `sftp://` |
| **Porta (SFTP)** | a do painel; 2022 em muitos hosts de jogo |
| **Usuário** | o usuário do SFTP, que muitas vezes não é o login do painel |
| **Senha** | a senha do SFTP. Fica guardada só na sua máquina |
| **Chave do servidor** | deixe vazio na primeira vez |
| **Pasta do guardião** | `guardiao-dados`, a não ser que você tenha mudado |

Clique em **Salvar** e depois em **Testar conexão**. Ele deve informar o modo do guardião —
`aplicar` significa que ele está impondo a cópia, `observar` que só está registrando.

Então clique em **Fixar chave vista** e **Salvar** de novo. Isso guarda a impressão digital da chave
SSH do servidor, para que uma chave diferente depois derrube a conexão em vez de ser aceita em
silêncio. Faça isso uma vez, depois de uma conexão que você sabe que funcionou.

### 4. Editando um jogador

Os jogadores passam a aparecer na aba **Servidor**, e na lista de saves com a etiqueta `servidor`.

1. Escolha um jogador e edite o que precisar
2. **Ctrl+S** para gravar a cópia
3. **Expulse o jogador**, ou peça para ele sair e entrar

Na entrada seguinte o guardião substitui o que o cliente mandar pela cópia que você editou. Até o
jogador relogar, nada muda para ele.

### O que saber antes de depender disso

- **Jogador conectado sobrescreve a cópia o tempo todo.** O servidor salva a cada ~30 segundos e o
  guardião guarda cada save. O editor avisa quando a cópia muda debaixo de você, e se recusa a
  descartar uma edição pendente. O momento confiável para editar é com o jogador fora.
- **Edição de conhecimento** (descobertas e receitas) vale do mesmo jeito: na entrada seguinte.
- **Backup** de cada gravação vai para `Documentos\Enshrouded-Backups\servidor\`, uma pasta por
  gravação.
- **A senha fica em texto puro** no arquivo de configuração do editor
  (`%APPDATA%\enshrouded-save-editor\servidor.json`), como na maioria dos programas de desktop. Se
  isso te incomoda, use uma conta de SFTP restrita àquele servidor em vez da sua principal.

## Compile você mesmo

Duas coisas: Node 20+ e Rust para o alvo `x86_64-pc-windows-msvc`.

```
npm ci
npm run dist
```

O resultado é `src-tauri/target/release/enshrouded-save-editor.exe`.

É isso, o build inteiro. Não há pipeline de recurso para rodar, nem Python, nem ferramenta extra: os
recursos da interface vêm commitados prontos em `build-assets/`, e o lado Rust embute essa pasta em
tempo de compilação.

Para desenvolver, `npm run dev` abre com recarga automática.

### Testes

```
npm test
```

Três conjuntos que rodam sozinhos: a codificação do soquete de joia, os campos extras que cada tipo
de item guarda, e uma ida e volta de interpretar e remontar. A ida e volta também roda contra saves
de verdade:

```
node tests/ida-e-volta.mjs <pasta com arquivos A.bin>
```

Ele exige que o bloco remontado seja **byte a byte idêntico** ao original, que é o que impede editar
um campo e reescrever outro sem perceber.

## Traduzindo

A interface vem em português e inglês. Acrescentar um idioma é um arquivo, e não exige entender o
resto do código.

A chave da tradução **é o texto em português**. Então uma chave que você não traduzir aparece em
português em vez de aparecer como `menu.botao.salvar`, e nada quebra enquanto a tradução está
incompleta.

1. Copie `src/i18n/en.json` para `src/i18n/<código>.json` — `es.json`, `de.json`, `fr.json`…
2. Traduza os **valores**, deixando as chaves em português intactas
3. Mantenha os `{marcadores}` exatamente como estão: eles são substituídos por números e nomes, e o
   aplicativo os procura pelo nome, então você pode mudá-los de lugar na frase
4. Registre em `IDIOMAS`, no começo de [`src/i18n.js`](src/i18n.js):

```js
import es from './i18n/es.json';

export const IDIOMAS = [
  { codigo: 'pt-BR', nome: 'Português', locale: 'pt-BR', dicionario: null },
  { codigo: 'en', nome: 'English', locale: 'en-US', dicionario: en },
  { codigo: 'es', nome: 'Español', locale: 'es-ES', dicionario: es },
];
```

O `nome` é o que aparece no seletor de idioma — escreva no próprio idioma. O `locale` é o que
formata data e ordena nome.

Nome de item e de habilidade não faz parte disso: vem da localização do próprio jogo, guardada em
`data/items.json`, que traz português e inglês. Um terceiro idioma mostraria a interface traduzida
com o nome dos itens ainda num desses dois, porque precisaria da localização do jogo naquele idioma —
e regerar o `data/` está fora deste repositório.

Se você mudar um texto em português no código, a chave muda junto. Atualize a chave em todos os
`src/i18n/*.json`, ou aquele texto cai no português sem avisar.

## Notas do formato do save

O formato não é documentado em lugar nenhum; tudo aqui saiu de medição. As partes que custaram mais:

- **A lista de equipamento é densa e indexada por máscara de bits.** A peça `k` ocupa o k-ésimo bit
  aceso numa máscara de 32 bits, seguida de um u16 de espaços livres. Ignorando a máscara, faltando
  um anel, tudo depois dele aparece uma casa antes no boneco.
- **A flag `0x08` é aparência (4 bytes).** Não conhecê-la deixava a lista de equipamento ilegível, e
  o parser então "achava" o equipamento no meio da mochila e gravava um save quebrado.
- **O nível de um item já inclui as melhorias.** Um anel de faixa 30–30 aparece em 30 sem melhoria,
  34 com quatro, 35 com cinco. Mudar melhoria sem mudar nível faz o jogo descartar a edição.
- **A joia encaixada numa arma são 5 bytes:** o itemId da joia (u32) seguido do nível dela (u8).
- **A mochila vestida define o tamanho do contêiner extra**, e ela tem de ser achada pelo tipo do
  item, não pelo índice na lista densa — esse índice muda conforme a máscara.
- **Conhecimento** é um cabeçalho de 8 bytes (`containerState`, `n`), depois `n` ids e `n` valores.
  Receita não fica gravada como "liberada": o jogo a recalcula a partir das descobertas, então tirar
  o material volta a travá-la.

## Dados do jogo

Duas pastas, as duas commitadas, para que um clone compile sem precisar instalar mais nada:

| pasta | o que é |
|---|---|
| `data/*.json` | a tabela de itens, a árvore de habilidades, o mapa de conhecimento, e que campos extras cada tipo de item guarda — cerca de 2 MB, importados pelo código |
| `build-assets/game/` | os ícones, as texturas de interface e as fontes com que o aplicativo desenha, já reduzidos ao que é de fato referenciado — cerca de 26 MB, embutidos no executável |

Isso foi preparado a partir de uma cópia instalada do jogo. **Regerar não faz parte deste
repositório**: os scripts de extração ficam fora dele, então depois de uma atualização do jogo que
mude id ou nome de item, os dados aqui ficam velhos até alguém regerar e commitar. Se você precisar
disso e não tiver acontecido, abra uma issue — mas veja o aviso de "sem suporte" no começo.

Nome de item vem da localização do próprio jogo e é guardado com português e inglês lado a lado, que
é por isso que a busca do catálogo aceita os dois.

## Créditos e terceiros

Para ler os recursos do jogo usamos o
[kfc-parser / Enshrouded Mod Loader](https://github.com/Brabb3l/kfc-parser), do brabb3l.

## Licença

MIT — veja [LICENSE](LICENSE). Sem qualquer vínculo com a Keen Games.
