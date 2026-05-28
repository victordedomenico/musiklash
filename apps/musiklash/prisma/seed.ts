import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const accounts = [
  { email: 'admin@bracketfight.local', password: 'password123', role: 'admin' },
  { email: 'mod@bracketfight.local', password: 'password123', role: 'moderator' },
  { email: 'user@bracketfight.local', password: 'password123', role: 'user' },
];

async function seed() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Run db:reset or pass it explicitly.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Seeding users via Supabase API (GoTrue)...');

  for (const acc of accounts) {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Error creating ${acc.email} in Auth:`, error.message);
      continue;
    }

    if (user && user.user) {
      console.log(`Auth user created: ${acc.email} (${user.user.id})`);
      
      try {
        await prisma.profile.update({
          where: { id: user.user.id },
          data: { role: acc.role as import("@prisma/client").AppRole },
        });
        console.log(`Role updated to ${acc.role} for ${acc.email}`);
      } catch (err) {
        console.error(`Error updating role for ${acc.email} with Prisma:`, err);
      }
    }
  }

  console.log('Seeding brackets via Prisma...');
  const adminProfile = await prisma.profile.findFirst({ where: { role: 'admin' } });
  const modProfile = await prisma.profile.findFirst({ where: { role: 'moderator' } });
  const userProfile = await prisma.profile.findFirst({ where: { role: 'user' } });

  const bracketsToInsert = [];
  if (adminProfile) bracketsToInsert.push({ ownerId: adminProfile.id, title: 'Admin Bracket', theme: 'Admin Theme', size: 8, visibility: 'public' });
  if (modProfile) bracketsToInsert.push({ ownerId: modProfile.id, title: 'Moderator Contest', theme: 'Mods Theme', size: 16, visibility: 'public' });
  if (userProfile) bracketsToInsert.push({ ownerId: userProfile.id, title: 'User Private Play', theme: 'Secret Theme', size: 4, visibility: 'private' });

  if (bracketsToInsert.length > 0) {
    try {
      await prisma.bracket.createMany({ data: bracketsToInsert });
      console.log('Brackets seeded.');
    } catch (err) {
      console.error('Error inserting brackets:', err);
    }
  }

  console.log('Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
