import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function lowercaseEmails() {
  console.log('Starting to lowercase all user emails...');
  
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  
  const emailMap = new Map<string, string[]>();

  for (const user of users) {
      if (!user.email) continue;
      const lowerEmail = user.email.toLowerCase();
      if (!emailMap.has(lowerEmail)) {
            emailMap.set(lowerEmail, []);
      }
      emailMap.get(lowerEmail)!.push(user.id);
  }

  const duplicates = Array.from(emailMap.entries()).filter(([_, ids]) => ids.length > 1);

  if (duplicates.length > 0) {
      console.error('❌ ABORTING: Found emails that would become duplicates when lowercased.');
      console.error('Please resolve these manually before running the script again:');
      for (const [email, ids] of duplicates) {
          console.error(`- Email "${email}" is used by user IDs: ${ids.join(', ')}`);
          const conflictingUsers = await prisma.user.findMany({where: {id: { in: ids }}, select: {id: true, email: true}});
          conflictingUsers.forEach(u => console.log(`  - User ID: ${u.id}, Original Email: ${u.email}`));
      }
      process.exit(1);
      return;
  }
  
  console.log('✅ No potential duplicate emails found. Proceeding with update.');

  const transaction = users
    .filter(user => user.email && user.email !== user.email.toLowerCase()) // Only update if needed and email exists
    .map(user => {
        console.log(`- Updating email for user ${user.id}: ${user.email} -> ${user.email.toLowerCase()}`);
        return prisma.user.update({
            where: { id: user.id },
            data: { email: user.email.toLowerCase() },
        });
    });

  if (transaction.length === 0) {
      console.log('✅ All emails are already in lowercase. No action needed.');
      return;
  }

  try {
    const result = await prisma.$transaction(transaction);
    console.log(`✅ Successfully updated emails for ${result.length} users.`);
  } catch (e) {
    console.error('An error occurred during the update transaction:', e);
    throw e;
  }
}

lowercaseEmails()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Script finished.');
  });
