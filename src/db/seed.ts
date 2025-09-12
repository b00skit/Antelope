import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function seed() {
  console.log('Seeding database...');
  try {
    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin'),
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash('password', 10);
    
    await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      role: 'superadmin',
    });

    console.log('Database seeded successfully with admin user.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
