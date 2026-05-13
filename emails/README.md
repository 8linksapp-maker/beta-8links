# Emails 8links

Templates de email customizados para autenticação do Supabase com o design system da 8links.

## Templates disponíveis

| Template | Arquivo | Variáveis disponíveis |
|----------|---------|----------------------|
| Confirmar signup | `confirm-signup.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`, `{{ .RedirectTo }}` |
| Invite user | `invite-user.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`, `{{ .RedirectTo }}` |
| Magic link | `magic-link.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`, `{{ .RedirectTo }}` |
| Confirmar mudança de email | `confirm-email-change.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`, `{{ .RedirectTo }}` |
| Resetar senha | `reset-password.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`, `{{ .RedirectTo }}` |
| Confirmar reautenticação | `confirm-reauth.html` | `{{ .Token }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` |

## Como configurar no Supabase

### Passo 1: Acessar Email Templates

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Email Templates**

### Passo 2: Configurar cada template

Para cada tipo de email abaixo, copie o conteúdo do arquivo HTML correspondente e cole no editor do Supabase:

#### 1. Confirm Signup
- No Supabase: **Authentication** → **Email Templates** → **Confirm Signup**
- Copie o conteúdo de `confirm-signup.html`
- Cole no editor do Supabase
- Salve

#### 2. Invite User
- No Supabase: **Authentication** → **Email Templates** → **Invite User**
- Copie o conteúdo de `invite-user.html`
- Cole no editor do Supabase
- Salve

#### 3. Magic Link
- No Supabase: **Authentication** → **Email Templates** → **Magic Link**
- Copie o conteúdo de `magic-link.html`
- Cole no editor do Supabase
- Salve

#### 4. Change Email Address
- No Supabase: **Authentication** → **Email Templates** → **Change Email Address**
- Copie o conteúdo de `confirm-email-change.html`
- Cole no editor do Supabase
- Salve

#### 5. Reset Password
- No Supabase: **Authentication** → **Email Templates** → **Reset Password**
- Copie o conteúdo de `reset-password.html`
- Cole no editor do Supabase
- Salve

#### 6. Confirm Reauthentication
- No Supabase: **Authentication** → **Email Templates** → **Confirm Reauthentication**
- Copie o conteúdo de `confirm-reauth.html`
- Cole no editor do Supabase
- Salve

### Passo 3: Configurar URLs

1. Vá em **Authentication** → **URL Configuration**
2. Configure:
   - **Site URL**: `https://app.8links.com.br`
   - **Redirect URLs**: 
     - `https://app.8links.com.br/**`
     - `https://app.8links.com.br/auth/confirm`
3. Salve

**Importante:** A página `/auth/confirm` é onde o usuário é levado após clicar no link do email para criar a senha.

### Passo 4: Configurar SMTP (opcional)

Por padrão, o Supabase usa o SMTP próprio. Se quiser usar um SMTP customizado:

1. Vá em **Project Settings** → **Auth** → **SMTP Settings**
2. Configure seu provedor (Resend, SendGrid, Postmark, etc.)

## Testando os emails

### Testar Invite User (usado no webhook Kiwify)

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em **Add user** → **Invite user**
3. Digite um email de teste
4. Clique em **Invite user**
5. Verifique o email recebido

### Testar Magic Link

1. Vá para `https://app.8links.com.br/login`
2. Clique em "Esqueceu a senha?" ou use magic link
3. Verifique o email recebido

## Design System

Os emails seguem o design system da 8links:

- **Background**: `#0a0a0a` (dark)
- **Surface**: `#111111` (cards)
- **Primary**: `#ff6b00` (laranja)
- **Gradient**: `linear-gradient(135deg, #ff6b00 0%, #ff8800 100%)`
- **Texto principal**: `#ffffff`
- **Texto secundário**: `#a0a0a0`
- **Bordas**: `#333`
- **Border radius**: 8px (botões), 12px (cards)

## Notas importantes

1. **Variáveis do Supabase**: Todas as variáveis como `{{ .ConfirmationURL }}` são processadas pelo Supabase automaticamente.

2. **Emails transacionais**: Os emails são enviados automaticamente pelo Supabase quando os eventos de auth acontecem.

3. **Mobile-friendly**: Todos os templates são responsivos e funcionam bem em mobile.

4. **Dark mode**: Os emails já nascem em dark mode, consistente com a plataforma.

5. **After deploy**: Após configurar os templates no Supabase, os novos emails já usarão os templates customizados automaticamente.
