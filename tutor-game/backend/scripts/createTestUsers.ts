import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Create test teacher
    const hashedTeacherPassword = await bcrypt.hash('testteacher123', 10);
    const teacher = await prisma.user.upsert({
      where: { email: 'testteacher@example.com' },
      update: {},
      create: {
        email: 'testteacher@example.com',
        password: hashedTeacherPassword,
        role: Role.TEACHER,
        teacher: {
          create: {}
        }
      },
      include: { teacher: true }
    });

    // Create test student
    const hashedStudentPassword = await bcrypt.hash('teststudent123', 10);
    const student = await prisma.user.upsert({
      where: { email: 'teststudent@example.com' },
      update: {},
      create: {
        email: 'teststudent@example.com',
        password: hashedStudentPassword,
        role: Role.STUDENT,
        student: {
          create: {
            teacherId: teacher.teacher?.userId || ''
          }
        }
      },
      include: { student: true }
    });

    console.log('Test users created successfully:');
    console.log(`Teacher: ${teacher.email} (ID: ${teacher.id})`);
    console.log(`Student: ${student.email} (ID: ${student.id})`);
    console.log('\nYou can now log in with these credentials:');
    console.log('Teacher: testteacher@example.com / testteacher123');
    console.log('Student: teststudent@example.com / teststudent123');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
