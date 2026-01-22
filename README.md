# TremDummy

Extensão para Chrome (Manifest V3) que gera dados fake e preenche automaticamente formulários na aba ativa.

A ideia é acelerar testes de UI, validações de formulário e fluxos de cadastro/checkout sem precisar digitar dados manualmente.

## Principais recursos

- Geração de usuário aleatório via API `randomuser.me` (nacionalidade: BR)
- Preenchimento automático de formulários na aba ativa
- Geradores locais para:
  - CPF válido (formato `000.000.000-00`)
  - Número de cartão válido (Luhn / prefixo Visa)
  - Data de nascimento (entre 18 e 50 anos)
- Heurística de preenchimento baseada em:
  - `autocomplete`
  - `name`, `id`, `placeholder` e `class`
- Disparo de eventos (`input`, `change`, `blur`) ao preencher (apenas quando o valor muda)

## Como instalar (modo desenvolvedor)

1. Abra o Chrome e acesse:

   `chrome://extensions/`

2. Ative **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto:

   `extension-chrome-web-monkey/`

5. Fixe a extensão na barra do navegador (opcional) para acesso rápido.

## Como usar

1. Abra qualquer página com um formulário (cadastro, checkout, etc.).
2. Clique no ícone da extensão.
3. No popup, clique em **GERAR E PREENCHER**.
4. A extensão vai:
   - Buscar um usuário BR na API
   - Gerar CPF, cartão e data de nascimento localmente
   - Injetar um script na aba ativa para preencher os campos

## Quais campos ela tenta preencher

O preenchimento é heurístico, então depende de como o site nomeia os campos. A extensão procura por sinais comuns.

- Nome:
  - `nome`, `name`, `customer`
- Email:
  - `email` ou `autocomplete=email`
- Telefone:
  - `tel`, `phone` ou `autocomplete=tel`
- CEP:
  - `cep`, `zip` ou `autocomplete=postal-code`
- Cidade:
  - `cidade`, `city`
- Endereço:
  - `address`, `street`, `logradouro`, `rua`
- CPF:
  - `cpf`
- Data de nascimento:
  - `birth`, `nasc` (se for `<input type="date">` usa `YYYY-MM-DD`, senão usa `DD/MM/YYYY`)
- Cartão:
  - `autocomplete=cc-number`, ou chaves como `card`, `cartao`, `credit`, `card_number`...
- CVV:
  - `autocomplete=cc-csc`, ou `cvv`, `security`
- Validade:
  - `autocomplete=cc-exp`, ou `exp`, `valida`
- Senha:
  - `type=password`, `autocomplete=password`, `pass`, `senha`

## Dados gerados

- Usuário:
  - Fonte: `https://randomuser.me/api/?nat=br`
  - Campos usados: nome, email, celular, endereço
- CPF:
  - Gerado localmente com dígitos verificadores válidos
- Cartão:
  - Gerado localmente com Luhn (começa com `4`, padrão Visa)
- Data de nascimento:
  - Gerada localmente para idade entre 18 e 50 anos
- Senha:
  - Valor fixo no código: `Dev@Pass2026!`

## Permissões (manifest.json)

```json
{
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["https://randomuser.me/"]
}
```

- `activeTab`:
  - Permite acessar a aba ativa quando você interage com a extensão.
- `scripting`:
  - Permite injetar o script de preenchimento na página aberta.
- `host_permissions` para `randomuser.me`:
  - Permite que o popup faça `fetch` para buscar os dados do usuário.

## Arquitetura (visão rápida)

- `popup.html`:
  - Interface do popup da extensão.
- `popup.js`:
  - Handler do botão
  - Fetch do usuário
  - Geração de CPF / cartão / data de nascimento
  - Injeção da função `fillForm` via `chrome.scripting.executeScript`
- `manifest.json`:
  - Configuração da extensão (Manifest V3)

## Limitações conhecidas

- O preenchimento depende das heurísticas (`name/id/placeholder/class/autocomplete`).
  - Sites com campos muito customizados podem não ser preenchidos corretamente.
- Campos controlados por frameworks (React/Vue/Angular) podem exigir eventos específicos.
  - Atualmente dispara `input`, `change` e `blur`.
- Alguns sites bloqueiam autofill por políticas internas (ou mascaram inputs de cartão).
- A extensão não tenta resolver CAPTCHAs.

## Troubleshooting

- Extensão não preenche nada:
  - Verifique se a página é uma aba normal (não preenche em `chrome://*`).
  - Abra o DevTools da página e veja se há erros no console.
  - Confirme se você clicou no botão (a permissão `activeTab` depende de gesto do usuário).

- Erro ao buscar usuário:
  - Pode ser rate limit/instabilidade da API `randomuser.me`.
  - A extensão valida `response.ok` e usa timeout.

## Desenvolvimento

Sugestão de fluxo:

- Faça alterações no código.
- Em `chrome://extensions/` clique em **Atualizar** na extensão.
- Reabra o popup e teste.

## Aviso

Esta extensão é voltada para **testes e desenvolvimento**. Evite usar em produção ou com dados reais.
