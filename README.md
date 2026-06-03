# greanlean DPP v0

技术栈：Next.js / React / Tailwind CSS / Headless UI / Supabase / Vercel。

## 页面

- `/` 官网
- `/login` 登录
- `/dashboard` 后台
- `/dashboard/products` 产品管理
- `/dashboard/suppliers` 供应商
- `/dashboard/materials` 材料
- `/dashboard/esg` ESG
- `/dashboard/certificates` 证书
- `/p/demo-organic-cotton-tshirt` 公开 DPP 示例页

## 1. 初始化 Supabase

Supabase → SQL Editor → 复制 `supabase/schema.sql` 全部内容 → Run。

## 2. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. 创建登录用户

Supabase → Authentication → Users → Add user。

## 4. 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
http://localhost:3000/dashboard
```

## 5. Vercel 部署

添加环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://greanlean.com
```
