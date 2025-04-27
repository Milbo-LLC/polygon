# Polygon

Polygon is an open-source 3D modeling tool for the AI future. Built off of [T3 Stack](https://create.t3.gg/) and using the following tech:

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Quickstart

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Login to Doppler

   We use Doppler for sharing env variables, so login first:

   ```bash
   doppler login
   ```

3. Start the database:

   ```bash
   ./start-database.sh
   ```

4. Run migration script on database

   ```bash
   pnpm db:generate
   ```


5. Run the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Contributing

## FIXME - TODO

## Troubleshooting

## FIXME - TODO
