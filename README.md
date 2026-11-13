# WAY House Church · Equipe de Fotografia

Next.js 14 + TypeScript + Tailwind + Supabase.

## 1. Supabase (grátis)
1. Crie um projeto em supabase.com.
2. **SQL Editor** → cole e rode `supabase/schema.sql`.
3. **Authentication → Providers → Email**: desative “Allow new users to sign up” (cadastro público desligado).
4. **Authentication → Users → Add user**: crie o e-mail/senha do administrador (marque “Auto confirm”).
5. **Project Settings → API**: copie a *Project URL* e a chave **anon public**. NUNCA use a `service_role` no site.

## 2. Rodar
```
cp .env.example .env.local   # preencha URL e anon key
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes do algoritmo (Node 22+)
```

## 3. Publicar
Suba no GitHub e importe na Vercel; cadastre as duas variáveis de ambiente.

## Uso
- `/` início · `/disponibilidade` formulário · `/escala` consulta (link para compartilhar) · `/admin` painel.
- Admin: crie o mês → membros respondem → gere a escala → ajuste → PDF / WhatsApp.

## Segurança
RLS ativo. Público só lê `months` e `schedule` e envia disponibilidade via função validada no servidor
(só enquanto o mês está aberto). `availabilities` só o admin acessa.
